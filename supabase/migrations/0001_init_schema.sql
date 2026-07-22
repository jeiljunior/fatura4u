-- Fatura4U -- Schema inicial multi-tenant
-- Convencao: toda tabela "de dados" tem business_id e e protegida por RLS.
-- Baseado no schema do AGEND4U (public.businesses/profiles/customers), sem
-- as tabelas de agenda (services/professionals/availability/appointments),
-- que nao fazem parte deste produto.

create extension if not exists "uuid-ossp";

-- 1. BUSINESSES (tenant)
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.businesses is 'Cada linha e um negocio cliente do Fatura4U (tenant).';

-- 2. PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Liga cada usuario autenticado a um negocio (tenant) e a um papel.';

-- 3. CUSTOMERS -- clientes finais do tenant (para quem ele emite nota/cobra)
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  document text,
  notes text,
  created_at timestamptz not null default now()
);

-- TRIGGERS -- updated_at automatico
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- RLS
create or replace function public.current_business_id()
returns uuid as $$
  select business_id from public.profiles where id = auth.uid()
$$ language sql stable security definer;

alter table public.businesses enable row level security;

create policy "Usuario ve so o proprio negocio"
  on public.businesses for select
  using (id = public.current_business_id());

create policy "Owner/admin atualiza o proprio negocio"
  on public.businesses for update
  using (
    id = public.current_business_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

alter table public.profiles enable row level security;

create policy "Usuario ve profiles do proprio negocio"
  on public.profiles for select
  using (business_id = public.current_business_id());

create policy "Usuario edita o proprio profile"
  on public.profiles for update
  using (id = auth.uid());

alter table public.customers enable row level security;

create policy "Isolamento customers - select" on public.customers for select using (business_id = public.current_business_id());
create policy "Isolamento customers - insert" on public.customers for insert with check (business_id = public.current_business_id());
create policy "Isolamento customers - update" on public.customers for update using (business_id = public.current_business_id());
create policy "Isolamento customers - delete" on public.customers for delete using (business_id = public.current_business_id());
