-- Segurança do painel administrativo.
--
-- 1) CORRIGE falha crítica: a policy "Usuario edita o proprio profile" permitia
--    ao usuário alterar QUALQUER coluna da própria linha de `profiles`,
--    inclusive `super_admin` e `role` (confirmado em teste com conta
--    descartável: o usuário se promoveu a administrador sozinho). A partir
--    daqui o usuário logado só pode editar `full_name`; `super_admin`/`role`
--    só mudam pelo servidor (service role).
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2) Administradores da plataforma numa tabela própria e fechada: RLS ligado e
--    nenhum privilégio pra anon/authenticated — só o servidor (service role)
--    lê. A coluna profiles.super_admin deixa de ser consultada pelo código
--    (fica por ora, inofensiva; será removida numa migration futura, depois
--    que nenhuma versão antiga do app a leia mais).
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'jeiljunior@gmail.com'
on conflict (user_id) do nothing;

-- 3) Registro de ações do administrador — só se acrescenta. Sem FK em
--    business_id de propósito: o registro de um tenant excluído precisa
--    sobreviver à exclusão.
create table if not exists public.admin_audit (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid not null,
  admin_email text,
  action text not null,
  business_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit (created_at desc);
create index if not exists idx_admin_audit_business on public.admin_audit (business_id, created_at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create or replace function public.admin_audit_imutavel()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'admin_audit é imutável (apenas inserção)';
end;
$$;

create trigger trg_admin_audit_sem_update_delete
  before update or delete on public.admin_audit
  for each row execute function public.admin_audit_imutavel();

create trigger trg_admin_audit_sem_truncate
  before truncate on public.admin_audit
  for each statement execute function public.admin_audit_imutavel();
