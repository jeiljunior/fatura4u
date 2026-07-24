'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Recorrente = {
  id: string
  valor_cents: number
  billing_type: string
  description: string | null
  due_day: number
  active: boolean
  next_due_date: string
  customers: { name: string } | { name: string }[] | null
}

type Customer = { id: string; name: string; document: string | null }

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function customerName(c: Recorrente['customers']) {
  if (!c) return '—'
  return Array.isArray(c) ? c[0]?.name ?? '—' : c.name
}

export default function RecorrentesClient({ initialRecorrentes, customers }: { initialRecorrentes: Recorrente[]; customers: Customer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [valueReais, setValueReais] = useState('')
  const [billingType, setBillingType] = useState('pix')
  const [dueDay, setDueDay] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/faturamento/recorrentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        valueCents: Math.round(Number(valueReais.replace(',', '.')) * 100),
        billingType,
        dueDay: Number(dueDay),
        description,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar recorrência'); return }
    setOpen(false)
    setCustomerId(''); setValueReais(''); setDueDay(''); setDescription('')
    router.refresh()
  }

  async function handleToggleActive(id: string, active: boolean) {
    await fetch(`/api/faturamento/recorrentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta cobrança recorrente? As cobranças já geradas continuam no histórico.')) return
    await fetch(`/api/faturamento/recorrentes/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-900">Cobranças recorrentes</h2>
          <p className="text-slate-400 text-sm">Cadastre uma vez, o sistema cobra automaticamente todo mês</p>
        </div>
        <button onClick={() => setOpen(true)}
          className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition">
          + Nova recorrência
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Dia venc.</th>
              <th className="px-4 py-3 font-semibold">Próxima cobrança</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {initialRecorrentes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma cobrança recorrente ainda</td></tr>
            )}
            {initialRecorrentes.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{customerName(r.customers)}</td>
                <td className="px-4 py-3 text-slate-700">{fmt(r.valor_cents)}</td>
                <td className="px-4 py-3 text-slate-500 uppercase text-xs font-semibold">{r.billing_type}</td>
                <td className="px-4 py-3 text-slate-500">Todo dia {r.due_day}</td>
                <td className="px-4 py-3 text-slate-500">{r.next_due_date}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.active ? 'Ativa' : 'Pausada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => handleToggleActive(r.id, r.active)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold mr-3">
                    {r.active ? 'Pausar' : 'Retomar'}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Nova cobrança recorrente</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
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
              <input type="number" min={1} max={28} placeholder="Dia do vencimento (1-28)" value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={saving || !customerId || !valueReais || !dueDay}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar recorrência'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
