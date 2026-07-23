-- Link de pagamento hospedado pelo gateway (ex: invoiceUrl do Asaas, ticket_url
-- do Mercado Pago) — uma única URL que o tenant pode mandar pro cliente final,
-- que mostra as opções de pagamento disponíveis pra aquela cobrança.
alter table public.charges
  add column if not exists payment_link text;
