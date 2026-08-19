-- Campos de faturamento_config exigidos pra emitir NF-e/NFC-e (nota de
-- produto — estadual, ICMS), além dos já existentes de NFS-e (municipal,
-- ISS). `uf` é autoritativo pra fins fiscais (determina o endpoint SEFAZ e
-- entra no cálculo da chave de acesso) — businesses.address_state existe
-- mas é só endereço, não necessariamente reflete a UF fiscal do tenant.
-- serie_nfe/serie_nfce são independentes: NF-e (modelo 55) e NFC-e (modelo
-- 65) têm numeração própria mesmo que a série tenha o mesmo texto.
alter table public.faturamento_config
  add column if not exists uf text,
  add column if not exists inscricao_estadual text,
  add column if not exists serie_nfe text not null default '1',
  add column if not exists serie_nfce text not null default '1',
  add column if not exists csc_id text,
  add column if not exists csc_token_enc jsonb;
