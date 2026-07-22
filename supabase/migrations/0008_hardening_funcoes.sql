-- Hardening apontado pelo advisor de segurança do Supabase:
-- 1) search_path fixo nas funções (evita search_path hijacking).
-- 2) proximo_numero_dps só é chamada server-side (service_role, na emissão
--    de nota) — não precisa ser uma RPC pública chamável por anon/authenticated.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.proximo_numero_dps(p_business_id uuid, p_serie text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_numero bigint;
begin
  insert into public.dps_sequencial (business_id, serie, ultimo_numero)
  values (p_business_id, p_serie, 1)
  on conflict (business_id, serie)
  do update set ultimo_numero = public.dps_sequencial.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;

revoke execute on function public.proximo_numero_dps(uuid, text) from public, anon, authenticated;
