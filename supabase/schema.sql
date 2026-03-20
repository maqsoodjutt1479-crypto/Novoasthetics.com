-- Nova Aesthetics core schema for Supabase PostgreSQL
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.staff (
  id text primary key,
  name text not null,
  role text not null check (role in ('Doctor', 'Nurse', 'Reception', 'Admin', 'Technician', 'FDO')),
  phone text not null,
  email text not null unique,
  specialty text,
  branch text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id text primary key,
  patient_id text,
  patient text not null,
  phone text not null,
  doctor text not null,
  datetime text not null,
  service text not null,
  appt_type text not null default 'Consultation',
  centre text not null default 'BRFSD',
  status text not null default 'Pending'
    check (status in ('Pending', 'Coming Soon', 'Arrived', 'Delayed', 'Confirmed', 'Cancelled')),
  amount numeric(12,2) not null default 0,
  discount text not null default '0%',
  notes text not null default '-',
  payment_status text not null default 'Unpaid' check (payment_status in ('Paid', 'Partial', 'Unpaid')),
  payment_method text default 'CASH' check (payment_method in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  created_at timestamptz not null default now(),
  follow_up_for_id text
);

create index if not exists idx_appointments_datetime on public.appointments (datetime);
create index if not exists idx_appointments_doctor on public.appointments (doctor);

create table if not exists public.clinical_services (
  id text primary key,
  category text not null,
  name text not null,
  code text not null,
  duration int not null default 30,
  color text not null default '#0ea5e9',
  price numeric(12,2) not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key,
  date text not null,
  patient_id text not null,
  patient_name text not null,
  method text not null check (method in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  amount numeric(12,2) not null default 0,
  discount text,
  notes text,
  cash numeric(12,2) not null default 0,
  card numeric(12,2) not null default 0,
  bank numeric(12,2) not null default 0,
  other numeric(12,2) not null default 0,
  source text not null default 'appointment',
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_date on public.payments (date);
create index if not exists idx_payments_patient_id on public.payments (patient_id);
alter table public.payments add column if not exists notes text;

create table if not exists public.products (
  id text primary key,
  name text not null unique,
  price numeric(12,2) not null default 0,
  stock int not null default 0,
  sold int not null default 0,
  notify boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_orders (
  id text primary key,
  patient text not null,
  patient_id text,
  products text not null,
  qty int not null default 1,
  unit_price numeric(12,2) not null default 0,
  items jsonb,
  location text not null default 'Main Branch',
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  method text not null check (method in ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  status text not null default 'Pending' check (status in ('Pending', 'Paid', 'Partial', 'Cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_orders_created_at on public.product_orders (created_at);
create index if not exists idx_product_orders_patient on public.product_orders (patient);

create table if not exists public.package_assignments (
  id text primary key,
  package_name text not null,
  patient_name text not null,
  phone text not null,
  appointment_id text,
  assigned_at timestamptz not null default now()
);

create index if not exists idx_package_assignments_assigned_at on public.package_assignments (assigned_at);

create table if not exists public.packages (
  id text primary key,
  name text not null unique,
  services jsonb not null default '[]'::jsonb,
  price text not null,
  duration text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_packages_name on public.packages (name);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff'
    ) then
      execute 'alter publication supabase_realtime add table public.staff';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
    ) then
      execute 'alter publication supabase_realtime add table public.appointments';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clinical_services'
    ) then
      execute 'alter publication supabase_realtime add table public.clinical_services';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
    ) then
      execute 'alter publication supabase_realtime add table public.payments';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
    ) then
      execute 'alter publication supabase_realtime add table public.products';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_orders'
    ) then
      execute 'alter publication supabase_realtime add table public.product_orders';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'package_assignments'
    ) then
      execute 'alter publication supabase_realtime add table public.package_assignments';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'packages'
    ) then
      execute 'alter publication supabase_realtime add table public.packages';
    end if;
  end if;
end
$$;

alter table public.staff enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_services enable row level security;
alter table public.payments enable row level security;
alter table public.products enable row level security;
alter table public.product_orders enable row level security;
alter table public.package_assignments enable row level security;
alter table public.packages enable row level security;

drop policy if exists staff_open_access on public.staff;
create policy staff_open_access on public.staff
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists appointments_open_access on public.appointments;
create policy appointments_open_access on public.appointments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists clinical_services_open_access on public.clinical_services;
create policy clinical_services_open_access on public.clinical_services
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists payments_open_access on public.payments;
create policy payments_open_access on public.payments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists products_open_access on public.products;
create policy products_open_access on public.products
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists product_orders_open_access on public.product_orders;
create policy product_orders_open_access on public.product_orders
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists package_assignments_open_access on public.package_assignments;
create policy package_assignments_open_access on public.package_assignments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists packages_open_access on public.packages;
create policy packages_open_access on public.packages
  for all
  to anon, authenticated
  using (true)
  with check (true);
