CREATE OR REPLACE VIEW public.v_ps_account_health WITH (security_invoker=true) AS WITH profiles AS (
 SELECT p->>'property_id' AS hotel_id, CASE WHEN p->>'service'='ORM' THEN 'ORM' WHEN p->>'service' IN ('MARCOM_MT','MARCOM_GMB') THEN 'Marcom' END AS service_line,
 p->>'form_completion_status' AS completeness FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'profiles','[]'::jsonb)) p WHERE d.namespace='ws2'
), properties AS (
 SELECT p->>'hotel_id' AS hotel_id,p->>'hotel_name_th' AS hotel_name FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'properties','[]'::jsonb)) p WHERE d.namespace='ws2'
), grades AS (
 SELECT g->>'customer_id' AS customer_id,g->>'billing_period' AS period,g->>'grade' AS grade FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items','[]'::jsonb)) g WHERE d.namespace='crm:gradeRecords'
), identity AS (
 SELECT DISTINCT i->>'hotel_id' AS hotel_id,i#>>'{customer_snapshot,customer_id}' AS customer_id FROM public.crm_documents d CROSS JOIN LATERAL jsonb_array_elements(coalesce(d.payload->'items','[]'::jsonb)) i WHERE d.namespace='crm:invoices' AND nullif(i->>'hotel_id','') IS NOT NULL
)
SELECT p.hotel_id,pr.hotel_name,p.service_line,p.completeness,
(SELECT g.grade FROM grades g JOIN identity i ON i.customer_id=g.customer_id WHERE i.hotel_id=p.hotel_id ORDER BY g.period DESC,g.grade DESC LIMIT 1) AS latest_grade,
null::text AS worst_grade, null::numeric AS monthly_survey_score,null::numeric AS monthly_billing,null::numeric AS survey2,null::numeric AS nps,
null::bigint AS active_services,'รอ Meeting tab'::text AS flag,
null::boolean AS has_orm_commission, true AS pending_sync
FROM profiles p LEFT JOIN properties pr ON pr.hotel_id=p.hotel_id;
COMMENT ON VIEW public.v_ps_account_health IS 'Account Health 360 v1.0: WS2 profiles + canonical latest grade. has_orm_commission stays null until a contract billing_model mirror exists (ORM dims N/A). Dims/score/tier are derived read-only in the dashboard selector; no grade recomputation.';

CREATE VIEW public.v_ps_roi WITH (security_invoker=true) AS
SELECT null::text AS hotel_id, null::text AS hotel_name, 'ORM'::text AS service_line, null::text AS ae_owner_id,
 null::date AS period, null::numeric AS revenue_thb, null::numeric AS fee_fixed_thb, null::numeric AS commission_thb,
 null::numeric AS value_ratio, null::text AS orm_tier, null::numeric AS achievement_pct,
 null::numeric AS portfolio_rev_median, null::integer AS portfolio_n, true AS pending_sync
WHERE false;
COMMENT ON VIEW public.v_ps_roi IS 'ORM commission-model revenue × fee × tier per hotel×closed month. Empty pending projection: Production Report revenue, AC commission lines and tier batch have no Cloud mirror yet; join on hotel_id+period, skip rows missing a key.';
GRANT SELECT ON public.v_ps_roi TO anon, authenticated, service_role;
GRANT SELECT ON public.v_ps_account_health TO service_role;