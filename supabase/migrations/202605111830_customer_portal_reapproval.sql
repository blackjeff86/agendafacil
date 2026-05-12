alter table public.customers drop constraint if exists customers_business_id_phone_key;
alter table public.customers drop constraint if exists customers_business_id_name_phone_key;
alter table public.customers
  add constraint customers_business_id_name_phone_key
  unique (business_id, name, phone);

alter table public.appointments
  add column if not exists client_reapproval_required boolean default false;

create or replace function public.create_public_booking(
  p_business_id uuid,
  p_service_id uuid,
  p_professional_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_client_notes text,
  p_appointment_date date,
  p_appointment_time time,
  p_recurrence_type text default null,
  p_occurrences int default 1
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_series_id uuid;
  v_appointment_id uuid;
  v_count int := greatest(coalesce(p_occurrences, 1), 1);
  v_occurrence_date date;
  v_ids uuid[] := '{}';
  v_business_active boolean;
begin
  select active into v_business_active
  from public.businesses
  where id = p_business_id;

  if coalesce(v_business_active, false) = false then
    raise exception 'Negocio indisponivel para agendamento.';
  end if;

  insert into public.customers (business_id, name, email, phone, notes, last_booking_at, updated_at)
  values (p_business_id, p_client_name, nullif(trim(p_client_email), ''), p_client_phone, nullif(trim(p_client_notes), ''), now(), now())
  on conflict (business_id, name, phone) do update
    set email = coalesce(excluded.email, public.customers.email),
        notes = coalesce(excluded.notes, public.customers.notes),
        last_booking_at = now(),
        updated_at = now()
  returning id into v_customer_id;

  if coalesce(nullif(trim(p_recurrence_type), ''), 'none') not in ('none', 'weekly', 'twice_weekly', 'monthly') then
    raise exception 'Tipo de recorrencia invalido.';
  end if;

  if coalesce(nullif(trim(p_recurrence_type), ''), 'none') <> 'none' then
    if v_count < 2 then
      raise exception 'Agendamento recorrente precisa de pelo menos 2 ocorrencias.';
    end if;

    insert into public.appointment_series (
      business_id,
      customer_id,
      service_id,
      professional_id,
      start_date,
      appointment_time,
      recurrence_type,
      occurrences,
      notes,
      active
    ) values (
      p_business_id,
      v_customer_id,
      p_service_id,
      p_professional_id,
      p_appointment_date,
      p_appointment_time,
      p_recurrence_type,
      v_count,
      nullif(trim(p_client_notes), ''),
      true
    )
    returning id into v_series_id;
  end if;

  for i in 1..v_count loop
    v_occurrence_date := case
      when v_series_id is null then p_appointment_date
      else public.compute_recurrence_date(p_appointment_date, p_recurrence_type, i)
    end;

    insert into public.appointments (
      business_id,
      customer_id,
      series_id,
      service_id,
      professional_id,
      client_name,
      client_email,
      client_phone,
      client_notes,
      appointment_date,
      appointment_time,
      occurrence_index,
      status
    ) values (
      p_business_id,
      v_customer_id,
      v_series_id,
      p_service_id,
      p_professional_id,
      p_client_name,
      nullif(trim(p_client_email), ''),
      p_client_phone,
      nullif(trim(p_client_notes), ''),
      v_occurrence_date,
      p_appointment_time,
      i,
      'pendente'
    )
    returning id into v_appointment_id;

    v_ids := array_append(v_ids, v_appointment_id);
  end loop;

  return jsonb_build_object(
    'series_id', v_series_id,
    'customer_id', v_customer_id,
    'appointment_ids', v_ids,
    'occurrences', v_count
  );
end;
$$;

grant execute on function public.create_public_booking(uuid, uuid, uuid, text, text, text, text, date, time, text, int) to anon, authenticated;

create or replace function public.get_customer_portal(
  p_portal_token text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_business public.businesses%rowtype;
begin
  select *
    into v_customer
  from public.customers
  where portal_token = p_portal_token;

  if v_customer.id is null then
    raise exception 'Área do cliente não encontrada.';
  end if;

  select *
    into v_business
  from public.businesses
  where id = v_customer.business_id
    and active = true;

  if v_business.id is null then
    raise exception 'Negócio indisponível.';
  end if;

  return jsonb_build_object(
    'business', to_jsonb(v_business),
    'customer', to_jsonb(v_customer),
    'appointments', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.appointment_date asc, a.appointment_time asc)
      from public.appointments a
      where a.business_id = v_customer.business_id
        and regexp_replace(lower(coalesce(a.client_name, '')), '[^a-z0-9]', '', 'g')
            = regexp_replace(lower(coalesce(v_customer.name, '')), '[^a-z0-9]', '', 'g')
        and regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g')
            = regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g')
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at asc)
      from public.services s
      where s.business_id = v_customer.business_id
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at asc)
      from public.professionals p
      where p.business_id = v_customer.business_id
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(to_jsonb(h) order by h.day_of_week asc)
      from public.business_hours h
      where h.business_id = v_customer.business_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_customer_portal(text) to anon, authenticated;

