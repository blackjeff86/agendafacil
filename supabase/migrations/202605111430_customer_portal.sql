alter table public.customers add column if not exists portal_token text;

update public.customers
   set portal_token = replace(gen_random_uuid()::text, '-', '')
 where coalesce(portal_token, '') = '';

alter table public.customers
  alter column portal_token
  set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists idx_customers_portal_token on public.customers(portal_token);

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
        and (
          a.customer_id = v_customer.id
          or regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g')
        )
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
    and (
      customer_id = v_customer.id
      or regexp_replace(coalesce(client_phone, ''), '\D', '', 'g') = regexp_replace(coalesce(v_customer.phone, ''), '\D', '', 'g')
    );

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
         reminder_sent_at = null
   where id = v_appointment.id
   returning * into v_appointment;

  return jsonb_build_object(
    'appointment', to_jsonb(v_appointment)
  );
end;
$$;

grant execute on function public.reschedule_customer_portal_appointment(text, uuid, date, time) to anon, authenticated;
