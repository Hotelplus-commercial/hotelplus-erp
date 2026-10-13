CREATE VIEW public.v_ps_lifecycle_flow WITH (security_invoker=true) AS SELECT null::text AS contract_id, null::text AS hotel_id, null::text AS service_line, null::text AS ae_owner_id, null::text AS status, null::date AS start_date, null::date AS inactivated_at, null::date AS created_at WHERE false;
COMMENT ON VIEW public.v_ps_lifecycle_flow IS 'Pending Cloud servicing/renewal source: canonical contracts contain signing status only, not confirmed meeting+email start or scheduled renewal end. Do not infer ACTIVE from contract_completed.';
CREATE VIEW public.v_ps_churn_monthly WITH (security_invoker=true) AS SELECT null::date AS billing_period, null::text AS service_line, null::bigint AS out_count, null::bigint AS active_at_start WHERE false;
CREATE VIEW public.v_ps_renewal WITH (security_invoker=true) AS SELECT null::text AS renewal_id, null::text AS hotel_id, null::text AS service_line, null::text AS ae_owner_id, null::date AS renewal_due_date, null::text AS outcome, null::date AS decided_at WHERE false;
COMMENT ON VIEW public.v_ps_renewal IS 'Pending existing browser-only RenewalCard Cloud snapshot; NOT_STARTED/ON_PROCESS are undecided, COMPLETED=RENEWED, CHURN uses churnType labels. Never infer per-service attribution from hotelId.';
CREATE VIEW public.v_ps_contract_lifetime WITH (security_invoker=true) AS SELECT null::text AS contract_id, null::text AS hotel_id, null::text AS service_line, null::text AS status, null::date AS end_date, null::numeric AS age_days WHERE false;
CREATE VIEW public.v_ps_onboard_cohort WITH (security_invoker=true) AS SELECT null::date AS billing_period, null::text AS service_line, null::numeric AS median_days, null::numeric AS p25_days, null::numeric AS p75_days, null::numeric AS ae_days, null::numeric AS specialist_days, null::numeric AS orm_days, null::numeric AS marcom_days, null::numeric AS overall_days, null::numeric AS survey1, null::numeric AS survey2, null::bigint AS promoters, null::bigint AS detractors, null::bigint AS responses WHERE false;
COMMENT ON VIEW public.v_ps_onboard_cohort IS 'Pending existing ServicingProvider Cloud snapshot. Finished Go Live cards only; independent owner duration results, never summed.';
CREATE VIEW public.v_ps_attach_rate WITH (security_invoker=true) AS SELECT null::text AS service_line, null::bigint AS attached_hotels, null::bigint AS active_hotels WHERE false;
CREATE VIEW public.v_ps_nps WITH (security_invoker=true) AS SELECT null::date AS billing_period, null::text AS service_line, null::bigint AS promoters, null::bigint AS detractors, null::bigint AS responses WHERE false;
CREATE VIEW public.v_ps_offboard WITH (security_invoker=true) AS SELECT null::text AS hotel_id, true AS pending_sync WHERE false;
CREATE VIEW public.v_ps_account_health WITH (security_invoker=true) AS WITH profiles AS (
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
null::bigint AS active_services,'รอ Meeting tab'::text AS flag
FROM profiles p LEFT JOIN properties pr ON pr.hotel_id=p.hotel_id;
COMMENT ON VIEW public.v_ps_account_health IS 'WS2 safe service profiles and canonical upstream customer-period latest grade. Worst active-service grade, monthly survey, confirmed active-service count and risk billing remain null until correctly attributed sources exist; no grade recomputation.';
GRANT SELECT ON public.v_ps_lifecycle_flow,public.v_ps_churn_monthly,public.v_ps_renewal,public.v_ps_contract_lifetime,public.v_ps_onboard_cohort,public.v_ps_attach_rate,public.v_ps_account_health,public.v_ps_nps,public.v_ps_offboard TO service_role;