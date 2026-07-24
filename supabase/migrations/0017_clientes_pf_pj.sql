-- Cadastro de cliente completo: pessoa física ou jurídica, com endereço e
-- dados fiscais próprios (independente dos dados do próprio negócio/tenant).
alter table public.customers
  add column if not exists tipo_pessoa text not null default 'pf' check (tipo_pessoa in ('pf', 'pj')),
  add column if not exists birth_date date,
  add column if not exists inscricao_estadual text,
  add column if not exists inscricao_municipal text,
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text;
