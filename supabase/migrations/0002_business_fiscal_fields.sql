-- Dados fiscais do proprio tenant (pessoa fisica/juridica) -- necessarios
-- para a emissao de NFS-e em nome dele. Mesmo desenho do AGEND4U.
alter table public.businesses
  add column if not exists document_type text check (document_type in ('cpf','cnpj')),
  add column if not exists document_number text,
  add column if not exists razao_social text,
  add column if not exists birth_date date,
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text;
