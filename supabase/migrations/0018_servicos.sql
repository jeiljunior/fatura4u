-- Catálogo de serviços oferecidos pelo tenant. Cada serviço pode ter seu
-- próprio código LC116/alíquota ISS (mais preciso que o padrão único global
-- em faturamento_config, útil pra quem presta mais de um tipo de serviço).
create table if not exists public.servicos (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_cents int,
  codigo_servico text,
  aliquota_iss numeric(5,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_servicos_business on public.servicos (business_id);

alter table public.servicos enable row level security;

create policy "tenant vê seus serviços" on public.servicos
  for all using (business_id = public.current_business_id());

create trigger trg_servicos_updated_at
  before update on public.servicos
  for each row execute function public.set_updated_at();

-- Lembra qual serviço do catálogo gerou a cobrança, pra emissão de nota usar
-- o código/alíquota certos dele em vez do padrão global.
alter table public.charges
  add column if not exists servico_id uuid references public.servicos(id) on delete set null;
