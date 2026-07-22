-- Campos adicionais de faturamento_config exigidos pelo schema da DPS
-- (Declaração de Prestação de Serviço) da NFS-e Nacional: município (código
-- IBGE) onde o serviço é prestado, série do documento, e código NBS
-- (Nomenclatura Brasileira de Serviços).
alter table public.faturamento_config
  add column if not exists municipio_ibge text,
  add column if not exists serie_dps text not null default '1',
  add column if not exists codigo_nbs text;

-- Numeração sequencial da DPS, controlada por nós (não pela ADN) — obrigatória
-- por emissor+série, nunca pode ter buraco/duplicata.
create table if not exists public.dps_sequencial (
  business_id uuid not null references public.businesses(id) on delete cascade,
  serie text not null,
  ultimo_numero bigint not null default 0,
  primary key (business_id, serie)
);

alter table public.dps_sequencial enable row level security;

create policy "tenant vê seu sequencial de DPS" on public.dps_sequencial
  for all using (business_id = public.current_business_id());

-- Incrementa e devolve o próximo número, atômico mesmo com chamadas
-- concorrentes (upsert + increment em uma única instrução).
create or replace function public.proximo_numero_dps(p_business_id uuid, p_serie text)
returns bigint
language plpgsql
security definer
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
