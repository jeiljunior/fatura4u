-- Painel de gestão: configurações globais (planos e valores), comunicados
-- (mala direta) e lista de descadastro. Tudo só pelo servidor (service role):
-- RLS ligado e nenhum privilégio pra anon/authenticated.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create table if not exists public.comunicados (
  id uuid primary key default uuid_generate_v4(),
  assunto text not null default '',
  corpo text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'enviando', 'concluido', 'cancelado')),
  created_by uuid,
  created_at timestamptz not null default now(),
  enviado_em timestamptz
);
alter table public.comunicados enable row level security;
revoke all on public.comunicados from anon, authenticated;

-- Fila de envio: uma linha por destinatário. O envio é feito em lotes
-- pequenos por dia (cron) pra proteger a entregabilidade do domínio.
create table if not exists public.comunicado_envios (
  id uuid primary key default uuid_generate_v4(),
  comunicado_id uuid not null references public.comunicados(id) on delete cascade,
  email text not null,
  status text not null default 'na_fila' check (status in ('na_fila', 'enviado', 'falhou', 'pulado')),
  erro text,
  sent_at timestamptz,
  unique (comunicado_id, email)
);
create index if not exists idx_comunicado_envios_status on public.comunicado_envios (comunicado_id, status);
alter table public.comunicado_envios enable row level security;
revoke all on public.comunicado_envios from anon, authenticated;

-- Quem pediu pra não receber mais comunicados (vale pra todos os comunicados).
create table if not exists public.comunicado_descadastros (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.comunicado_descadastros enable row level security;
revoke all on public.comunicado_descadastros from anon, authenticated;
