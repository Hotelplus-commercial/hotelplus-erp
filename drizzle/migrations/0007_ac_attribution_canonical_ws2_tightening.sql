COMMENT ON TABLE public.service_subscription IS 'DEPRECATED: retained only for legacy SQL dependencies; use canonical contracts and WS-2 assignments.';
COMMENT ON TABLE public.invoice IS 'DEPRECATED: use canonical invoices; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.payment IS 'DEPRECATED: use canonical payment_records; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.payment_grade_record IS 'DEPRECATED: use canonical gradeRecords; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.collection_event IS 'DEPRECATED: use canonical collectionEvents; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.hotel IS 'DEPRECATED: use canonical Hotel Profile; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.customer IS 'DEPRECATED: use canonical customers; retained for legacy SQL dependencies.';
COMMENT ON TABLE public.contract IS 'DEPRECATED: use canonical contracts; retained for legacy SQL dependencies.';
-- WS-2 SQL projection awaits a future ws2 document snapshot; no sync or data writes introduced.
CREATE OR REPLACE VIEW public.ac_invoice_attributed WITH (security_invoker=true) AS
WITH raw AS (
SELECT i.value i,d.payload FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'invoices','[]'::jsonb)) i(value)
WHERE d.namespace='crm' AND nullif(i.value->>'hotel_id','') IS NOT NULL AND i.value->>'service_line' IN ('ORM','Marcom')
), projected AS (
SELECT r.*,o.orm_owner,o.marcom_owner,(SELECT CASE WHEN e.value->>'event_type'='REACTIVATED' THEN 'NORMAL' ELSE e.value->>'event_type' END FROM jsonb_array_elements(coalesce(r.payload->'collectionEvents','[]'::jsonb)) WITH ORDINALITY e(value,n) WHERE e.value->>'customer_id'=r.i#>>'{customer_snapshot,customer_id}' ORDER BY n LIMIT 1) collection
FROM raw r LEFT JOIN LATERAL (
SELECT CASE WHEN count(DISTINCT nullif(p.value->>'orm_team',''))=1 THEN min(nullif(p.value->>'orm_team','')) END orm_owner,
CASE WHEN count(DISTINCT nullif(p.value->>'marcom_member_id',''))=1 THEN min(nullif(p.value->>'marcom_member_id','')) END marcom_owner
FROM public.crm_documents w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.payload->'profiles','[]'::jsonb)) p(value)
WHERE w.namespace='ws2' AND p.value->>'property_id'=r.i->>'hotel_id' AND ((r.i->>'service_line'='ORM' AND p.value->>'service'='ORM') OR (r.i->>'service_line'='Marcom' AND p.value->>'service' IN ('MARCOM_MT','MARCOM_GMB')))
) o ON true)
SELECT md5(i->>'invoice_id')::uuid id,NULL::uuid subscription_id,
CASE WHEN i->>'hotel_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (i->>'hotel_id')::uuid ELSE md5(i->>'hotel_id')::uuid END hotel_id,
md5(i#>>'{customer_snapshot,customer_id}')::uuid customer_id,(i->>'service_line')::public.service_line service_line,(i->>'invoice_type')::public.invoice_type invoice_type,
date_trunc('month',(i->>'billing_period_start')::timestamptz)::date billing_period,(i->>'customer_segment')::public.customer_segment customer_segment,
nullif(i->>'issue_date','')::date issue_date,nullif(i->>'due_date','')::date due_date,(i#>>'{totals,total}')::numeric(12,2) amount,
coalesce((i->>'paid_amount')::numeric,CASE WHEN i->>'status'='paid' THEN (i#>>'{totals,total}')::numeric ELSE 0 END)::numeric(12,2) paid_amount,
nullif(i->>'settled_date','')::date settled_date,nullif(i->>'gateway_paid_at','')::timestamptz::date gateway_paid_date,NULL::text tax_receipt_no,
(CASE i->>'status' WHEN 'paid' THEN 'PAID' WHEN 'partially_paid' THEN 'PARTIALLY_PAID' WHEN 'void' THEN 'VOID' WHEN 'written_off' THEN 'WRITTEN_OFF' ELSE 'ISSUED' END)::public.invoice_status status,
NULL::text cadence,(i->>'created_at')::timestamptz created_at,
CASE WHEN i->>'service_line'='ORM' AND orm_owner IS NOT NULL THEN md5(orm_owner)::uuid END orm_team_id,
CASE WHEN i->>'service_line'='Marcom' AND marcom_owner IS NOT NULL THEN md5(marcom_owner)::uuid END marcom_member_id,
i#>>'{customer_snapshot,hotel_name}' hotel_name,i#>>'{customer_snapshot,legal_name}' customer_name,
i->>'invoice_id' original_invoice_id,i#>>'{customer_snapshot,customer_id}' original_customer_id,i->>'status' canonical_status,coalesce(collection,'NORMAL') collection_status
FROM projected;
COMMENT ON VIEW public.ac_invoice_attributed IS 'Stable invoice.hotel_id + service-aware WS-2 ServiceProfile owners; never contract/subscription owners. WS-2 Cloud snapshot is a separate future sync dependency.';
CREATE OR REPLACE VIEW public.ac_canonical_invoice_rows WITH (security_invoker=true) AS
SELECT customer_id,hotel_id,hotel_name,original_invoice_id invoice_id,service_line,billing_period,customer_segment,orm_team_id,marcom_member_id,amount::numeric amount,paid_amount::numeric paid_amount,canonical_status status,due_date,original_customer_id,collection_status FROM public.ac_invoice_attributed;
CREATE OR REPLACE VIEW public.v_ac_grade_distribution WITH (security_invoker=true) AS
SELECT (g.value->>'billing_period')::date billing_period,(g.value->>'grade')::public.payment_grade grade,i.service_line,i.orm_team_id,i.marcom_member_id,count(DISTINCT i.customer_id) customer_count
FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'gradeRecords','[]'::jsonb)) g(value)
JOIN public.ac_invoice_attributed i ON i.original_customer_id=g.value->>'customer_id' AND i.billing_period=(g.value->>'billing_period')::date AND coalesce(g.value->'basis','[]'::jsonb) ? i.original_invoice_id
WHERE d.namespace='crm' AND i.invoice_type='RECURRING' AND i.due_date IS NOT NULL AND i.canonical_status NOT IN ('draft','void','written_off')
GROUP BY (g.value->>'billing_period')::date,(g.value->>'grade')::public.payment_grade,i.service_line,i.orm_team_id,i.marcom_member_id;