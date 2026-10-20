ALTER TABLE public.ticket ADD COLUMN IF NOT EXISTS contract_id text, ADD COLUMN IF NOT EXISTS meeting_id text;
COMMENT ON COLUMN public.ticket.contract_id IS 'R1.2: optional service contract the case is about (prefilled when the hotel has exactly one active contract for the service).';
COMMENT ON COLUMN public.ticket.meeting_id IS 'R1.2: optional monthly meeting the case came from.';

CREATE OR REPLACE VIEW public.v_ac_contract_cost_monthly WITH (security_invoker = true) AS
WITH inv AS (
  SELECT i.value AS i
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) i(value)
  WHERE d.namespace = 'crm:invoices'
    AND i.value->>'invoice_type' = 'RECURRING'
    AND coalesce(i.value->>'status', '') NOT IN ('draft', 'void', 'written_off')
    AND coalesce(i.value->>'billing_period_start', '') ~ '^\d{4}-\d{2}'
),
prod AS (
  SELECT p.value->>'sku' AS sku,
         CASE p.value->>'service_line' WHEN 'ORM' THEN 'ORM' WHEN 'MARCOM' THEN 'Marcom' END AS service
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
ln2 AS (
  SELECT ln.*,
         coalesce(
           (SELECT prod.service FROM prod WHERE prod.sku = ln.l->>'sku_snapshot' AND prod.service IS NOT NULL LIMIT 1),
           CASE WHEN ln.l->>'sku_snapshot' LIKE 'ORM-%' THEN 'ORM' WHEN ln.l->>'sku_snapshot' LIKE 'MARCOM-%' THEN 'Marcom' END,
           CASE WHEN ln.i->>'service_line' IN ('ORM', 'Marcom') THEN ln.i->>'service_line' END
         ) AS line_service
  FROM ln
),
svc AS (
  SELECT ln2.*, s.service, ln2.line_service IS NULL AS combined_bill
  FROM ln2
  CROSS JOIN LATERAL unnest(CASE WHEN ln2.line_service IS NOT NULL THEN ARRAY[ln2.line_service] ELSE ARRAY['ORM', 'Marcom'] END) s(service)
),
bills AS (
  SELECT svc.l->>'contract_id' AS contract_id, svc.service,
         date_trunc('month', left(svc.i->>'billing_period_start', 10)::date)::date AS month,
         max(svc.i->>'hotel_id') AS hotel_ref,
         max(svc.i#>>'{customer_snapshot,hotel_name}') AS hotel_name,
         max(svc.i#>>'{customer_snapshot,customer_id}') AS customer_id,
         max(svc.i#>>'{customer_snapshot,legal_name}') AS customer_name,
         round(sum(CASE WHEN svc.l->>'line_type' = 'fixed' THEN (svc.l->>'amount')::numeric * svc.net_factor ELSE 0 END), 2) AS fee_thb,
         round(sum(CASE WHEN svc.l->>'line_type' = 'commission' THEN (svc.l->>'amount')::numeric * svc.net_factor ELSE 0 END), 2) AS commission_thb,
         bool_or(coalesce(svc.l->>'guarantee_applied', '') = 'true') AS guarantee_applied,
         bool_or(svc.combined_bill) AS combined_bill
  FROM svc
  GROUP BY 1, 2, 3
),
ctr AS (
  SELECT c.value->>'contract_id' AS contract_id,
         CASE WHEN coalesce(c.value->>'start_date', '') ~ '^\d{4}-\d{2}-\d{2}' THEN left(c.value->>'start_date', 10)::date END AS start_date,
         coalesce(nullif(c.value->>'billing_status', ''), 'ACTIVE') AS billing_status,
         CASE WHEN coalesce(c.value->>'inactivated_at', '') ~ '^\d{4}-\d{2}-\d{2}' THEN left(c.value->>'inactivated_at', 10)::date END AS inactivated_at
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) c(value)
  WHERE d.namespace = 'crm:contracts'
),
pairs AS (
  SELECT contract_id, service, min(month) AS first_month, max(hotel_ref) AS hotel_ref, max(hotel_name) AS hotel_name,
         max(customer_id) AS customer_id, max(customer_name) AS customer_name
  FROM bills GROUP BY 1, 2
),
months AS (SELECT DISTINCT month FROM bills),
grid AS (
  SELECT p.*, m.month
  FROM pairs p
  JOIN months m ON m.month >= p.first_month
  LEFT JOIN ctr c ON c.contract_id = p.contract_id
  WHERE EXISTS (SELECT 1 FROM bills b WHERE b.contract_id = p.contract_id AND b.service = p.service AND b.month = m.month)
     OR (c.contract_id IS NOT NULL AND c.billing_status <> 'TERMINATED'
         AND (c.inactivated_at IS NULL OR m.month < date_trunc('month', c.inactivated_at)::date))
),
gr AS (
  SELECT g.value->>'customer_id' AS customer_id, left(g.value->>'billing_period', 7) AS period, g.value->>'grade' AS grade
  FROM public.crm_documents d
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items', '[]'::jsonb)) g(value)
  WHERE d.namespace = 'crm:gradeRecords' AND g.value->>'grade' IN ('A', 'B', 'C', 'D')
),
gl AS (SELECT DISTINCT ON (customer_id) customer_id, grade FROM gr ORDER BY customer_id, period DESC),
gw AS (
  SELECT customer_id, max(grade) AS grade
  FROM (SELECT gr.*, row_number() OVER (PARTITION BY customer_id ORDER BY period DESC) AS rn FROM gr) x
  WHERE rn <= 6 GROUP BY 1
),
ae AS (
  SELECT p.value->>'hotel_id' AS hotel_ref,
         CASE WHEN count(DISTINCT nullif(p.value->>'assigned_ae_id', '')) = 1 THEN min(nullif(p.value->>'assigned_ae_id', '')) END AS ae_owner_id
  FROM public.crm_documents w
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.payload->'properties', '[]'::jsonb)) p(value)
  WHERE w.namespace = 'ws2'
  GROUP BY 1
)
SELECT g.contract_id, g.service, g.month,
       g.hotel_ref AS hotel_id, g.hotel_name, g.customer_id, g.customer_name,
       coalesce(b.fee_thb, 0) AS fee_thb, coalesce(b.commission_thb, 0) AS commission_thb,
       coalesce(b.guarantee_applied, false) AS guarantee_applied,
       (b.contract_id IS NOT NULL) AS has_bill,
       coalesce(b.combined_bill, false) AS combined_bill,
       c.start_date AS contract_start,
       (c.contract_id IS NULL OR (c.billing_status = 'ACTIVE' AND c.inactivated_at IS NULL)) AS contract_active,
       ae.ae_owner_id, gl.grade AS grade_latest, gw.grade AS grade_worst6
FROM grid g
LEFT JOIN bills b ON b.contract_id = g.contract_id AND b.service = g.service AND b.month = g.month
LEFT JOIN ctr c ON c.contract_id = g.contract_id
LEFT JOIN ae ON ae.hotel_ref = g.hotel_ref
LEFT JOIN gl ON gl.customer_id = g.customer_id
LEFT JOIN gw ON gw.customer_id = g.customer_id;
COMMENT ON VIEW public.v_ac_contract_cost_monthly IS 'R1.2 read-only: one row per service contract (contract x service) x billing month. RECURRING invoices only (setup/one-time lines excluded), amounts after VAT/WHT (line share of invoice total). combined_bill = line could not be mapped to one service and is listed under both. guarantee_applied reads an optional line flag (false when absent). Grades are the stored per-customer grade records (latest / worst of last 6 periods).';
GRANT SELECT ON public.v_ac_contract_cost_monthly TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_task_tickets WITH (security_invoker = true) AS
SELECT t.id, t.case_no, t.hotel_id, t.hotel_name, t.title, t.description, t.category_id, c.subcategory_label_th, t.routed_team, t.status, t.waiting_reason, t.created_by, t.created_at, t.updated_at, t.resolved_at, t.revision,
  CASE WHEN t.status IN ('open','in-progress') THEN floor(extract(epoch FROM now() - t.created_at) / 86400)::integer END AS aging_days,
  t.resp_id_at_create, t.resp_team_at_create, t.resp_id_at_close, t.resp_team_at_close, t.stamp_source,
  t.contract_id, t.meeting_id
FROM public.ticket t JOIN public.ticket_category c ON c.code = t.category_id;

CREATE OR REPLACE FUNCTION public.ticket_create_v4(p_hotel_id text, p_hotel_name text, p_category text, p_routed_team text, p_title text, p_description text, p_actor text, p_resp_id text, p_resp_team text, p_contract_id text, p_meeting_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; t public.ticket;
BEGIN
  r := public.ticket_create_v3(p_hotel_id, p_hotel_name, p_category, p_routed_team, p_title, p_description, p_actor, p_resp_id, p_resp_team);
  UPDATE ticket SET contract_id = NULLIF(btrim(coalesce(p_contract_id, '')), ''), meeting_id = NULLIF(btrim(coalesce(p_meeting_id, '')), '')
    WHERE id = (r->>'id')::uuid RETURNING * INTO t;
  RETURN to_jsonb(t);
END $$;
REVOKE ALL ON FUNCTION public.ticket_create_v4(text,text,text,text,text,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.ticket_create_v4(text,text,text,text,text,text,text,text,text,text,text) TO anon, authenticated, service_role;

-- One-time backfill: link a case to its contract only when the hotel + service maps to exactly one active contract.
WITH active AS (
  SELECT DISTINCT contract_id, hotel_id, service FROM public.v_ac_contract_cost_monthly WHERE contract_active
), m AS (
  SELECT t.id, min(a.contract_id) AS cid, count(DISTINCT a.contract_id) AS n
  FROM public.ticket t
  JOIN active a ON a.hotel_id = t.hotel_id AND (t.routed_team NOT IN ('ORM', 'MARCOM') OR upper(a.service) = t.routed_team)
  WHERE t.contract_id IS NULL
  GROUP BY t.id
)
UPDATE public.ticket t SET contract_id = m.cid FROM m WHERE m.id = t.id AND m.n = 1;