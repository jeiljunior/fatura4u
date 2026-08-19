-- Notas fiscais de produto (NF-e modelo 55 / NFC-e modelo 65) — documento
-- fiscal separado da NFS-e (`invoices`, que é rigidamente 1 serviço por
-- nota). Uma nota de produto pode ter N itens, então aqui é header + child,
-- diferente de `invoices` que grava tudo numa linha só.
create table if not exists public.notas_produto (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  -- Nullable: NFC-e permite venda pra "consumidor não identificado".
  customer_id uuid references public.customers(id) on delete set null,
  charge_id uuid references public.charges(id) on delete set null,
  modelo text not null check (modelo in ('55', '65')),
  serie text not null,
  numero bigint not null,
  -- 'denegada' é um desfecho específico da SEFAZ (ex: CNPJ emitente
  -- irregular) que a NFS-e Nacional não tem equivalente.
  status text not null default 'rascunho'
    check (status in ('rascunho', 'processando', 'autorizada', 'rejeitada', 'denegada', 'cancelada')),
  natureza_operacao text not null default 'Venda de mercadoria',
  ambiente text not null check (ambiente in ('homologacao', 'producao')),
  valor_produtos numeric(12,2) not null,
  valor_icms numeric(12,2),
  valor_total numeric(12,2) not null,
  protocolo_autorizacao text,
  chave_acesso text,
  qrcode_url text,
  xml_url text,
  danfe_url text,
  motivo_rejeicao text,
  cancelada_em timestamptz,
  justificativa_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, modelo, serie, numero)
);

create index if not exists idx_notas_produto_business_created on public.notas_produto (business_id, created_at desc);

alter table public.notas_produto enable row level security;

create policy "tenant vê suas notas de produto" on public.notas_produto
  for all using (business_id = public.current_business_id());

create trigger trg_notas_produto_updated_at
  before update on public.notas_produto
  for each row execute function public.set_updated_at();

-- Itens da nota — snapshotados no momento da emissão (descrição/NCM/CFOP/
-- preço), pra uma edição futura no catálogo de produtos nunca alterar uma
-- nota já emitida. Mesmo princípio que a NFS-e já usa ao gravar
-- codigo_servico/aliquota direto em `invoices` em vez de reler `servicos`.
-- Sem business_id próprio nem policy own — segue o mesmo padrão de
-- charge_reminders (child de charges): RLS via join no pai.
create table if not exists public.notas_produto_itens (
  id uuid primary key default uuid_generate_v4(),
  nota_id uuid not null references public.notas_produto(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  numero_item int not null,
  descricao text not null,
  ncm text not null,
  cfop text not null,
  unidade text not null,
  quantidade numeric(15,4) not null,
  valor_unitario numeric(21,10) not null,
  valor_total numeric(12,2) not null,
  origem_mercadoria text not null,
  icms_situacao_tributaria text not null,
  aliquota_icms numeric(5,2),
  valor_icms numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_notas_produto_itens_nota on public.notas_produto_itens (nota_id);

alter table public.notas_produto_itens enable row level security;

create policy "tenant vê itens das próprias notas de produto" on public.notas_produto_itens
  for select using (
    exists (
      select 1 from public.notas_produto
      where notas_produto.id = notas_produto_itens.nota_id
      and notas_produto.business_id = public.current_business_id()
    )
  );
