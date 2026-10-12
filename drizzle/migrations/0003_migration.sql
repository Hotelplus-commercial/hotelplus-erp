CREATE OR REPLACE FUNCTION public.ac_has_role(roles text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role=ANY(roles)) OR coalesce(nullif(current_setting('ac.test_role', true),''),'-') = ANY(roles) $$;

CREATE OR REPLACE FUNCTION public.ac_operate_as(p_persona uuid, p_role text, p_name text, payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; BEGIN
PERFORM set_config('request.jwt.claim.sub', p_persona::text, true);
PERFORM set_config('ac.test_role', p_role, true);
INSERT INTO member(name,user_id) VALUES(p_name,p_persona) ON CONFLICT (user_id) DO UPDATE SET name=excluded.name;
IF payload->>'action'='verify' THEN PERFORM ac_verify((payload->>'payment_id')::uuid, payload->>'tax_receipt_no'); r:='{}'::jsonb;
ELSE r:=to_jsonb(ac_operate(payload)); END IF;
RETURN r; END $$;
REVOKE ALL ON FUNCTION public.ac_operate_as(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ac_operate_as(uuid,text,text,jsonb) TO service_role;