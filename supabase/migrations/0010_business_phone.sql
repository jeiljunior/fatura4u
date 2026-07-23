-- Telefone de contato do negócio, coletado no cadastro (não é WhatsApp de
-- notificação — o Fatura4U não tem esse módulo, é só dado de contato).
alter table public.businesses
  add column if not exists phone text;