create or replace function public.reschedule_customer_portal_appointment(
  p_portal_token text,
  p_appointment_id uuid,
  p_appointment_date date,
  p_appointment_time time
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_business public.businesses%rowtype;
  v_appointment public.appointments%rowtype;
begin
  select *
    into v_customer
  from public.customers
  where portal_token = p_portal_token;

  if v_customer.id is null then
    raise exception 'Área do cliente não encontrada.';
  end if;

  select *
    into v_business
  from public.businesses
  where id = v_customer.business_id
    and active = true;

  if v_business.id is null then
    raise exception 'Negócio indisponível.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = p_appointment_id
    and business_id = v_customer.business_id
    and regexp_replace(lower(coalesce(client_name, '')), '[^a-z0-9]', '', 'g')
        = regexp_replace(lower(coalesce(v_customer.name, '')), '[^a-z0-9]', '', 'g')
    and regexp_replace(coalesce(client_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g');

  if v_appointment.id is null then
    raise exception 'Agendamento não encontrado.';
  end if;

  if v_appointment.status in ('cancelado', 'concluido') then
    raise exception 'Esse agendamento não pode mais ser reagendado.';
  end if;

  update public.appointments
     set appointment_date = p_appointment_date,
         appointment_time = p_appointment_time,
         status = 'pendente',
         client_reapproval_required = false,
         reminder_sent_at = null
   where id = v_appointment.id
   returning * into v_appointment;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment)
  );
end;
$$;

grant execute on function public.reschedule_customer_portal_appointment(text, uuid, date, time) to anon, authenticated;

create or replace function public.approve_customer_portal_appointment(
  p_portal_token text,
  p_appointment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_business public.businesses%rowtype;
  v_appointment public.appointments%rowtype;
begin
  select *
    into v_customer
  from public.customers
  where portal_token = p_portal_token;

  if v_customer.id is null then
    raise exception 'Área do cliente não encontrada.';
  end if;

  select *
    into v_business
  from public.businesses
  where id = v_customer.business_id
    and active = true;

  if v_business.id is null then
    raise exception 'Negócio indisponível.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = p_appointment_id
    and business_id = v_customer.business_id
    and regexp_replace(lower(coalesce(client_name, '')), '[^a-z0-9]', '', 'g')
        = regexp_replace(lower(coalesce(v_customer.name, '')), '[^a-z0-9]', '', 'g')
    and regexp_replace(coalesce(client_phone, ''), '\D', '', 'g')
        = regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g');

  if v_appointment.id is null then
    raise exception 'Agendamento não encontrado.';
  end if;

  if v_appointment.status in ('cancelado', 'concluido') then
    raise exception 'Esse agendamento não pode ser aprovado.';
  end if;

  update public.appointments
     set status = 'confirmado',
         client_reapproval_required = false,
         reminder_sent_at = null
   where id = v_appointment.id
   returning * into v_appointment;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment)
  );
end;
$$;

grant execute on function public.approve_customer_portal_appointment(text, uuid) to anon, authenticated;
