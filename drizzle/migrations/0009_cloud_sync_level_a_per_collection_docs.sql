ALTER TABLE public.crm_documents DROP CONSTRAINT crm_documents_namespace_check;
ALTER TABLE public.crm_documents ADD CONSTRAINT crm_documents_namespace_check CHECK (namespace = ANY (ARRAY['crm','hotels','ws2','crm:customers','crm:invoices','crm:contracts','crm:products','crm:reports','crm:taxReceipts','crm:deals','crm:quotations','crm:templates','crm:invRequests','crm:liveLinks','crm:gradeRecords','crm:collectionEvents','crm:billingWaiting','crm:audit']));
COMMENT ON TABLE public.crm_documents IS 'Level A cloud mirror: one row per doc key (namespace = crm:<collection> | hotels | ws2). Browser is source of truth; push-only. Legacy namespace crm is DEPRECATED.';
CREATE OR REPLACE FUNCTION public.crm_force_push(p_namespace text, p_payload jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE r bigint; BEGIN INSERT INTO crm_documents(namespace,payload) VALUES(p_namespace,p_payload) ON CONFLICT (namespace) DO UPDATE SET payload=EXCLUDED.payload, revision=crm_documents.revision+1, updated_at=now() RETURNING revision INTO r; RETURN r; END $$;
REVOKE ALL ON FUNCTION public.crm_force_push(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_force_push(text,jsonb) TO service_role;
CREATE OR REPLACE VIEW public.ac_invoice_attributed WITH (security_invoker=true) AS WITH raw AS (
         SELECT i.value AS i,
            d.payload
           FROM (crm_documents d
             CROSS JOIN LATERAL jsonb_array_elements(COALESCE((d.payload -> 'items'::text), '[]'::jsonb)) i(value))
          WHERE ((d.namespace = 'crm:invoices'::text) AND (NULLIF((i.value ->> 'hotel_id'::text), ''::text) IS NOT NULL) AND ((i.value ->> 'service_line'::text) = ANY (ARRAY['ORM'::text, 'Marcom'::text])))
        ), projected AS (
         SELECT r.i,
            r.payload,
            o.orm_owner,
            o.marcom_owner,
            ( SELECT
                        CASE
                            WHEN ((e.value ->> 'event_type'::text) = 'REACTIVATED'::text) THEN 'NORMAL'::text
                            ELSE (e.value ->> 'event_type'::text)
                        END AS "case"
                   FROM jsonb_array_elements(COALESCE((SELECT c.payload -> 'items'::text FROM crm_documents c WHERE c.namespace = 'crm:collectionEvents'::text), '[]'::jsonb)) WITH ORDINALITY e(value, n)
                  WHERE ((e.value ->> 'customer_id'::text) = (r.i #>> '{customer_snapshot,customer_id}'::text[]))
                  ORDER BY e.n
                 LIMIT 1) AS collection
           FROM (raw r
             LEFT JOIN LATERAL ( SELECT
                        CASE
                            WHEN (count(DISTINCT NULLIF((p.value ->> 'orm_team'::text), ''::text)) = 1) THEN min(NULLIF((p.value ->> 'orm_team'::text), ''::text))
                            ELSE NULL::text
                        END AS orm_owner,
                        CASE
                            WHEN (count(DISTINCT NULLIF((p.value ->> 'marcom_member_id'::text), ''::text)) = 1) THEN min(NULLIF((p.value ->> 'marcom_member_id'::text), ''::text))
                            ELSE NULL::text
                        END AS marcom_owner
                   FROM (crm_documents w
                     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((w.payload -> 'profiles'::text), '[]'::jsonb)) p(value))
                  WHERE ((w.namespace = 'ws2'::text) AND ((p.value ->> 'property_id'::text) = (r.i ->> 'hotel_id'::text)) AND ((((r.i ->> 'service_line'::text) = 'ORM'::text) AND ((p.value ->> 'service'::text) = 'ORM'::text)) OR (((r.i ->> 'service_line'::text) = 'Marcom'::text) AND ((p.value ->> 'service'::text) = ANY (ARRAY['MARCOM_MT'::text, 'MARCOM_GMB'::text])))))) o ON (true))
        )
 SELECT (md5((i ->> 'invoice_id'::text)))::uuid AS id,
    NULL::uuid AS subscription_id,
        CASE
            WHEN ((i ->> 'hotel_id'::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) THEN ((i ->> 'hotel_id'::text))::uuid
            ELSE (md5((i ->> 'hotel_id'::text)))::uuid
        END AS hotel_id,
    (md5((i #>> '{customer_snapshot,customer_id}'::text[])))::uuid AS customer_id,
    ((i ->> 'service_line'::text))::service_line AS service_line,
    ((i ->> 'invoice_type'::text))::invoice_type AS invoice_type,
    (date_trunc('month'::text, ((i ->> 'billing_period_start'::text))::timestamp with time zone))::date AS billing_period,
    ((i ->> 'customer_segment'::text))::customer_segment AS customer_segment,
    (NULLIF((i ->> 'issue_date'::text), ''::text))::date AS issue_date,
    (NULLIF((i ->> 'due_date'::text), ''::text))::date AS due_date,
    ((i #>> '{totals,total}'::text[]))::numeric(12,2) AS amount,
    (COALESCE(((i ->> 'paid_amount'::text))::numeric,
        CASE
            WHEN ((i ->> 'status'::text) = 'paid'::text) THEN ((i #>> '{totals,total}'::text[]))::numeric
            ELSE (0)::numeric
        END))::numeric(12,2) AS paid_amount,
    (NULLIF((i ->> 'settled_date'::text), ''::text))::date AS settled_date,
    ((NULLIF((i ->> 'gateway_paid_at'::text), ''::text))::timestamp with time zone)::date AS gateway_paid_date,
    NULL::text AS tax_receipt_no,
    (
        CASE (i ->> 'status'::text)
            WHEN 'paid'::text THEN 'PAID'::text
            WHEN 'partially_paid'::text THEN 'PARTIALLY_PAID'::text
            WHEN 'void'::text THEN 'VOID'::text
            WHEN 'written_off'::text THEN 'WRITTEN_OFF'::text
            ELSE 'ISSUED'::text
        END)::invoice_status AS status,
    NULL::text AS cadence,
    ((i ->> 'created_at'::text))::timestamp with time zone AS created_at,
        CASE
            WHEN (((i ->> 'service_line'::text) = 'ORM'::text) AND (orm_owner IS NOT NULL)) THEN (md5(orm_owner))::uuid
            ELSE NULL::uuid
        END AS orm_team_id,
        CASE
            WHEN (((i ->> 'service_line'::text) = 'Marcom'::text) AND (marcom_owner IS NOT NULL)) THEN (md5(marcom_owner))::uuid
            ELSE NULL::uuid
        END AS marcom_member_id,
    (i #>> '{customer_snapshot,hotel_name}'::text[]) AS hotel_name,
    (i #>> '{customer_snapshot,legal_name}'::text[]) AS customer_name,
    (i ->> 'invoice_id'::text) AS original_invoice_id,
    (i #>> '{customer_snapshot,customer_id}'::text[]) AS original_customer_id,
    (i ->> 'status'::text) AS canonical_status,
    COALESCE(collection, 'NORMAL'::text) AS collection_status
   FROM projected;
CREATE OR REPLACE VIEW public.v_ac_grade_distribution WITH (security_invoker=true) AS SELECT ((g.value ->> 'billing_period'::text))::date AS billing_period,
    ((g.value ->> 'grade'::text))::payment_grade AS grade,
    i.service_line,
    i.orm_team_id,
    i.marcom_member_id,
    count(DISTINCT i.customer_id) AS customer_count
   FROM ((crm_documents d
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE((d.payload -> 'items'::text), '[]'::jsonb)) g(value))
     JOIN ac_invoice_attributed i ON (((i.original_customer_id = (g.value ->> 'customer_id'::text)) AND (i.billing_period = ((g.value ->> 'billing_period'::text))::date) AND (COALESCE((g.value -> 'basis'::text), '[]'::jsonb) ? i.original_invoice_id))))
  WHERE ((d.namespace = 'crm:gradeRecords'::text) AND (i.invoice_type = 'RECURRING'::invoice_type) AND (i.due_date IS NOT NULL) AND (i.canonical_status <> ALL (ARRAY['draft'::text, 'void'::text, 'written_off'::text])))
  GROUP BY ((g.value ->> 'billing_period'::text))::date, ((g.value ->> 'grade'::text))::payment_grade, i.service_line, i.orm_team_id, i.marcom_member_id;