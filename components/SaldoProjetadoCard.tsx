'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type SaldoProjetadoData = {
  saldoAtualCents: number
  saldoProjetadoCents: number
  negativo: boolean
  dias: number
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SaldoProjetadoCard({ data }: { data: SaldoProjetadoData }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState(() => (data.saldoAtualCents / 100).toFixed(2).replace('.', ','))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const cents = Math.round(parseFloat(valor.replace(',', '.')) * 100)
    if (Number.isNaN(cents)) return
    setSaving(true)
    await fetch('/api/business/saldo-caixa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saldoCaixaCents: cents }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className={`rounded-2xl border p-5 ${data.negativo ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="text-2xl mb-2">🔮</div>
      <p className={`text-2xl font-black ${data.negativo ? 'text-red-700' : 'text-slate-900'}`}>
        {formatMoney(data.saldoProjetadoCents)}
      </p>
      <p className="text-slate-400 text-sm">Saldo projetado em {data.dias} dias</p>
      {data.negativo && (
        <p className="text-red-600 text-xs font-semibold mt-1">⚠️ Fica negativo nesse período</p>
      )}

      {editing ? (
        <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1"
            placeholder="0,00"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="text-blue-600 text-xs font-semibold shrink-0 disabled:opacity-50">
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setEditing(true) }}
          className="text-blue-600 text-xs font-semibold hover:underline mt-3 text-left"
        >
          Saldo em caixa: {formatMoney(data.saldoAtualCents)} · editar
        </button>
      )}
    </div>
  )
}
