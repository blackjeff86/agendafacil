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
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_read_services" on public.services
  for select using (active = true);

-- ── PROFESSIONALS policies ───────────────────────────────────
create policy "owner_manage_professionals" on public.professionals
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
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
  )
  with check (
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
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_read_hours" on public.business_hours
  for select using (true);

-- ── APPOINTMENTS policies ────────────────────────────────────
create policy "owner_manage_appointments" on public.appointments
  for all using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
create policy "public_insert_appointment" on public.appointments
  for insert with check (
    business_id in (select id from public.businesses where active = true)
  );   -- clientes podem inserir apenas em negocios ativos

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Verifica disponibilidade de um horário
drop function if exists public.is_slot_available(uuid, uuid, uuid, date, time);
create or replace function public.is_slot_available(
  p_business_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_date date,
  p_time time
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with target_service as (
    select id, duration
    from public.services
    where id = p_service_id
      and business_id = p_business_id
      and active = true
  ),
  eligible_professionals as (
    select p.id
    from public.professionals p
    join public.professional_services ps on ps.professional_id = p.id
    join target_service ts on ts.id = ps.service_id
    where p.business_id = p_business_id
      and p.active = true
      and (p_professional_id is null or p.id = p_professional_id)
  )
  select exists (
    select 1
    from eligible_professionals ep
    join target_service ts on true
    where not exists (
      select 1
      from public.appointments a
      join public.services s on s.id = a.service_id
      where a.business_id = p_business_id
        and a.professional_id = ep.id
        and a.appointment_date = p_date
        and a.status not in ('cancelado')
        and (
          (a.appointment_time, (a.appointment_time + (s.duration || ' minutes')::interval)::time)
          overlaps
          (p_time, (p_time + (ts.duration || ' minutes')::interval)::time)
        )
    )
  );
$$;

grant execute on function public.is_slot_available(uuid, uuid, uuid, date, time) to anon, authenticated;

drop function if exists public.assign_available_professional(uuid, uuid, date, time);
create or replace function public.assign_available_professional(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time
) returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with target_service as (
    select id, duration
    from public.services
    where id = p_service_id
      and business_id = p_business_id
      and active = true
  )
  select p.id
  from public.professionals p
  join public.professional_services ps on ps.professional_id = p.id
  join target_service ts on ts.id = ps.service_id
  where p.business_id = p_business_id
    and p.active = true
    and not exists (
      select 1
      from public.appointments a
      join public.services s on s.id = a.service_id
      where a.business_id = p_business_id
        and a.professional_id = p.id
        and a.appointment_date = p_date
        and a.status not in ('cancelado')
        and (
          (a.appointment_time, (a.appointment_time + (s.duration || ' minutes')::interval)::time)
          overlaps
          (p_time, (p_time + (ts.duration || ' minutes')::interval)::time)
        )
    )
  order by p.created_at, p.name
  limit 1;
$$;

grant execute on function public.assign_available_professional(uuid, uuid, date, time) to anon, authenticated;

drop function if exists public.validate_appointment_integrity();
create or replace function public.validate_appointment_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_professional public.professionals%rowtype;
  v_open time;
  v_close time;
  v_active boolean;
  v_day int;
  v_assigned uuid;
  v_conflict_exists boolean;
begin
  select * into v_service
  from public.services
  where id = new.service_id;

  if v_service.id is null then
    raise exception 'Servico invalido.';
  end if;

  if v_service.business_id <> new.business_id then
    raise exception 'Servico nao pertence a este negocio.';
  end if;

  if v_service.active is not true then
    raise exception 'Servico inativo.';
  end if;

  v_day := extract(dow from new.appointment_date);

  select open_time, close_time, active
  into v_open, v_close, v_active
  from public.business_hours
  where business_id = new.business_id
    and day_of_week = v_day;

  if coalesce(v_active, false) is not true then
    raise exception 'O negocio esta fechado nesta data.';
  end if;

  if new.appointment_time < v_open
     or (new.appointment_time + (v_service.duration || ' minutes')::interval)::time > v_close then
    raise exception 'Horario fora do expediente.';
  end if;

  if new.professional_id is not null then
    select * into v_professional
    from public.professionals
    where id = new.professional_id;

    if v_professional.id is null then
      raise exception 'Profissional invalido.';
    end if;

    if v_professional.business_id <> new.business_id then
      raise exception 'Profissional nao pertence a este negocio.';
    end if;

    if v_professional.active is not true then
      raise exception 'Profissional inativo.';
    end if;

    if not exists (
      select 1
      from public.professional_services ps
      where ps.professional_id = new.professional_id
        and ps.service_id = new.service_id
    ) then
      raise exception 'Esse profissional nao executa o servico selecionado.';
    end if;
  else
    select p.id
      into v_assigned;
    from public.professionals p
    join public.professional_services ps on ps.professional_id = p.id
    where p.business_id = new.business_id
      and p.active = true
      and ps.service_id = new.service_id
      and not exists (
        select 1
        from public.appointments a
        join public.services s on s.id = a.service_id
        where a.business_id = new.business_id
          and a.professional_id = p.id
          and a.appointment_date = new.appointment_date
          and a.status not in ('cancelado')
          and (tg_op <> 'UPDATE' or a.id <> new.id)
          and (
            (a.appointment_time, (a.appointment_time + (s.duration || ' minutes')::interval)::time)
            overlaps
            (new.appointment_time, (new.appointment_time + (v_service.duration || ' minutes')::interval)::time)
          )
      )
    order by p.created_at, p.name
    limit 1;

    if v_assigned is null then
      raise exception 'Nao existe profissional disponivel para este horario.';
    end if;

    new.professional_id := v_assigned;
  end if;

  select exists (
    select 1
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.business_id = new.business_id
      and a.professional_id = new.professional_id
      and a.appointment_date = new.appointment_date
      and a.status not in ('cancelado')
      and (tg_op <> 'UPDATE' or a.id <> new.id)
      and (
        (a.appointment_time, (a.appointment_time + (s.duration || ' minutes')::interval)::time)
        overlaps
        (new.appointment_time, (new.appointment_time + (v_service.duration || ' minutes')::interval)::time)
      )
  ) into v_conflict_exists;

  if v_conflict_exists then
    raise exception 'Horario indisponivel para o profissional selecionado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_appointment_integrity on public.appointments;
create trigger trg_validate_appointment_integrity
before insert or update on public.appointments
for each row
execute function public.validate_appointment_integrity();

-- ============================================================
-- DADOS DE EXEMPLO (opcional — remova se não quiser seed)
-- ============================================================
-- Os dados de exemplo são inseridos pelo app após o primeiro cadastro
