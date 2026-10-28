-- BD-AC v2.2 §3.1 — read-only contract-level revenue ranking (the only new view of this pass).
-- One row = contract x billing period x lens (ALL / ORM / MARCOM). RECURRING invoices only, excluding draft / void.
-- Invoice -> contract link = the contract_id the billing engine stamps on every generated invoice line (never hotel name).
-- Lines without contract_id, invoices without hotel_id and lines whose service cannot be read are skipped.
-- prev_rank / avg_rank are per contract here; the dashboard re-applies them across renewal chains.
CREATE OR REPLACE VIEW public.v_bdac_contract_revenue_ranking WITH (security_invoker = true) AS
WITH inv AS (
  SELECT i.value AS i
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) i(value)
  WHERE d.namespace = 'crm:invoices'
    AND i.value->>'invoice_type' = 'RECURRING'
    AND coalesce(i.value->>'status', '') NOT IN ('draft', 'void')
    AND coalesce(i.value->>'billing_period_start', '') ~ '^\d{4}-\d{2}'
    AND nullif(i.value->>'hotel_id', '') IS NOT NULL
),
prod AS (
  SELECT p.value->>'sku' AS sku,
         CASE p.value->>'service_line' WHEN 'ORM' THEN 'ORM' WHEN 'MARCOM' THEN 'MARCOM' END AS service
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) p(value)
  WHERE d.namespace = 'crm:products'
),
ln AS (
  SELECT inv.i, l.value AS l,
         CASE WHEN coalesce(inv.i#>>'{totals,subtotal}', '') ~ '^-?\d+(\.\d+)?$' AND (inv.i#>>'{totals,subtotal}')::numeric > 0
                   AND coalesce(inv.i#>>'{totals,total}', '') ~ '^-?\d+(\.\d+)?$'
              THEN (inv.i#>>'{totals,total}')::numeric / (inv.i#>>'{totals,subtotal}')::numeric ELSE 1 END AS net_factor
  FROM inv
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(inv.i->'lines', '[]'::jsonb)) l(value)
  WHERE l.value->>'line_type' IN ('fixed', 'commission')
    AND coalesce(l.value->>'contract_id', '') <> ''
    AND coalesce(l.value->>'amount', '') ~ '^-?\d+(\.\d+)?$'
),
svc AS (
  SELECT ln.*,
         coalesce(
           (SELECT prod.service FROM prod WHERE prod.sku = ln.l->>'sku_snapshot' AND prod.service IS NOT NULL LIMIT 1),
           CASE WHEN ln.l->>'sku_snapshot' LIKE 'ORM-%' THEN 'ORM' WHEN ln.l->>'sku_snapshot' LIKE 'MARCOM-%' THEN 'MARCOM' END,
           CASE ln.i->>'service_line' WHEN 'ORM' THEN 'ORM' WHEN 'Marcom' THEN 'MARCOM' END
         ) AS service
  FROM ln
),
bills AS (
  SELECT s.l->>'contract_id' AS contract_id, s.service,
         date_trunc('month', left(s.i->>'billing_period_start', 10)::date)::date AS month,
         max(s.i->>'hotel_id') AS hotel_id,
         max(s.i#>>'{customer_snapshot,hotel_name}') AS hotel_name,
         round(sum((s.l->>'amount')::numeric * s.net_factor), 2) AS amount_thb,
         array_agg(DISTINCT s.i->>'invoice_id') AS invoices
  FROM svc s
  WHERE s.service IS NOT NULL
  GROUP BY 1, 2, 3
),
ctr AS (
  SELECT c.value->>'contract_id' AS contract_id,
         coalesce(nullif(c.value->>'billing_status', ''), 'ACTIVE') AS billing_status,
         CASE WHEN coalesce(c.value->>'inactivated_at', '') ~ '^\d{4}-\d{2}-\d{2}' THEN left(c.value->>'inactivated_at', 10)::date END AS inactivated_at
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) c(value)
  WHERE d.namespace = 'crm:contracts'
),
months AS (SELECT DISTINCT month FROM bills),
pairs AS (
  SELECT contract_id, service, min(month) AS first_month, max(hotel_id) AS hotel_id, max(hotel_name) AS hotel_name
  FROM bills GROUP BY 1, 2
),
unbilled AS (
  SELECT m.month, p.contract_id, p.service, p.hotel_id, p.hotel_name
  FROM pairs p
  JOIN months m ON m.month >= p.first_month
  JOIN ctr c ON c.contract_id = p.contract_id
  WHERE c.billing_status = 'ACTIVE'
    AND (c.inactivated_at IS NULL OR c.inactivated_at > (m.month + interval '1 month' - interval '1 day')::date)
    AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.contract_id = p.contract_id AND b.service = p.service AND b.month = m.month)
),
all_rows AS (
  SELECT b.month, b.contract_id, max(b.hotel_id) AS hotel_id, max(b.hotel_name) AS hotel_name,
         array_agg(DISTINCT b.service ORDER BY b.service) AS service_lines,
         sum(b.amount_thb) AS amount_thb,
         coalesce(sum(b.amount_thb) FILTER (WHERE b.service = 'ORM'), 0) AS orm_thb,
         coalesce(sum(b.amount_thb) FILTER (WHERE b.service = 'MARCOM'), 0) AS marcom_thb
  FROM bills b
  GROUP BY 1, 2
),
all_inv AS (
  SELECT b.month, b.contract_id, count(DISTINCT x) AS invoice_count
  FROM bills b CROSS JOIN LATERAL unnest(b.invoices) x
  GROUP BY 1, 2
),
rows0 AS (
  SELECT a.month, a.contract_id, a.hotel_id, a.hotel_name, a.service_lines, 'ALL'::text AS lens,
         a.amount_thb, a.orm_thb, a.marcom_thb, ai.invoice_count, true AS has_bill
  FROM all_rows a JOIN all_inv ai ON ai.month = a.month AND ai.contract_id = a.contract_id
  UNION ALL
  SELECT b.month, b.contract_id, b.hotel_id, b.hotel_name, ARRAY[b.service], b.service, b.amount_thb,
         CASE WHEN b.service = 'ORM' THEN b.amount_thb ELSE 0 END, CASE WHEN b.service = 'MARCOM' THEN b.amount_thb ELSE 0 END,
         cardinality(b.invoices)::bigint, true
  FROM bills b
  UNION ALL
  SELECT u.month, u.contract_id, max(u.hotel_id), max(u.hotel_name), array_agg(DISTINCT u.service ORDER BY u.service), 'ALL', 0, 0, 0, 0::bigint, false
  FROM unbilled u
  WHERE NOT EXISTS (SELECT 1 FROM bills b WHERE b.contract_id = u.contract_id AND b.month = u.month)
  GROUP BY 1, 2
  UNION ALL
  SELECT u.month, u.contract_id, u.hotel_id, u.hotel_name, ARRAY[u.service], u.service, 0, 0, 0, 0::bigint, false
  FROM unbilled u
),
ranked AS (
  SELECT r.*,
         CASE WHEN r.has_bill THEN row_number() OVER (PARTITION BY r.month, r.lens, r.has_bill ORDER BY r.amount_thb DESC, r.hotel_name ASC NULLS LAST, r.contract_id ASC) END AS rank
  FROM rows0 r
),
hist AS (
  SELECT r.month, r.contract_id, r.lens,
         CASE WHEN count(*) OVER w >= 2 THEN round(avg(r.rank) OVER w, 1) END AS avg_rank
  FROM ranked r
  WHERE r.rank IS NOT NULL
  WINDOW w AS (PARTITION BY r.contract_id, r.lens ORDER BY r.month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)
),
ae AS (
  SELECT p.value->>'hotel_id' AS hotel_ref,
         CASE WHEN count(DISTINCT nullif(p.value->>'assigned_ae_id', '')) = 1 THEN min(nullif(p.value->>'assigned_ae_id', '')) END AS ae_owner_id
  FROM public.crm_documents w
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.payload->'properties', '[]'::jsonb)) p(value)
  WHERE w.namespace = 'ws2'
  GROUP BY 1
),
svc_owner AS (
  SELECT p.value->>'property_id' AS hotel_ref,
         CASE WHEN count(DISTINCT nullif(p.value->>'orm_team', '')) FILTER (WHERE p.value->>'service' = 'ORM') = 1
              THEN min(nullif(p.value->>'orm_team', '')) FILTER (WHERE p.value->>'service' = 'ORM') END AS orm_owner_id,
         CASE WHEN count(DISTINCT nullif(p.value->>'marcom_member_id', '')) FILTER (WHERE p.value->>'service' IN ('MARCOM_MT', 'MARCOM_GMB')) = 1
              THEN min(nullif(p.value->>'marcom_member_id', '')) FILTER (WHERE p.value->>'service' IN ('MARCOM_MT', 'MARCOM_GMB')) END AS marcom_owner_id
  FROM public.crm_documents w
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.payload#>'{ws2,profiles}', '[]'::jsonb)) p(value)
  WHERE w.namespace = 'hotels'
  GROUP BY 1
)
SELECT to_char(r.month, 'YYYY-MM') AS billing_period,
       r.contract_id, r.hotel_id, r.hotel_name, r.service_lines, r.lens,
       r.amount_thb, r.orm_thb, r.marcom_thb, r.invoice_count,
       r.rank, p.rank AS prev_rank, h.avg_rank, r.has_bill,
       ae.ae_owner_id, so.orm_owner_id, so.marcom_owner_id
FROM ranked r
LEFT JOIN ranked p ON p.contract_id = r.contract_id AND p.lens = r.lens AND p.has_bill
                  AND p.month = (r.month - interval '1 month')::date
LEFT JOIN hist h ON h.contract_id = r.contract_id AND h.lens = r.lens AND h.month = r.month AND r.has_bill
LEFT JOIN ae ON ae.hotel_ref = r.hotel_id
LEFT JOIN svc_owner so ON so.hotel_ref = r.hotel_id;
COMMENT ON VIEW public.v_bdac_contract_revenue_ranking IS 'BD-AC v2.2 read-only: contract x billing period x lens (ALL/ORM/MARCOM). RECURRING only, excl. draft/void, after VAT/WHT. Link = invoice line contract_id. rank ties: hotel_name, contract_id. prev_rank/avg_rank per contract; dashboard applies renewal chains.';
GRANT SELECT ON public.v_bdac_contract_revenue_ranking TO authenticated, service_role;