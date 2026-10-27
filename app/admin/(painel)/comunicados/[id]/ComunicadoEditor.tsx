'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { id: string; assunto: string; corpo: string; status: string; enviados: number; naFila: number; falhas: number; pulados: number; lote: number }

const SITUACAO: Record<string, string> = { rascunho: 'Rascunho', enviando: 'Enviando', concluido: 'Concluído', cancelado: 'Cancelado' }

async function chamar(url: string, metodo: string, corpo?: unknown) {
  const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function ComunicadoEditor(p: Props) {
  const router = useRouter()
  const [assunto, setAssunto] = useState(p.assunto)
  const [corpo, setCorpo] = useState(p.corpo)
  const [confirmacao, setConfirmacao] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState('')
  const editavel = p.status === 'rascunho'

  async function acao(nome: string, fn: () => Promise<{ ok: boolean; data: Record<string, unknown> }>, sucesso: (d: Record<string, unknown>) => string) {
    setOcupado(nome)
    setMsg(null)
    const r = await fn()
    setOcupado('')
    if (!r.ok) { setMsg({ tipo: 'erro', texto: String(r.data.error ?? 'Não foi possível concluir') }); return false }
    setMsg({ tipo: 'ok', texto: sucesso(r.data) })
    router.refresh()
    return true
  }

  const salvar = () => acao('salvar', () => chamar(`/api/admin/comunicados/${p.id}`, 'PATCH', { assunto, corpo }), () => 'Rascunho salvo.')
  const previa = async () => {
    if (!(await salvar())) return
    await acao('previa', () => chamar(`/api/admin/comunicados/${p.id}/previa`, 'POST'), d => `Prévia enviada para ${d.para}.`)
  }
  const enviar = async () => {
    if (!(await salvar())) return
    await acao('enviar', () => chamar(`/api/admin/comunicados/${p.id}/enviar`, 'POST', { confirmacao }),
      d => `Envio iniciado para ${d.destinatarios} pessoa(s) (${d.descadastrados} já tinham cancelado a inscrição).`)
  }
  const cancelar = () => acao('cancelar', () => chamar(`/api/admin/comunicados/${p.id}/cancelar`, 'POST'), () => 'Envio cancelado. O que estava na fila não sai.')

  const campo = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          ['Situação', SITUACAO[p.status] ?? p.status], ['Enviados', p.enviados], ['Na fila', p.naFila], ['Falhas', p.falhas], ['Pulados', p.pulados],
        ].map(([rotulo, valor]) => (
          <div key={String(rotulo)} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{rotulo}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{valor}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="mb-1 block text-sm font-medium text-zinc-700">Assunto</label>
        <input value={assunto} onChange={e => setAssunto(e.target.value)} disabled={!editavel} maxLength={200} className={campo} />
        <label className="mb-1 mt-4 block text-sm font-medium text-zinc-700">Texto</label>
        <textarea value={corpo} onChange={e => setCorpo(e.target.value)} disabled={!editavel} rows={12} className={campo} />
        <p className="mt-1 text-xs text-zinc-500">Texto simples. Uma linha em branco separa os parágrafos. O link para cancelar a inscrição é colocado no final automaticamente.</p>

        {editavel && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={salvar} disabled={!!ocupado} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50">
              {ocupado === 'salvar' ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button onClick={previa} disabled={!!ocupado} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50">
              {ocupado === 'previa' ? 'Enviando...' : 'Enviar prévia para mim'}
            </button>
          </div>
        )}
      </div>

      {editavel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-900">Enviar para os usuários</p>
          <p className="mt-1 text-sm text-amber-800">
            O comunicado vai para todos os e-mails de login do FATUR4U, menos quem já cancelou a inscrição. O primeiro lote sai agora e o resto nos próximos dias, até {p.lote} por dia. Não dá para desfazer o que já saiu.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)} placeholder="Digite ENVIAR para confirmar" className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" />
            <button onClick={enviar} disabled={confirmacao !== 'ENVIAR' || !!ocupado} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
              {ocupado === 'enviar' ? 'Enviando...' : 'Enviar comunicado'}
            </button>
          </div>
        </div>
      )}

      {p.status === 'enviando' && (
        <button onClick={cancelar} disabled={!!ocupado} className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
          {ocupado === 'cancelar' ? 'Cancelando...' : 'Cancelar o envio'}
        </button>
      )}

      {msg && <p className={`text-sm ${msg.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.texto}</p>}
    </div>
  )
}
