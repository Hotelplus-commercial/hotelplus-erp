-- Read-only throughput, grouped by event month and hotel/team to retain client assignment filters.
CREATE VIEW public.v_task_flow_monthly WITH (security_invoker = true) AS
WITH events AS (
 SELECT date_trunc('month', created_at AT TIME ZONE 'Asia/Bangkok')::date AS month,
 hotel_id, hotel_name, routed_team, 1::bigint AS created_count, 0::bigint AS closed_count FROM public.ticket
 UNION ALL
 SELECT date_trunc('month', resolved_at AT TIME ZONE 'Asia/Bangkok')::date,
 hotel_id, hotel_name, routed_team, 0::bigint, 1::bigint FROM public.ticket
 WHERE resolved_at IS NOT NULL AND status IN ('resolved', 'closed')
)
SELECT month, hotel_id, hotel_name, routed_team, sum(created_count)::bigint AS created_count,
 sum(closed_count)::bigint AS closed_count FROM events GROUP BY month, hotel_id, hotel_name, routed_team;
GRANT SELECT ON public.v_task_flow_monthly TO anon, authenticated, service_role;
COMMENT ON VIEW public.v_task_flow_monthly IS 'Task v2 PS case created-month and closed-month throughput; caretaker filters applied client-side. No business writes.';
