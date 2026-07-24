'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Invoice = {
  id: string
  status: string
  valor_servicos: number
  chave_acesso: string | null
  motivo_rejeicao: string | null
  customers: { name: string } | { name: string }[] | null
}

type Customer = { id: string; name: string; document: string | null }
type Servico = { id: string; nome: string; descricao: string | null; preco_cents: number | null }

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', processando: 'Processando', autorizada: 'Autorizada', rejeitada: 'Rejeitada', cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-500', processando: 'bg-amber-100 text-amber-700',
  autorizada: 'bg-emerald-100 text-emerald-700', rejeitada: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}

function customerName(c: Invoice['customers']) {
  if (!c) return '—'
  return Array.isArray(c) ? c[0]?.name ?? '—' : c.name
}

export default function NotasClient({ initialInvoices, customers, servicos }: { initialInvoices: Invoice[]; customers: Customer[]; servicos: Servico[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [valorServicos, setValorServicos] = useState('')
  const [descricaoServico, setDescricaoServico] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleSelectServico(id: string) {
    setServicoId(id)
    const s = servicos.find(x => x.id === id)
    if (s) {
      setDescricaoServico(s.descricao || s.nome)
      if (s.preco_cents != null) setValorServicos((s.preco_cents / 100).toFixed(2).replace('.', ','))
    }
  }

  async function handleEmit() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/faturamento/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, servicoId: servicoId || undefined, valorServicos: Number(valorServicos.replace(',', '.')), descricaoServico }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao emitir nota'); return }
    setOpen(false)
    setCustomerId(''); setServicoId(''); setValorServicos(''); setDescricaoServico('')
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Emitir nota
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Chave de acesso</th>
              <th className="px-4 py-3 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {initialInvoices.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhuma nota emitida ainda</td></tr>
            )}
            {initialInvoices.map(inv => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{customerName(inv.customers)}</td>
                <td className="px-4 py-3 text-slate-700">R$ {inv.valor_servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  {inv.status === 'rejeitada' && inv.motivo_rejeicao && (
                    <p className="text-xs text-red-500 mt-1 max-w-xs">{inv.motivo_rejeicao}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{inv.chave_acesso ? `${inv.chave_acesso.slice(0, 12)}…` : '—'}</td>
                <td className="px-4 py-3">
                  {inv.status === 'autorizada' && (
                    <a href={`/api/faturamento/invoices/${inv.id}/danfse`} target="_blank" rel="noreferrer"
                      className="text-blue-600 hover:underline">Baixar DANFSe</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">Emitir nota fiscal</h2>
            <div className="space-y-3">
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Selecione o cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {servicos.length > 0 && (
                <select value={servicoId} onChange={e => handleSelectServico(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  <option value="">Serviço (opcional — preenche valor e descrição)</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              )}
              <input placeholder="Valor do serviço (R$)" value={valorServicos} onChange={e => setValorServicos(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <textarea placeholder="Descrição do serviço" value={descricaoServico} onChange={e => setDescricaoServico(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" rows={3} />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleEmit} disabled={saving || !customerId || !valorServicos || !descricaoServico}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Emitindo...' : 'Emitir'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
