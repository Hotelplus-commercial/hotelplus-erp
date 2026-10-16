CREATE VIEW public.v_ps_crosssell WITH (security_invoker=true) AS
SELECT null::text AS hotel_id, null::text AS hotel_name, null::text AS ae_owner_id, null::text AS service_line, null::text AS owned_service, null::text AS gap_service,
 null::text AS health_tier, null::text AS grade, null::numeric AS survey_score, null::boolean AS gate_pass, null::text AS gate_fail_reason,
 null::boolean AS sig_value_proof, null::boolean AS sig_happy, null::boolean AS sig_mature, null::boolean AS sig_timely,
 null::integer AS readiness_score, null::text AS readiness_tier, null::boolean AS is_prime, true AS pending_sync
WHERE false;
COMMENT ON VIEW public.v_ps_crosssell IS 'Expansion Track 1 (hotel x single-service). Empty pending projection until contract/AC grade/Survey#2/ROI mirrors are seeded; readiness = COUNT(signals), never weighted.';
CREATE VIEW public.v_ps_repricing WITH (security_invoker=true) AS
SELECT null::text AS hotel_id, null::text AS hotel_name, null::text AS ae_owner_id, null::text AS service_line, null::text AS billing_model,
 null::text AS lever_field, null::numeric AS lever_amount, null::date AS last_increase_at, null::integer AS months_since_increase,
 null::text AS signal_path, null::boolean AS cadence_path, null::text AS trigger, null::boolean AS trigger_pending, null::text AS revenue_profile,
 null::boolean AS gate_pass, null::text AS gate_fail_reason, null::text AS band_bucket, null::numeric AS band_min_pct, null::numeric AS band_max_pct,
 null::numeric AS suggested_min_thb, null::numeric AS suggested_max_thb, null::text[] AS why_chips, true AS pending_sync
WHERE false;
COMMENT ON VIEW public.v_ps_repricing IS 'Expansion Track 2 (hotel-service with fixed component). Lever = fee_fixed/guarantee only, never commission %. Reference band only. Empty pending projection until ServiceProfile.price_history and revenue mirrors are seeded.';
GRANT SELECT ON public.v_ps_crosssell TO anon, authenticated, service_role;
GRANT SELECT ON public.v_ps_repricing TO anon, authenticated, service_role;