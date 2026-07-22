-- Permite um profile "puro" de super admin, sem negócio vinculado (mesmo
-- padrão do AGEND4U) — o painel /admin gerencia todos os tenants, não
-- precisa pertencer a um.
alter table public.profiles
  alter column business_id drop not null;

-- Sem isso, um admin com business_id nulo não consegue nem ler o próprio
-- profile via RLS: a policy de select existente é escopada por
-- current_business_id(), que também depende do próprio business_id do
-- profile — null = null nunca é verdadeiro em SQL. Toda pessoa deve sempre
-- conseguir ler a própria linha, independente de ter negócio ou não.
create policy "Usuario ve o proprio profile"
  on public.profiles for select
  using (id = auth.uid());
