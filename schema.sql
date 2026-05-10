-- ============================================================
-- AgendaFácil — Schema Supabase (PostgreSQL)
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- ── Habilitar extensão UUID ──
create extension if not exists "uuid-ossp";

-- ── BUSINESSES ──────────────────────────────────────────────
create table if not exists public.businesses (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  category    text not null default 'Barbearia',
  description text,
  whatsapp    text,
  instagram   text,
  address     text,
  logo_emoji  text default '✂️',
  logo_image_url text,
  cover_image_url text,
  active      boolean default true,
  created_at  timestamptz default now()
);

alter table public.businesses add column if not exists logo_image_url text;
alter table public.businesses add column if not exists cover_image_url text;

-- ── SERVICES ────────────────────────────────────────────────
create table if not exists public.services (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  duration    int not null default 60,  -- minutos
  category    text,
  icon        text default '✂️',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ── PROFESSIONALS ───────────────────────────────────────────
create table if not exists public.professionals (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  role        text,
  emoji       text default '👤',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ── PROFESSIONAL_SERVICES (pivot) ───────────────────────────
create table if not exists public.professional_services (
  professional_id uuid references public.professionals(id) on delete cascade,
  service_id      uuid references public.services(id) on delete cascade,
  primary key (professional_id, service_id)
);

-- ── BUSINESS_HOURS ──────────────────────────────────────────
create table if not exists public.business_hours (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week int not null,  -- 0=Dom … 6=Sáb
  day_name    text not null,
  open_time   time,
  close_time  time,
  active      boolean default true,
  unique (business_id, day_of_week)
);

-- ── APPOINTMENTS ────────────────────────────────────────────
create table if not exists public.appointments (
  id               uuid primary key default uuid_generate_v4(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  service_id       uuid references public.services(id),
  professional_id  uuid references public.professionals(id),
  client_name      text not null,
  client_phone     text not null,
  client_notes     text,
  appointment_date date not null,
  appointment_time time not null,
  status           text not null default 'pendente'
    check (status in ('pendente','confirmado','concluido','cancelado')),
  created_at       timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.businesses       enable row level security;
alter table public.services         enable row level security;
alter table public.professionals    enable row level security;
alter table public.professional_services enable row level security;
alter table public.business_hours   enable row level security;
alter table public.appointments     enable row level security;

drop policy if exists "owner_select_business" on public.businesses;
drop policy if exists "owner_insert_business" on public.businesses;
drop policy if exists "owner_update_business" on public.businesses;
drop policy if exists "owner_delete_business" on public.businesses;
drop policy if exists "public_read_business_by_slug" on public.businesses;
drop policy if exists "owner_manage_services" on public.services;
drop policy if exists "public_read_services" on public.services;
drop policy if exists "owner_manage_professionals" on public.professionals;
drop policy if exists "public_read_professionals" on public.professionals;
drop policy if exists "owner_manage_prof_services" on public.professional_services;
drop policy if exists "public_read_prof_services" on public.professional_services;
drop policy if exists "owner_manage_hours" on public.business_hours;
drop policy if exists "public_read_hours" on public.business_hours;
drop policy if exists "owner_manage_appointments" on public.appointments;
drop policy if exists "public_insert_appointment" on public.appointments;

-- ── BUSINESSES policies ──────────────────────────────────────
create policy "owner_select_business" on public.businesses
  for select using (owner_id = auth.uid());

create policy "owner_insert_business" on public.businesses
  for insert with check (owner_id = auth.uid());

create policy "owner_update_business" on public.businesses
  for update using (owner_id = auth.uid());

create policy "owner_delete_business" on public.businesses
  for delete using (owner_id = auth.uid());

-- ── PUBLIC read for booking page (by slug) ───────────────────
create policy "public_read_business_by_slug" on public.businesses
  for select using (active = true);

-- ── SERVICES policies ────────────────────────────────────────
create policy "owner_manage_services" on public.services
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_read_services" on public.services
  for select using (active = true);

-- ── PROFESSIONALS policies ───────────────────────────────────
create policy "owner_manage_professionals" on public.professionals
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_read_professionals" on public.professionals
  for select using (active = true);

-- ── PROFESSIONAL_SERVICES policies ──────────────────────────
create policy "owner_manage_prof_services" on public.professional_services
  for all using (
    professional_id in (
      select p.id from public.professionals p
      join public.businesses b on b.id = p.business_id
      where b.owner_id = auth.uid()
    )
  );
create policy "public_read_prof_services" on public.professional_services
  for select using (true);

-- ── BUSINESS_HOURS policies ──────────────────────────────────
create policy "owner_manage_hours" on public.business_hours
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_read_hours" on public.business_hours
  for select using (true);

-- ── APPOINTMENTS policies ────────────────────────────────────
create policy "owner_manage_appointments" on public.appointments
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_insert_appointment" on public.appointments
  for insert with check (true);   -- clientes podem inserir

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Verifica disponibilidade de um horário
drop function if exists public.is_slot_available(uuid, uuid, date, time, int);
create or replace function public.is_slot_available(
  p_business_id uuid,
  p_professional_id uuid,
  p_date date,
  p_time time,
  p_duration int
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.appointments a
    join public.services s on s.id = a.service_id
    where a.business_id = p_business_id
      and (p_professional_id is null or a.professional_id = p_professional_id)
      and a.appointment_date = p_date
      and a.status not in ('cancelado')
      and (
        (a.appointment_time, (a.appointment_time + (s.duration || ' minutes')::interval)::time)
        overlaps
        (p_time, (p_time + (p_duration || ' minutes')::interval)::time)
      )
  );
$$;

grant execute on function public.is_slot_available(uuid, uuid, date, time, int) to anon, authenticated;

-- ============================================================
-- DADOS DE EXEMPLO (opcional — remova se não quiser seed)
-- ============================================================
-- Os dados de exemplo são inseridos pelo app após o primeiro cadastro
