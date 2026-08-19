-- Numeração sequencial de NF-e/NFC-e, controlada por nós (a SEFAZ não
-- devolve número, o emissor que atribui) — obrigatória por emissor+modelo+
-- série, nunca pode ter buraco/duplicata. Não dá pra reaproveitar
-- dps_sequencial: NF-e (55) e NFC-e (65) têm contadores independentes mesmo
-- que a série tenha o mesmo texto, então a chave inclui `modelo`.
create table if not exists public.nfe_sequencial (
  business_id uuid not null references public.businesses(id) on delete cascade,
  modelo text not null check (modelo in ('55', '65')),
  serie text not null,
  ultimo_numero bigint not null default 0,
  primary key (business_id, modelo, serie)
);

alter table public.nfe_sequencial enable row level security;

create policy "tenant vê seu sequencial de NFe" on public.nfe_sequencial
  for all using (business_id = public.current_business_id());

-- Mesmo padrão atômico de proximo_numero_dps (upsert + increment numa única
-- instrução), hardened igual ao resto das funções desde 0008_hardening_funcoes
-- (search_path fixo, revoke de anon/authenticated — só chamada server-side
-- com service_role na emissão de nota).
create or replace function public.proximo_numero_nfe(p_business_id uuid, p_modelo text, p_serie text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_numero bigint;
begin
  insert into public.nfe_sequencial (business_id, modelo, serie, ultimo_numero)
  values (p_business_id, p_modelo, p_serie, 1)
  on conflict (business_id, modelo, serie)
  do update set ultimo_numero = public.nfe_sequencial.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;

revoke execute on function public.proximo_numero_nfe(uuid, text, text) from public, anon, authenticated;
