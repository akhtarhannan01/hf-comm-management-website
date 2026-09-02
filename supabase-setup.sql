-- HF Communication Repair Dashboard
-- Run this entire script in Supabase SQL Editor.

create table if not exists public.repairs (
  id bigint generated always as identity primary key,
  customer_name text not null,
  customer_phone text not null,
  phone_brand text,
  phone_model text,
  repair_issue text,
  estimated_price numeric(12,2) not null default 0,
  promised_date date,
  promised_time time,
  status text not null default 'pending'
    check (status in ('pending','repairing','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.repairs enable row level security;

-- Authenticated users can manage repairs.
-- For a single-owner dashboard, create your login in Supabase Authentication.
drop policy if exists "authenticated users manage repairs" on public.repairs;
create policy "authenticated users manage repairs"
on public.repairs
for all
to authenticated
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists repairs_updated_at on public.repairs;
create trigger repairs_updated_at
before update on public.repairs
for each row execute function public.set_updated_at();
