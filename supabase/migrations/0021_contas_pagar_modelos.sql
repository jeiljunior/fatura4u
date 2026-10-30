-- Modelos de conta a pagar: cadastrados uma vez em Configurações, depois
-- selecionados ao criar uma nova conta a pagar (preenche descrição/
-- categoria/valor automaticamente, evitando digitar tudo de novo toda vez
-- pra despesas recorrentes tipo aluguel/assinaturas). Mesma feature do
-- AGEND4U, ver módulo Financeiro lá.
create table if not exists public.contas_pagar_modelos (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor_cents int,
  created_at timestamptz not null default now()
);

create index if not exists idx_contas_pagar_modelos_business on public.contas_pagar_modelos (business_id);

alter table public.contas_pagar_modelos enable row level security;

create policy "tenant vê seus modelos de conta a pagar" on public.contas_pagar_modelos
  for all using (business_id = public.current_business_id());
