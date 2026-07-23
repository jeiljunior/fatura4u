-- White label "branding por tenant": logo e cor de destaque customizáveis,
-- aplicados só no próprio dashboard do tenant (não é domínio próprio nem
-- revenda — escopo decidido com o usuário).
alter table public.businesses
  add column if not exists logo_url text,
  add column if not exists brand_color text;

-- Bucket de storage pro logo, mesmo padrão do bucket "business-assets" do
-- AGEND4U (política sem restrição por path — mesmo nível de confiança do
-- projeto irmão, o nome do arquivo já inclui o business_id).
insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

drop policy if exists "Leitura publica de assets do negocio" on storage.objects;
create policy "Leitura publica de assets do negocio"
on storage.objects for select
using (bucket_id = 'business-assets');

drop policy if exists "Usuarios autenticados podem enviar assets do negocio" on storage.objects;
create policy "Usuarios autenticados podem enviar assets do negocio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'business-assets');

drop policy if exists "Usuarios autenticados podem atualizar assets do negocio" on storage.objects;
create policy "Usuarios autenticados podem atualizar assets do negocio"
on storage.objects for update
to authenticated
using (bucket_id = 'business-assets');

drop policy if exists "Usuarios autenticados podem remover assets do negocio" on storage.objects;
create policy "Usuarios autenticados podem remover assets do negocio"
on storage.objects for delete
to authenticated
using (bucket_id = 'business-assets');
