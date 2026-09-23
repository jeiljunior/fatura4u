-- Cartas de Correção Eletrônica (CC-e, evento 110110) da NF-e modelo 55.
-- Histórico separado da nota: a SEFAZ aceita até 20 por nota, cada uma com
-- número de sequência próprio (nSeqEvento). NFC-e (65) não admite CC-e.
create table if not exists public.notas_produto_cartas_correcao (
  id uuid primary key default uuid_generate_v4(),
  nota_id uuid not null references public.notas_produto(id) on delete cascade,
  sequencia int not null check (sequencia between 1 and 20),
  correcao text not null,
  protocolo text,
  created_at timestamptz not null default now(),
  unique (nota_id, sequencia)
);

create index if not exists idx_notas_produto_cartas_nota on public.notas_produto_cartas_correcao (nota_id);

alter table public.notas_produto_cartas_correcao enable row level security;

create policy "tenant vê cartas de correção das próprias notas" on public.notas_produto_cartas_correcao
  for select using (
    exists (
      select 1 from public.notas_produto
      where notas_produto.id = notas_produto_cartas_correcao.nota_id
        and notas_produto.business_id = public.current_business_id()
    )
  );
