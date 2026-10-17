ALTER TABLE public.ticket
  ADD COLUMN resp_id_at_create text,
  ADD COLUMN resp_team_at_create text,
  ADD COLUMN resp_id_at_close text,
  ADD COLUMN resp_team_at_close text,
  ADD COLUMN stamp_source text CHECK (stamp_source IN ('LIVE','BACKFILL'));

-- One-time backfill: the assignment master is browser-local, so the server can only derive the team from routed_team.
-- ORM rows have no server-visible orm_team -> team stays null ("ไม่ระบุทีม"); person ids stay null.
UPDATE public.ticket SET
  resp_team_at_create = CASE WHEN routed_team = 'ORM' THEN NULL ELSE routed_team END,
  resp_team_at_close = CASE WHEN status IN ('resolved','closed') AND routed_team <> 'ORM' THEN routed_team END,
  stamp_source = 'BACKFILL';

CREATE OR REPLACE VIEW public.v_task_tickets WITH (security_invoker = true) AS
SELECT t.id, t.case_no, t.hotel_id, t.hotel_name, t.title, t.description, t.category_id, c.subcategory_label_th, t.routed_team, t.status, t.waiting_reason, t.created_by, t.created_at, t.updated_at, t.resolved_at, t.revision,
  CASE WHEN t.status IN ('open','in-progress') THEN floor(extract(epoch FROM now() - t.created_at) / 86400)::integer END AS aging_days,
  t.resp_id_at_create, t.resp_team_at_create, t.resp_id_at_close, t.resp_team_at_close, t.stamp_source
FROM public.ticket t JOIN public.ticket_category c ON c.code = t.category_id;

CREATE OR REPLACE FUNCTION public.ticket_create_v3(p_hotel_id text, p_hotel_name text, p_category text, p_routed_team text, p_title text, p_description text, p_actor text, p_resp_id text, p_resp_team text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; t public.ticket;
BEGIN
  r := public.ticket_create_v2(p_hotel_id, p_hotel_name, p_category, p_routed_team, p_title, p_description, p_actor);
  UPDATE ticket SET resp_id_at_create = NULLIF(btrim(p_resp_id),''), resp_team_at_create = NULLIF(btrim(p_resp_team),''), stamp_source = 'LIVE'
    WHERE id = (r->>'id')::uuid RETURNING * INTO t;
  RETURN to_jsonb(t);
END $$;

CREATE OR REPLACE FUNCTION public.ticket_update_v3(p_id uuid, p_revision integer, p_actor text, p_status text, p_waiting_reason text, p_category text, p_routed_team text, p_comment text, p_resp_id text, p_resp_team text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_status text; r jsonb; t public.ticket;
BEGIN
  SELECT status INTO old_status FROM ticket WHERE id = p_id;
  r := public.ticket_update_v2(p_id, p_revision, p_actor, p_status, p_waiting_reason, p_category, p_routed_team, p_comment);
  IF coalesce((r->>'conflict')::boolean, false) THEN RETURN r; END IF;
  IF (r->>'status') IN ('resolved','closed') AND old_status NOT IN ('resolved','closed') THEN
    UPDATE ticket SET resp_id_at_close = NULLIF(btrim(p_resp_id),''), resp_team_at_close = NULLIF(btrim(p_resp_team),''), stamp_source = coalesce(stamp_source, 'LIVE')
      WHERE id = p_id RETURNING * INTO t;
    RETURN to_jsonb(t);
  END IF;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.ticket_create_v3(text,text,text,text,text,text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.ticket_update_v3(uuid,integer,text,text,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.ticket_create_v3(text,text,text,text,text,text,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ticket_update_v3(uuid,integer,text,text,text,text,text,text,text,text) TO anon, authenticated, service_role;

CREATE TABLE public.task_backlog_snapshot (
  snapshot_date date NOT NULL,
  metric text NOT NULL CHECK (metric IN ('K1_OPEN','K2_OVERDUE','K3_UNASSIGNED','K4_COACHING','K5_RENEWAL_EXPIRED','DEPT_OPEN')),
  dim_key text NOT NULL,
  value integer NOT NULL,
  threshold_used numeric,
  source text NOT NULL CHECK (source IN ('JOB','CATCHUP')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, metric, dim_key)
);
GRANT SELECT ON public.task_backlog_snapshot TO anon, authenticated;
GRANT ALL ON public.task_backlog_snapshot TO service_role;
ALTER TABLE public.task_backlog_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_snapshot_read ON public.task_backlog_snapshot FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.task_snapshot_upsert(p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO task_backlog_snapshot(snapshot_date, metric, dim_key, value, threshold_used, source)
  SELECT (x->>'snapshot_date')::date, x->>'metric', x->>'dim_key', (x->>'value')::integer, NULLIF(x->>'threshold_used','')::numeric, x->>'source'
  FROM jsonb_array_elements(p_rows) x
  ON CONFLICT (snapshot_date, metric, dim_key) DO UPDATE SET value = excluded.value, threshold_used = excluded.threshold_used, source = excluded.source, created_at = now()
    WHERE excluded.source = 'JOB';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.task_snapshot_upsert(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.task_snapshot_upsert(jsonb) TO anon, authenticated, service_role;
COMMENT ON TABLE public.task_backlog_snapshot IS 'Task v2.1 daily backlog snapshot; written only by the AC daily job post-step via task_snapshot_upsert.';
COMMENT ON FUNCTION public.ticket_create_v2 IS 'DEPRECATED: replaced by ticket_create_v3 (responsible stamps).';
COMMENT ON FUNCTION public.ticket_update_v2 IS 'DEPRECATED: replaced by ticket_update_v3 (close stamps); still called internally by v3.';