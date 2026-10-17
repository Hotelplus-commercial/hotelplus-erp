DROP VIEW IF EXISTS public.v_meeting_completion;
DROP VIEW IF EXISTS public.v_meeting_count_by_ae;
DROP VIEW IF EXISTS public.v_meeting_survey_collection;
DROP VIEW IF EXISTS public.v_meeting_survey_scores;
DROP VIEW IF EXISTS public.v_meeting_flags;
DROP VIEW IF EXISTS public.v_meeting_funnel;

CREATE VIEW public.v_meeting_funnel AS
SELECT NULL::text AS meeting_id, NULL::text AS card_month, NULL::text AS service_line, NULL::text AS tier,
  NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::text AS status, NULL::date AS meeting_date,
  NULL::text AS ae_owner_id, NULL::text AS orm_team, NULL::text AS marcom_owner_id,
  NULL::text AS survey_status, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_funnel TO anon, authenticated;

CREATE VIEW public.v_meeting_survey_scores AS
SELECT NULL::text AS meeting_id, NULL::text AS card_month, NULL::text AS question, NULL::text AS service_line,
  NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::integer AS score, NULL::integer AS prev_score,
  NULL::text AS caretaker, NULL::text AS ae_owner_id, NULL::text AS orm_team, NULL::text AS marcom_owner_id,
  NULL::boolean AS disputed, NULL::text AS comment, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_survey_scores TO anon, authenticated;

CREATE VIEW public.v_meeting_flags AS
SELECT NULL::text AS flag_id, NULL::text AS group_name, NULL::text AS topic, NULL::text AS severity,
  NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::integer AS score, NULL::text AS flagged_user,
  NULL::text AS route_target, NULL::boolean AS escalated_to_pm, NULL::boolean AS escalated_from_warning,
  NULL::integer AS age_days, NULL::text AS coaching_status, NULL::date AS created_at, NULL::date AS resolved_at,
  NULL::date AS watch_until, NULL::text AS meeting_id, NULL::text AS service_line, NULL::text AS ae_owner_id,
  NULL::text AS orm_team, NULL::text AS marcom_owner_id, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_flags TO anon, authenticated;

CREATE VIEW public.v_meeting_tierA_pending AS
SELECT NULL::text AS meeting_id, NULL::text AS card_month, NULL::text AS hotel_id, NULL::text AS hotel_name,
  NULL::text AS owner_ae_id, NULL::text AS orm_team, NULL::text AS status, NULL::date AS meeting_date,
  NULL::integer AS days_to_cutoff, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_tierA_pending TO anon, authenticated;

CREATE VIEW public.v_meeting_by_owner AS
SELECT NULL::text AS card_month, NULL::text AS lens, NULL::text AS owner,
  NULL::integer AS a_base, NULL::integer AS a_completed, NULL::integer AS mc_base, NULL::integer AS mc_completed,
  NULL::integer AS scheduled_completed, NULL::integer AS scheduled_waiting, NULL::integer AS scheduled_no_show,
  NULL::integer AS hotel_count, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_by_owner TO anon, authenticated;

CREATE VIEW public.v_meeting_completion AS
SELECT NULL::text AS meeting_id, NULL::text AS card_month, NULL::text AS service_line,
  NULL::integer AS completed, NULL::integer AS base, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_completion TO anon, authenticated;
COMMENT ON VIEW public.v_meeting_completion IS 'Meeting v2.0: tile 2 only (ORM completed all tiers + Marcom completed) / (ORM Tier A base + Marcom base); no longer feeds the Headline.';

CREATE VIEW public.v_meeting_count_by_ae AS
SELECT NULL::text AS meeting_id, NULL::date AS meeting_date, NULL::text AS hotel_id, NULL::text AS hotel_name,
  NULL::text AS status, NULL::text AS service_line, NULL::text AS ae_owner_id, NULL::text AS orm_team,
  NULL::text AS orm_owner_id, NULL::text AS marcom_owner_id, NULL::integer AS meeting_count, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_count_by_ae TO anon, authenticated;
COMMENT ON VIEW public.v_meeting_count_by_ae IS 'DEPRECATED: replaced by v_meeting_by_owner (Meeting tab v2.0); kept unused, do not drop.';

CREATE VIEW public.v_meeting_survey_collection AS
SELECT NULL::text AS meeting_id, NULL::date AS meeting_date, NULL::text AS hotel_id, NULL::text AS hotel_name,
  NULL::text AS status, NULL::text AS service_line, NULL::text AS ae_owner_id, NULL::text AS orm_team,
  NULL::text AS orm_owner_id, NULL::text AS marcom_owner_id, NULL::integer AS completed, NULL::integer AS submitted,
  NULL::integer AS queue, true AS pending_sync
FROM public.crm_documents WHERE false;
GRANT SELECT ON public.v_meeting_survey_collection TO anon, authenticated;
COMMENT ON VIEW public.v_meeting_survey_collection IS 'DEPRECATED: replaced by v_meeting_survey_scores (Meeting tab v2.0); kept unused, do not drop.';