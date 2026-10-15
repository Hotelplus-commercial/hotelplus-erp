CREATE TABLE public.ticket_category (
  code text PRIMARY KEY,
  domain text NOT NULL CHECK (domain IN ('ORM','MARCOM','AC','PS')),
  subcategory_label_th text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);
CREATE SEQUENCE public.ticket_case_seq;
CREATE TABLE public.ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no text NOT NULL UNIQUE DEFAULT ('Case-' || lpad(nextval('public.ticket_case_seq')::text, 6, '0')),
  hotel_id text NOT NULL,
  hotel_name text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  category_id text NOT NULL REFERENCES public.ticket_category(code),
  routed_team text NOT NULL CHECK (routed_team IN ('ORM','MARCOM','AC','PS')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','waiting','resolved','closed')),
  waiting_reason text CHECK (waiting_reason IN ('CUSTOMER','INTERNAL')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  revision integer NOT NULL DEFAULT 0,
  CONSTRAINT ticket_waiting_reason_iff CHECK ((status = 'waiting') = (waiting_reason IS NOT NULL))
);
CREATE TABLE public.ticket_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.ticket(id),
  actor_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('CREATE','COMMENT','STATUS_CHANGE','CATEGORY_CHANGE')),
  body text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_activity_ticket_idx ON public.ticket_activity(ticket_id, at DESC);
COMMENT ON TABLE public.ticket IS 'Task tab case system. No assignee_id/priority by design: responsible/watchers are derived at read time from the assignment master. hotel_id is the stable WS-2 hotel id (text; no property table in cloud); hotel_name is a search snapshot. Writes only via ticket_* RPCs with revision lock. Testing mode: anon may call RPCs; close before production.';

GRANT SELECT ON public.ticket_category, public.ticket, public.ticket_activity TO anon, authenticated;
GRANT ALL ON public.ticket_category, public.ticket, public.ticket_activity TO service_role;
GRANT USAGE ON SEQUENCE public.ticket_case_seq TO service_role;
ALTER TABLE public.ticket_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_category_read ON public.ticket_category FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ticket_read ON public.ticket FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ticket_activity_read ON public.ticket_activity FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.ticket_create(p_hotel_id text, p_hotel_name text, p_category text, p_title text, p_description text, p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.ticket_category; t public.ticket;
BEGIN
  IF coalesce(btrim(p_hotel_id),'') = '' THEN RAISE EXCEPTION 'hotel required'; END IF;
  IF coalesce(btrim(p_actor),'') = '' THEN RAISE EXCEPTION 'actor required'; END IF;
  SELECT * INTO c FROM ticket_category WHERE code = p_category AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown category'; END IF;
  INSERT INTO ticket(hotel_id, hotel_name, title, description, category_id, routed_team, created_by)
  VALUES (p_hotel_id, coalesce(p_hotel_name,''), btrim(p_title), nullif(btrim(coalesce(p_description,'')),''), c.code, c.domain, p_actor) RETURNING * INTO t;
  INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'CREATE', t.case_no);
  RETURN to_jsonb(t);
END $$;

CREATE OR REPLACE FUNCTION public.ticket_update(p_id uuid, p_revision integer, p_actor text, p_status text, p_waiting_reason text, p_category text, p_comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.ticket; c public.ticket_category; ns text; nr text;
BEGIN
  IF coalesce(btrim(p_actor),'') = '' THEN RAISE EXCEPTION 'actor required'; END IF;
  SELECT * INTO t FROM ticket WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF t.revision <> p_revision THEN RETURN jsonb_build_object('conflict', true, 'revision', t.revision); END IF;
  ns := coalesce(p_status, t.status);
  nr := CASE WHEN ns = 'waiting' THEN coalesce(p_waiting_reason, CASE WHEN t.status='waiting' THEN t.waiting_reason END) ELSE NULL END;
  IF ns = 'waiting' AND nr IS NULL THEN RAISE EXCEPTION 'waiting_reason required'; END IF;
  IF p_category IS NOT NULL AND p_category <> t.category_id THEN
    SELECT * INTO c FROM ticket_category WHERE code = p_category AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown category'; END IF;
    INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'CATEGORY_CHANGE', t.category_id || ' → ' || c.code);
    t.category_id := c.code; t.routed_team := c.domain;
  END IF;
  IF ns <> t.status OR nr IS DISTINCT FROM t.waiting_reason THEN
    INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'STATUS_CHANGE', t.status || coalesce(' ('||t.waiting_reason||')','') || ' → ' || ns || coalesce(' ('||nr||')',''));
    t.resolved_at := CASE WHEN ns IN ('resolved','closed') THEN coalesce(CASE WHEN t.status IN ('resolved','closed') THEN t.resolved_at END, now()) ELSE NULL END;
    t.status := ns; t.waiting_reason := nr;
  END IF;
  IF coalesce(btrim(p_comment),'') <> '' THEN
    INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'COMMENT', btrim(p_comment));
  END IF;
  UPDATE ticket SET category_id = t.category_id, routed_team = t.routed_team, status = t.status, waiting_reason = t.waiting_reason,
    resolved_at = t.resolved_at, updated_at = now(), revision = revision + 1 WHERE id = t.id RETURNING * INTO t;
  RETURN to_jsonb(t);
