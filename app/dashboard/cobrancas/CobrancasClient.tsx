'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Charge = {
  id: string
  valor_cents: number
  billing_type: string | null
  status: string
  due_date: string | null
  pix_qr_code: string | null
  boleto_url: string | null
  payment_link: string | null
  customers: { name: string } | { name: string }[] | null
}

type Customer = { id: string; name: string; document: string | null }

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', confirmada: 'Confirmada', recebida: 'Recebida', vencida: 'Vencida', cancelada: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700', confirmada: 'bg-blue-100 text-blue-700',
  recebida: 'bg-emerald-100 text-emerald-700', vencida: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function customerName(c: Charge['customers']) {
  if (!c) return '—'
  return Array.isArray(c) ? c[0]?.name ?? '—' : c.name
}

export default function CobrancasClient({ initialCharges, customers }: { initialCharges: Charge[]; customers: Customer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [valueReais, setValueReais] = useState('')
  const [billingType, setBillingType] = useState('pix')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState('')

  async function handleCopyLink(id: string, link: string) {
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/faturamento/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        valueCents: Math.round(Number(valueReais.replace(',', '.')) * 100),
        billingType,
        dueDate: dueDate || undefined,
        description,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar cobrança'); return }
    setOpen(false)
    setCustomerId(''); setValueReais(''); setDueDate(''); setDescription('')
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Nova cobrança
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold">Link</th>
            </tr>
          </thead>
          <tbody>
            {initialCharges.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma cobrança ainda</td></tr>
            )}
            {initialCharges.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{customerName(c.customers)}</td>
                <td className="px-4 py-3 text-slate-700">{fmt(c.valor_cents)}</td>
                <td className="px-4 py-3 text-slate-500 uppercase text-xs font-semibold">{c.billing_type}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.due_date ?? '—'}</td>
                <td className="px-4 py-3">
                  {c.payment_link ? (
                    <button onClick={() => handleCopyLink(c.id, c.payment_link!)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                      {copiedId === c.id ? 'Copiado!' : 'Copiar link'}
                    </button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">Nova cobrança</h2>
            <div className="space-y-3">
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Selecione o cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Valor (R$)" value={valueReais} onChange={e => setValueReais(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <select value={billingType} onChange={e => setBillingType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="pix">PIX</option>
                <option value="boleto">Boleto</option>
                <option value="cartao">Cartão</option>
              </select>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={saving || !customerId || !valueReais}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar cobrança'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
