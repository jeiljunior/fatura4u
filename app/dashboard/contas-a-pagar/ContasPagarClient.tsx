'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Conta = {
  id: string
  descricao: string
  categoria: string | null
  valor_cents: number
  due_date: string
  status: string
  paid_at: string | null
}

const CATEGORIAS = ['Aluguel', 'Fornecedores', 'Impostos', 'Assinaturas', 'Salários', 'Outros']

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function situacao(conta: Conta): { label: string; color: string } {
  if (conta.status === 'pago') return { label: 'Paga', color: 'bg-emerald-100 text-emerald-700' }
  if (conta.due_date < hoje()) return { label: 'Vencida', color: 'bg-red-100 text-red-700' }
  return { label: 'Pendente', color: 'bg-amber-100 text-amber-700' }
}

export default function ContasPagarClient({ initialContas }: { initialContas: Conta[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Outros')
  const [valueReais, setValueReais] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalPendente = initialContas.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor_cents, 0)
  const totalVencido = initialContas.filter(c => c.status === 'pendente' && c.due_date < hoje()).reduce((s, c) => s + c.valor_cents, 0)

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/contas-pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao,
        categoria,
        valueCents: Math.round(Number(valueReais.replace(',', '.')) * 100),
        dueDate,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar conta'); return }
    setOpen(false)
    setDescricao(''); setValueReais(''); setDueDate(''); setCategoria('Outros')
    router.refresh()
  }

  async function handleToggleStatus(id: string, statusAtual: string) {
    await fetch(`/api/contas-pagar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusAtual === 'pago' ? 'pendente' : 'pago' }),
    })
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta conta a pagar?')) return
    await fetch(`/api/contas-pagar/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-lg">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">A pagar</p>
          <p className="text-xl font-black text-slate-800 mt-1">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Vencido</p>
          <p className="text-xl font-black text-red-600 mt-1">{fmt(totalVencido)}</p>
        </div>
      </div>

      <button onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
        + Nova conta a pagar
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {initialContas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma conta a pagar ainda</td></tr>
            )}
            {initialContas.map(c => {
              const sit = situacao(c)
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
                  <td className="px-4 py-3 text-slate-500">{c.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(c.valor_cents)}</td>
                  <td className="px-4 py-3 text-slate-500">{c.due_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sit.color}`}>{sit.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => handleToggleStatus(c.id, c.status)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold mr-3">
                      {c.status === 'pago' ? 'Reabrir' : 'Marcar como paga'}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-600 text-xs font-semibold">
                      Excluir
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-slate-900 mb-4">Nova conta a pagar</h2>
            <div className="space-y-3">
              <input placeholder="Descrição (ex: Aluguel do escritório)" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Valor (R$)" value={valueReais} onChange={e => setValueReais(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleCreate} disabled={saving || !descricao || !valueReais || !dueDate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar conta'}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
