-- Dedupe do alerta de saldo projetado negativo: guarda a data (BRT) do
-- último envio pra não mandar o mesmo e-mail toda vez que o cron rodar
-- enquanto o saldo continuar negativo no mesmo dia.
alter table public.businesses
  add column if not exists saldo_alerta_enviado_em date;
