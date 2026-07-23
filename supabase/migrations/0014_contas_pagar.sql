-- Contas a pagar: despesas do PRÓPRIO tenant (aluguel, fornecedores,
-- impostos, assinaturas...) — o oposto das charges (que são o que o tenant
-- RECEBE dos clientes finais dele). Módulo independente, sem gateway de
-- pagamento nem integração nenhuma — é só controle manual.
create table if not exists public.contas_pagar (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor_cents int not null,
  due_date date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contas_pagar_business on public.contas_pagar (business_id, due_date);

create trigger trg_contas_pagar_updated_at
  before update on public.contas_pagar
  for each row execute function public.set_updated_at();

alter table public.contas_pagar enable row level security;

create policy "tenant vê suas contas a pagar" on public.contas_pagar
  for all using (business_id = public.current_business_id());
