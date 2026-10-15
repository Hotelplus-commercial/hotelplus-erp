ALTER TABLE public.ticket_activity DROP CONSTRAINT IF EXISTS ticket_activity_type_check;
ALTER TABLE public.ticket_activity ADD CONSTRAINT ticket_activity_type_check CHECK (type IN ('CREATE','COMMENT','STATUS_CHANGE','CATEGORY_CHANGE','DEPT_CHANGE'));

CREATE OR REPLACE FUNCTION public.ticket_create_v2(p_hotel_id text, p_hotel_name text, p_category text, p_routed_team text, p_title text, p_description text, p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.ticket_category; t public.ticket; team text;
BEGIN
  IF coalesce(btrim(p_hotel_id),'') = '' THEN RAISE EXCEPTION 'hotel required'; END IF;
  IF coalesce(btrim(p_actor),'') = '' THEN RAISE EXCEPTION 'actor required'; END IF;
  SELECT * INTO c FROM ticket_category WHERE code = p_category AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown category'; END IF;
  team := coalesce(nullif(p_routed_team,''), c.domain);
  IF team NOT IN ('ORM','MARCOM','AC','PS') THEN RAISE EXCEPTION 'unknown department'; END IF;
  INSERT INTO ticket(hotel_id, hotel_name, title, description, category_id, routed_team, created_by)
  VALUES (p_hotel_id, coalesce(p_hotel_name,''), btrim(p_title), nullif(btrim(coalesce(p_description,'')),''), c.code, team, p_actor) RETURNING * INTO t;
  INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'CREATE', t.case_no || ' · ' || team);
  RETURN to_jsonb(t);
END $$;

CREATE OR REPLACE FUNCTION public.ticket_update_v2(p_id uuid, p_revision integer, p_actor text, p_status text, p_waiting_reason text, p_category text, p_routed_team text, p_comment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.ticket; c public.ticket_category; ns text; nr text; old_team text;
BEGIN
  IF coalesce(btrim(p_actor),'') = '' THEN RAISE EXCEPTION 'actor required'; END IF;
  SELECT * INTO t FROM ticket WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF t.revision <> p_revision THEN RETURN jsonb_build_object('conflict', true, 'revision', t.revision); END IF;
  IF p_routed_team IS NOT NULL AND p_routed_team NOT IN ('ORM','MARCOM','AC','PS') THEN RAISE EXCEPTION 'unknown department'; END IF;
  ns := coalesce(p_status, t.status);
  nr := CASE WHEN ns = 'waiting' THEN coalesce(p_waiting_reason, CASE WHEN t.status='waiting' THEN t.waiting_reason END) ELSE NULL END;
  IF ns = 'waiting' AND nr IS NULL THEN RAISE EXCEPTION 'waiting_reason required'; END IF;
  old_team := t.routed_team;
  IF p_category IS NOT NULL AND p_category <> t.category_id THEN
    SELECT * INTO c FROM ticket_category WHERE code = p_category AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'unknown category'; END IF;
    INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'CATEGORY_CHANGE', t.category_id || ' → ' || c.code);
    t.category_id := c.code; t.routed_team := c.domain;
  END IF;
  IF p_routed_team IS NOT NULL THEN t.routed_team := p_routed_team; END IF;
  IF t.routed_team <> old_team THEN
    INSERT INTO ticket_activity(ticket_id, actor_id, type, body) VALUES (t.id, p_actor, 'DEPT_CHANGE', old_team || ' → ' || t.routed_team);
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
REVOKE ALL ON FUNCTION public.ticket_create_v2(text,text,text,text,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.ticket_update_v2(uuid,integer,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.ticket_create_v2(text,text,text,text,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ticket_update_v2(uuid,integer,text,text,text,text,text,text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.ticket_create IS 'DEPRECATED: replaced by ticket_create_v2 (explicit routed_team).';
COMMENT ON FUNCTION public.ticket_update IS 'DEPRECATED: replaced by ticket_update_v2 (explicit routed_team + DEPT_CHANGE).';