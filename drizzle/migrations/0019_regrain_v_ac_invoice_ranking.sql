drop view public.v_ac_invoice_ranking;
create view public.v_ac_invoice_ranking as
with inv as (
  select i.billing_period, i.hotel_id, i.hotel_name, i.service_line::text as service_line,
         i.orm_team_id, i.marcom_member_id, i.amount
  from public.ac_invoice_attributed i
  where i.invoice_type = 'RECURRING'
    and i.status::text not in ('draft','void','written_off')
    and i.hotel_id is not null and i.service_line is not null
),
periods as (select distinct billing_period from inv),
active as (
  select distinct p.billing_period, c.hotel_id::uuid as hotel_id, c.service_line
  from periods p
  join public.v_ps_contract_lifetime c
    on c.status = 'ACTIVE'
   and (c.end_date is null or c.end_date >= p.billing_period)
   and c.hotel_id ~ '^[0-9a-fA-F-]{36}$'
),
per_service as (
  select billing_period, hotel_id, max(hotel_name) as hotel_name, service_line,
         sum(amount) as amount_thb, count(*) as invoice_count,
         (array_agg(orm_team_id))[1] as orm_team_id, (array_agg(marcom_member_id))[1] as marcom_member_id
  from inv group by 1,2,4
),
lens_rows as (
  select billing_period, hotel_id, hotel_name, 'ALL'::text as lens,
         sum(amount_thb) as amount_thb,
         coalesce(sum(amount_thb) filter (where service_line = 'ORM'), 0) as orm_thb,
         coalesce(sum(amount_thb) filter (where service_line <> 'ORM'), 0) as marcom_thb,
         sum(invoice_count) as invoice_count,
         (array_agg(orm_team_id))[1] as orm_team_id, (array_agg(marcom_member_id))[1] as marcom_member_id,
         true as has_bill
  from per_service group by 1,2,3
  union all
  select billing_period, hotel_id, hotel_name, upper(service_line), amount_thb,
         case when service_line = 'ORM' then amount_thb else 0 end,
         case when service_line <> 'ORM' then amount_thb else 0 end,
         invoice_count, orm_team_id, marcom_member_id, true
  from per_service
  union all
  select a.billing_period, a.hotel_id, null, 'ALL', 0, 0, 0, 0, null, null, false
  from active a
  where not exists (select 1 from per_service s where s.billing_period = a.billing_period and s.hotel_id = a.hotel_id)
  union all
  select a.billing_period, a.hotel_id, null, upper(a.service_line), 0, 0, 0, 0, null, null, false
  from active a
  where not exists (select 1 from per_service s where s.billing_period = a.billing_period and s.hotel_id = a.hotel_id and s.service_line = a.service_line)
),
ranked as (
  select l.*,
         case when has_bill then rank() over (partition by billing_period, lens order by amount_thb desc, hotel_name asc nulls last, hotel_id) end as rank
  from lens_rows l
)
select r.billing_period, r.hotel_id, r.hotel_name, r.lens,
       r.amount_thb, r.orm_thb, r.marcom_thb, r.invoice_count,
       r.rank, p.rank as prev_rank,
       case
         when count(r.rank) over (partition by r.hotel_id, r.lens order by r.billing_period rows between 11 preceding and current row) >= 2
         then avg(r.rank) over (partition by r.hotel_id, r.lens order by r.billing_period rows between 11 preceding and current row)
       end as avg_rank,
       r.has_bill, r.orm_team_id, r.marcom_member_id
from ranked r
left join ranked p
  on p.hotel_id = r.hotel_id and p.lens = r.lens
 and p.billing_period = (r.billing_period - interval '1 month')::date;