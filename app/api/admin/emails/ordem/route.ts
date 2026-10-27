import { NextRequest, NextResponse } from 'next/server'
import { platformAdminMfaOrNull } from '@/lib/platformAdmin'
import { catalogoEmails } from '@/lib/adminEmails'
import { salvarConfig } from '@/lib/appSettings'

// PUT /api/admin/emails/ordem — guarda a ordem de exibição do catálogo.
export async function PUT(req: NextRequest) {
  const admin = await platformAdminMfaOrNull()
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { ordem } = await req.json().catch(() => ({ ordem: null }))
  const validos = new Set(catalogoEmails().map(e => e.id))
  if (!Array.isArray(ordem) || ordem.some(id => typeof id !== 'string' || !validos.has(id))) {
    return NextResponse.json({ error: 'Ordem inválida' }, { status: 400 })
  }
  await salvarConfig('emails_ordem', ordem, admin.user.id)
  return NextResponse.json({ ok: true })
}
