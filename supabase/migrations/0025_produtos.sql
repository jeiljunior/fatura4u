-- Catálogo de produtos/mercadorias do tenant, usado na emissão de NF-e/NFC-e
-- (nota de produto, ICMS) — espelha a tabela `servicos` (nota de serviço,
-- ISS) na forma, mas carrega os campos fiscais que só um bem físico precisa:
-- NCM (classificação fiscal), CFOP (natureza da operação), CEST (só produtos
-- sob substituição tributária) e a tributação de ICMS.
create table if not exists public.produtos (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_cents int,
  ncm text,
  cfop text,
  unidade text not null default 'UN',
  cest text,
  -- Origem da mercadoria (tabela do Anexo do Convênio ICMS 38/13):
  -- 0 nacional, 1-8 estrangeira/nacional com conteúdo importado.
  origem_mercadoria text not null default '0'
    check (origem_mercadoria in ('0','1','2','3','4','5','6','7','8')),
  -- CST (regime normal) ou CSOSN (Simples Nacional) — qual dos dois vale é
  -- decidido pelo regime_tributario do tenant na hora de montar o XML, mesmo
  -- padrão que dps.ts já usa pra escolher opSimpNac na NFS-e.
  icms_situacao_tributaria text,
  aliquota_icms numeric(5,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_produtos_business on public.produtos (business_id);

alter table public.produtos enable row level security;

create policy "tenant vê seus produtos" on public.produtos
  for all using (business_id = public.current_business_id());

create trigger trg_produtos_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();
