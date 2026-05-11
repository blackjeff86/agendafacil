alter table public.professionals add column if not exists day_off_weekday int;
alter table public.professionals add column if not exists vacation_start date;
alter table public.professionals add column if not exists vacation_end date;
alter table public.professionals add column if not exists lunch_start time;
alter table public.professionals add column if not exists lunch_end time;

alter table public.professionals
  drop constraint if exists professionals_day_off_weekday_check;

alter table public.professionals
  add constraint professionals_day_off_weekday_check
  check (day_off_weekday is null or day_off_weekday between 0 and 6);

drop function if exists public.is_professional_slot_blocked(uuid, date, time, int);
create or replace function public.is_professional_slot_blocked(
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
  with professional_data as (
    select
      p.day_off_weekday,
      p.vacation_start,
      p.vacation_end,
      p.lunch_start,
      p.lunch_end
    from public.professionals p
    where p.id = p_professional_id
  )
  select exists (
    select 1
    from professional_data pd
    where
      (pd.day_off_weekday is not null and pd.day_off_weekday = extract(dow from p_date)::int)
      or (
        pd.vacation_start is not null
        and pd.vacation_end is not null
        and p_date between pd.vacation_start and pd.vacation_end
      )
      or (
        pd.lunch_start is not null
        and pd.lunch_end is not null
        and (
          (pd.lunch_start, pd.lunch_end) overlaps
          (p_time, (p_time + (greatest(p_duration, 1) || ' minutes')::interval)::time)
        )
      )
  );
$$;

grant execute on function public.is_professional_slot_blocked(uuid, date, time, int) to anon, authenticated;

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
    where public.is_professional_slot_blocked(ep.id, p_date, p_time, ts.duration) is not true
      and not exists (
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
    and public.is_professional_slot_blocked(p.id, p_date, p_time, ts.duration) is not true
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

    if public.is_professional_slot_blocked(new.professional_id, new.appointment_date, new.appointment_time, v_service.duration) then
      raise exception 'Profissional indisponível nesse período.';
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
      into v_assigned
    from public.professionals p
    join public.professional_services ps on ps.professional_id = p.id
    where p.business_id = new.business_id
      and p.active = true
      and ps.service_id = new.service_id
      and public.is_professional_slot_blocked(p.id, new.appointment_date, new.appointment_time, v_service.duration) is not true
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

update public.professionals p
set active = false
from public.businesses b
where p.business_id = b.id
  and b.slug = 'deh-unhas'
  and p.name = 'Ana Souza';
