-- Vincula um cliente do tenant (public.customers) ao "customer" correspondente
-- criado do lado do gateway de pagamento (ex: Asaas), evitando recriar/duplicar
-- esse cadastro a cada cobrança nova.
create table if not exists public.gateway_customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider text not null check (provider in ('asaas', 'stripe', 'pagarme', 'mercadopago')),
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  unique (customer_id, provider)
);

create index if not exists idx_gateway_customers_business on public.gateway_customers (business_id);

alter table public.gateway_customers enable row level security;

create policy "tenant vê seus vínculos de cliente no gateway" on public.gateway_customers
  for all using (business_id = public.current_business_id());