END $$;
REVOKE ALL ON FUNCTION public.ticket_create(text,text,text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.ticket_update(uuid,integer,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.ticket_create(text,text,text,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ticket_update(uuid,integer,text,text,text,text,text) TO anon, authenticated, service_role;

CREATE VIEW public.v_task_tickets WITH (security_invoker = true) AS
SELECT t.id, t.case_no, t.hotel_id, t.hotel_name, t.title, t.description, t.category_id, c.subcategory_label_th, t.routed_team, t.status, t.waiting_reason, t.created_by, t.created_at, t.updated_at, t.resolved_at, t.revision,
  CASE WHEN t.status IN ('open','in-progress') THEN floor(extract(epoch FROM now() - t.created_at) / 86400)::integer END AS aging_days
FROM public.ticket t JOIN public.ticket_category c ON c.code = t.category_id;
CREATE VIEW public.v_task_overdue_tickets WITH (security_invoker = true) AS
SELECT * FROM public.v_task_tickets WHERE status IN ('open','in-progress') AND aging_days > 3;
CREATE VIEW public.v_task_coaching_backlog AS SELECT NULL::text AS coaching_id, NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::text AS service_line, NULL::text AS coach, NULL::text AS status, NULL::date AS created_at, NULL::integer AS age_days, true AS pending_sync FROM public.crm_documents WHERE false;
CREATE VIEW public.v_task_unassigned AS SELECT NULL::text AS card_id, NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::text AS service_line, NULL::text AS role, NULL::date AS due_since, NULL::integer AS age_days, true AS pending_sync FROM public.crm_documents WHERE false;
CREATE VIEW public.v_task_deadline_streams AS SELECT NULL::text AS stream, NULL::text AS item_id, NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::text AS service_line, NULL::text AS owner_id, NULL::date AS deadline, NULL::boolean AS overdue, NULL::integer AS age_days, true AS pending_sync FROM public.crm_documents WHERE false;
CREATE VIEW public.v_task_onboard_cycle AS SELECT NULL::text AS card_id, NULL::text AS hotel_id, NULL::text AS hotel_name, NULL::text AS service_line, NULL::date AS created_at, NULL::date AS go_live_at, NULL::integer AS cycle_days, true AS pending_sync FROM public.crm_documents WHERE false;
COMMENT ON VIEW public.v_task_coaching_backlog IS 'Pending: CoachingTask is browser-local; empty until Cloud Sync seed + C5.';
COMMENT ON VIEW public.v_task_unassigned IS 'Pending: assignment master/cards are browser-local; empty until Cloud Sync seed + C5.';
COMMENT ON VIEW public.v_task_deadline_streams IS 'Pending: renewal/onboarding/survey/coaching mirrors absent; empty until seed.';
COMMENT ON VIEW public.v_task_onboard_cycle IS 'Pending: mirrors v_ps_onboard_cohort logic once onboarding cards sync.';
GRANT SELECT ON public.v_task_tickets, public.v_task_overdue_tickets, public.v_task_coaching_backlog, public.v_task_unassigned, public.v_task_deadline_streams, public.v_task_onboard_cycle TO anon, authenticated, service_role;