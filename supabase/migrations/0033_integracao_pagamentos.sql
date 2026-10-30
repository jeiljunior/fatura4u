-- Integração por API: sistemas externos (ex.: SIGN4U) enviam um pagamento confirmado e o Fatura4U guarda a nota como "a emitir"
-- (rascunho). A pessoa confere e clica em Emitir. Cada empresa (tenant) gera as próprias chaves de integração.

-- Chaves de integração. Só o hash (SHA-256) é guardado: a chave aparece uma única vez, quando é criada.
create table if not exists public.integration_tokens (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_tokens_business on public.integration_tokens (business_id);

alter table public.integration_tokens enable row level security;

create policy "tenant vê suas chaves de integração" on public.integration_tokens
  for all using (business_id = public.current_business_id());

-- Nota que veio de fora: origem (ex.: 'sign4u'), identificador do pagamento na origem (evita duplicar), descrição e data do pagamento.
alter table public.invoices
  add column if not exists origem text,
  add column if not exists origem_ref text,
  add column if not exists descricao_servico text,
  add column if not exists pago_em timestamptz;

create unique index if not exists uq_invoices_origem
  on public.invoices (business_id, origem, origem_ref)
  where origem is not null and origem_ref is not null;
