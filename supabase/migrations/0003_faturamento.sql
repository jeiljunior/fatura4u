-- Núcleo do produto: cobrança (PIX/boleto/cartão) e nota fiscal (NFS-e
-- Nacional) que cada tenant emite para os PRÓPRIOS clientes finais, com o
-- CNPJ/CPF e o gateway de pagamento do próprio tenant.
-- Schema idêntico ao módulo Faturamento do AGEND4U (mesmos nomes de coluna),
-- pra reaproveitar lib/faturamento/ quase sem alteração na Fase 3.

-- Configuração fiscal + status de ativação, por tenant
create table if not exists public.faturamento_config (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  active boolean not null default false,
  inscricao_municipal text,
  regime_tributario text check (regime_tributario in ('mei', 'simples', 'normal')),
  codigo_servico_padrao text,
  aliquota_iss_padrao numeric(5,2),
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  credenciamento_status text not null default 'pendente' check (credenciamento_status in ('pendente', 'habilitado', 'erro')),
  certificado_valido_ate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

-- Credenciais do gateway de pagamento do tenant (Asaas/Stripe/Pagar.me/Mercado Pago)
create table if not exists public.gateway_credentials (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null check (provider in ('asaas', 'stripe', 'pagarme', 'mercadopago')),
  credentials jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, provider)
);

-- Cobranças emitidas pelo tenant para os clientes finais dele
create table if not exists public.charges (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider text not null check (provider in ('asaas', 'stripe', 'pagarme', 'mercadopago')),
  provider_charge_id text,
  valor_cents int not null,
  billing_type text check (billing_type in ('pix', 'boleto', 'cartao')),
  status text not null default 'pendente' check (status in ('pendente', 'confirmada', 'recebida', 'vencida', 'cancelada')),
  due_date date,
  paid_at timestamptz,
  pix_qr_code text,
  pix_payload text,
  boleto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_charges_business_created on public.charges (business_id, created_at desc);

-- Notas fiscais (NFS-e Nacional) emitidas pelo tenant para os clientes finais dele
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  charge_id uuid references public.charges(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'processando', 'autorizada', 'rejeitada', 'cancelada')),
  valor_servicos numeric(12,2) not null,
  codigo_servico text,
  aliquota numeric(5,2),
  valor_iss numeric(12,2),
  protocolo_adn text,
  chave_acesso text,
  xml_url text,
  danfse_url text,
  motivo_rejeicao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_business_created on public.invoices (business_id, created_at desc);

-- TRIGGERS -- updated_at automático
create trigger trg_faturamento_config_updated_at
  before update on public.faturamento_config
  for each row execute function public.set_updated_at();

create trigger trg_gateway_credentials_updated_at
  before update on public.gateway_credentials
  for each row execute function public.set_updated_at();

create trigger trg_charges_updated_at
  before update on public.charges
  for each row execute function public.set_updated_at();

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- RLS -- isolamento total por tenant
alter table public.faturamento_config enable row level security;
alter table public.gateway_credentials enable row level security;
alter table public.charges enable row level security;
alter table public.invoices enable row level security;

create policy "tenant vê sua config de faturamento" on public.faturamento_config
  for all using (business_id = public.current_business_id());

create policy "tenant vê suas credenciais de gateway" on public.gateway_credentials
  for all using (business_id = public.current_business_id());

create policy "tenant vê suas cobranças" on public.charges
  for all using (business_id = public.current_business_id());

create policy "tenant vê suas notas fiscais" on public.invoices
  for all using (business_id = public.current_business_id());
