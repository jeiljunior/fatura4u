-- Certificado digital A1 do tenant, usado pra mTLS + assinatura XMLDSig na
-- emissão de NFS-e Nacional. Tabela isolada de faturamento_config: é o
-- artefato mais sensível do módulo, superfície de código mínima nela.
create table if not exists public.certificados_digitais (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pfx jsonb not null, -- { enc: "<pfx em base64 + senha, cifrados juntos>" }
  valido_ate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create trigger trg_certificados_digitais_updated_at
  before update on public.certificados_digitais
  for each row execute function public.set_updated_at();

alter table public.certificados_digitais enable row level security;

create policy "tenant vê seu certificado digital" on public.certificados_digitais
  for all using (business_id = public.current_business_id());
