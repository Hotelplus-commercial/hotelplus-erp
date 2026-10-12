CREATE FUNCTION public.ac_operate(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$DECLARE action text:=payload->>'action'; result uuid; cust uuid; hot uuid; ctr uuid; actor uuid; inv invoice; sub service_subscription; debt numeric; event collection_event_type; BEGIN
IF NOT ac_has_role(ARRAY['ac','admin']) AND NOT(action='collection' AND payload->>'event'='LEGAL_FILED' AND ac_has_role(ARRAY['legal'])) THEN RAISE EXCEPTION 'Accounting access required'; END IF;
SELECT id INTO actor FROM member WHERE user_id=auth.uid(); IF actor IS NULL THEN INSERT INTO member(name,user_id) VALUES('Accounting member',auth.uid()) RETURNING id INTO actor; END IF;
IF action='subscription' THEN
PERFORM pg_advisory_xact_lock(741026);
SELECT id INTO hot FROM hotel WHERE name=trim(payload->>'hotel_name') LIMIT 1; IF hot IS NULL THEN INSERT INTO hotel(name) VALUES(trim(payload->>'hotel_name')) RETURNING id INTO hot; END IF;
SELECT id INTO cust FROM customer WHERE name=trim(payload->>'customer_name') LIMIT 1; IF cust IS NULL THEN INSERT INTO customer(name) VALUES(trim(payload->>'customer_name')) RETURNING id INTO cust; END IF;
SELECT id INTO ctr FROM contract WHERE name=trim(payload->>'contract_name') LIMIT 1; IF ctr IS NULL THEN INSERT INTO contract(name) VALUES(trim(payload->>'contract_name')) RETURNING id INTO ctr; END IF;
IF payload->>'id' IS NOT NULL THEN
SELECT * INTO sub FROM service_subscription WHERE id=(payload->>'id')::uuid FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Subscription missing'; END IF;
IF sub.status='TERMINATED' THEN RAISE EXCEPTION 'Subscription terminated'; END IF;
UPDATE service_subscription SET hotel_id=hot,customer_id=cust,contract_id=ctr,service_line=(payload->>'service_line')::service_line,service_variant=(payload->>'service_variant')::service_variant,monthly_fee=(payload->>'monthly_fee')::numeric,billing_day=(payload->>'billing_day')::int,due_day=(payload->>'due_day')::int,billing_start_date=(payload->>'billing_start_date')::date,orm_team_id=nullif(payload->>'orm_team_id','')::uuid,marcom_member_id=nullif(payload->>'marcom_member_id','')::uuid WHERE id=sub.id RETURNING id INTO result;
ELSE INSERT INTO service_subscription(hotel_id,customer_id,contract_id,service_line,service_variant,monthly_fee,billing_day,due_day,billing_start_date,orm_team_id,marcom_member_id) VALUES(hot,cust,ctr,(payload->>'service_line')::service_line,(payload->>'service_variant')::service_variant,(payload->>'monthly_fee')::numeric,(payload->>'billing_day')::int,(payload->>'due_day')::int,(payload->>'billing_start_date')::date,nullif(payload->>'orm_team_id','')::uuid,nullif(payload->>'marcom_member_id','')::uuid) RETURNING id INTO result; END IF;
ELSIF action='subscription_status' THEN
SELECT * INTO sub FROM service_subscription WHERE id=(payload->>'id')::uuid FOR UPDATE; IF NOT FOUND OR sub.status='TERMINATED' THEN RAISE EXCEPTION 'Subscription unavailable'; END IF;
IF payload->>'status' NOT IN ('ACTIVE','PAUSED','TERMINATED') THEN RAISE EXCEPTION 'Invalid subscription action'; END IF;
IF sub.status='SUSPENDED' AND payload->>'status'<>'TERMINATED' THEN RAISE EXCEPTION 'Use collection reactivation after settlement'; END IF;
UPDATE service_subscription SET status=(payload->>'status')::subscription_status WHERE id=sub.id RETURNING id INTO result;
ELSIF action='invoice' THEN
SELECT * INTO sub FROM service_subscription WHERE id=(payload->>'subscription_id')::uuid; IF NOT FOUND THEN RAISE EXCEPTION 'Subscription missing'; END IF;
PERFORM 1 FROM customer WHERE id=sub.customer_id FOR UPDATE;
IF payload->>'invoice_type' NOT IN ('SETUP','SYSTEM_FEE') THEN RAISE EXCEPTION 'Only manual setup/system fee'; END IF;
INSERT INTO invoice(subscription_id,hotel_id,customer_id,service_line,invoice_type,billing_period,customer_segment,issue_date,due_date,amount,cadence) VALUES(sub.id,sub.hotel_id,sub.customer_id,sub.service_line,(payload->>'invoice_type')::invoice_type,CASE WHEN payload->>'invoice_type'='SYSTEM_FEE' THEN nullif(payload->>'billing_period','')::date ELSE NULL END,CASE WHEN payload->>'invoice_type'='SETUP' AND NOT EXISTS(SELECT 1 FROM invoice WHERE customer_id=sub.customer_id) THEN 'NEW' ELSE 'EXISTING' END::customer_segment,(payload->>'issue_date')::date,(payload->>'due_date')::date,(payload->>'amount')::numeric,CASE WHEN payload->>'invoice_type'='SYSTEM_FEE' THEN payload->>'cadence' ELSE NULL END) RETURNING id INTO result;
PERFORM ac_recompute();
ELSIF action='payment' THEN
SELECT * INTO inv FROM invoice WHERE id=(payload->>'invoice_id')::uuid FOR UPDATE;
IF NOT FOUND OR inv.status IN ('PAID','VOID','WRITTEN_OFF') THEN RAISE EXCEPTION 'Invoice closed or missing'; END IF;
IF (payload->>'gateway_paid_date')::date>(now() AT TIME ZONE 'Asia/Bangkok')::date THEN RAISE EXCEPTION 'Future payment date'; END IF;
INSERT INTO payment(invoice_id,gateway_paid_date,amount,method,recorded_by) VALUES(inv.id,(payload->>'gateway_paid_date')::date,(payload->>'amount')::numeric,payload->>'method',actor) RETURNING id INTO result;
ELSIF action='collection' THEN
cust:=(payload->>'customer_id')::uuid; PERFORM 1 FROM customer WHERE id=cust FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Customer missing'; END IF;
SELECT outstanding INTO debt FROM ac_collection_current WHERE customer_id=cust;
event:=(payload->>'event')::collection_event_type;
IF event NOT IN ('LEGAL_FILED','WRITTEN_OFF','SUSPENDED','REACTIVATED') THEN RAISE EXCEPTION 'Invalid collection action'; END IF;
IF event='REACTIVATED' AND debt>0 THEN RAISE EXCEPTION 'Settle all outstanding invoices before reactivation'; END IF;
IF event<>'REACTIVATED' AND debt<=0 THEN RAISE EXCEPTION 'No outstanding balance'; END IF;
IF event='SUSPENDED' THEN UPDATE service_subscription SET status='SUSPENDED' WHERE customer_id=cust AND status='ACTIVE'; END IF;
IF event='REACTIVATED' THEN UPDATE service_subscription SET status='ACTIVE' WHERE customer_id=cust AND status='SUSPENDED'; END IF;
IF event='WRITTEN_OFF' THEN UPDATE invoice SET status='WRITTEN_OFF' WHERE customer_id=cust AND status IN ('ISSUED','PARTIALLY_PAID','OVERDUE'); END IF;
SELECT hotel_id INTO hot FROM invoice WHERE customer_id=cust ORDER BY created_at LIMIT 1;
INSERT INTO collection_event(hotel_id,customer_id,event_type,by_member,amount_outstanding,note) VALUES(hot,cust,event,actor,debt,payload->>'note') RETURNING id INTO result;
PERFORM ac_recompute();
ELSE RAISE EXCEPTION 'Unknown action'; END IF; RETURN result; END$$;
REVOKE ALL ON FUNCTION public.ac_operate(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.ac_operate(jsonb) TO authenticated,service_role;