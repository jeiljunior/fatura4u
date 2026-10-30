'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Conta = {
  id: string
  descricao: string
  categoria: string | null
  valor_cents: number
  due_date: string
  status: string
  paid_at: string | null
  recurrence_group_id?: string | null
}

type Modelo = {
  id: string
  descricao: string
  categoria: string | null
  valor_cents: number | null
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
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [modeloId, setModeloId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Outros')
  const [valueReais, setValueReais] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [recorrenciaMeses, setRecorrenciaMeses] = useState(12)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/contas-pagar-modelos')
      .then(r => r.json())
      .then(data => setModelos(data.modelos ?? []))
  }, [open])

  function handleSelectModelo(id: string) {
    setModeloId(id)
    const m = modelos.find(x => x.id === id)
    if (!m) return
    setDescricao(m.descricao)
    if (m.categoria) setCategoria(m.categoria)
    if (m.valor_cents) setValueReais((m.valor_cents / 100).toFixed(2).replace('.', ','))
  }

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
    setDescricao(''); setValueReais(''); setDueDate(''); setCategoria('Outros'); setModeloId('')
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
        className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition mb-4">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Nova conta a pagar</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-3">
              {modelos.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Usar modelo (opcional)</label>
                  <select value={modeloId} onChange={e => handleSelectModelo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                    <option value="">Preencher manualmente</option>
                    {modelos.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                  </select>
                </div>
              )}
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
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
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
