import Link from 'next/link'
import { notFound } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { LOTE_POR_EXECUCAO } from '@/lib/comunicados'
import ComunicadoEditor from './ComunicadoEditor'

export const dynamic = 'force-dynamic'

export default async function ComunicadoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdminMfa()
  const { id } = await params

  const { data: c } = await supabaseAdmin.from('comunicados').select('id, assunto, corpo, status').eq('id', id).maybeSingle()
  if (!c) notFound()

  const { data: envios } = await supabaseAdmin.from('comunicado_envios').select('status').eq('comunicado_id', id).limit(50000)
  const conta = (s: string) => (envios ?? []).filter(e => e.status === s).length

  return (
    <div className="max-w-3xl">
      <Link href="/admin/comunicados" className="text-sm text-zinc-500 hover:text-zinc-900">← Comunicados</Link>
      <h2 className="mb-4 mt-2 text-xl font-semibold text-zinc-900">{c.assunto || 'Novo comunicado'}</h2>
      <ComunicadoEditor
        id={c.id} assunto={c.assunto} corpo={c.corpo} status={c.status}
        enviados={conta('enviado')} naFila={conta('na_fila')} falhas={conta('falhou')} pulados={conta('pulado')}
        lote={LOTE_POR_EXECUCAO}
      />
    </div>
  )
}
