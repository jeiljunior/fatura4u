-- Régua de cobrança: lembretes automáticos por WhatsApp e e-mail pros
-- clientes finais do tenant, antes/no dia/depois do vencimento de uma
-- cobrança.

-- Instância Z-API por tenant — provisionada manualmente pelo super admin
-- (mesma lógica do ATEND+ no AGEND4U: cada instância é um número de WhatsApp
-- real, pago por instância, não é self-service pro tenant escolher).
create table if not exists public.whatsapp_config (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  instance text,
  token text,
  phone text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

alter table public.whatsapp_config enable row level security;

create policy "tenant vê sua config de whatsapp" on public.whatsapp_config
  for all using (business_id = public.current_business_id());

create trigger trg_whatsapp_config_updated_at
  before update on public.whatsapp_config
  for each row execute function public.set_updated_at();

-- Liga/desliga os canais de lembrete, controlado pelo próprio tenant
-- (diferente da instância do WhatsApp em si, que é provisionada pelo admin).
alter table public.faturamento_config
  add column if not exists regua_whatsapp_ativa boolean not null default true,
  add column if not exists regua_email_ativa boolean not null default true;

-- Rastreia lembretes já enviados por cobrança, pra nunca mandar duas vezes o
-- mesmo lembrete (ex: cron rodar de novo por retry da Vercel).
create table if not exists public.charge_reminders (
  id uuid primary key default uuid_generate_v4(),
  charge_id uuid not null references public.charges(id) on delete cascade,
  offset_dias smallint not null,
  canal text not null check (canal in ('whatsapp', 'email')),
  sent_at timestamptz not null default now(),
  unique (charge_id, offset_dias, canal)
);

create index if not exists idx_charge_reminders_charge on public.charge_reminders (charge_id);

alter table public.charge_reminders enable row level security;

create policy "tenant vê lembretes das próprias cobranças" on public.charge_reminders
  for select using (
    exists (
      select 1 from public.charges
      where charges.id = charge_reminders.charge_id
      and charges.business_id = public.current_business_id()
    )
  );
