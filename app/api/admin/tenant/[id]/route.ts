import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

// DELETE /api/admin/tenant/[id] — exclui permanentemente um tenant.
// Todas as tabelas com business_id têm ON DELETE CASCADE, então excluir a
// linha em `businesses` já remove clientes, cobranças, notas, certificado
// digital e credenciais de gateway. Os usuários (auth.users) não são
// apagados por cascade — removidos aqui manualmente, best-effort.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })

  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('business_id', id)

  const { error } = await supabaseAdmin
    .from('businesses')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const member of members ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(member.id).catch(() => {})
  }

  return NextResponse.json({ ok: true, deleted: biz.name })
}
