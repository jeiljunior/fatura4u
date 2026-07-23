-- Cobrança recorrente: cadastrada uma vez pelo tenant, o cron diário
-- (/api/cron/cobrancas-recorrentes) gera a cobrança real automaticamente no
-- dia de vencimento, reaproveitando a mesma lógica da cobrança manual
-- (lib/faturamento/cobranca.ts).
create table if not exists public.recurring_charges (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  valor_cents int not null,
  billing_type text not null check (billing_type in ('pix', 'boleto', 'cartao')),
  description text,
  -- Limitado a 28 pra existir em todo mês (inclusive fevereiro), sem precisar
  -- de lógica de "clamp" pro último dia do mês.
  due_day smallint not null check (due_day between 1 and 28),
  active boolean not null default true,
  next_due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_charges_business on public.recurring_charges (business_id, created_at desc);
create index if not exists idx_recurring_charges_due on public.recurring_charges (next_due_date) where active;

-- Rastreia qual cobrança recorrente gerou cada charge. on delete set null
-- pra excluir a recorrência não apagar o histórico de cobranças já geradas.
alter table public.charges
  add column if not exists recurring_charge_id uuid references public.recurring_charges(id) on delete set null;

create trigger trg_recurring_charges_updated_at
  before update on public.recurring_charges
  for each row execute function public.set_updated_at();

alter table public.recurring_charges enable row level security;

create policy "tenant vê suas cobranças recorrentes" on public.recurring_charges
  for all using (business_id = public.current_business_id());
