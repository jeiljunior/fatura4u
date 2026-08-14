'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type JanelaDias = 7 | 15 | 30

export type SaldoProjetadoData = {
  saldoAtualCents: number
  projecoes: Record<JanelaDias, { saldoProjetadoCents: number; negativo: boolean }>
}

const JANELAS: JanelaDias[] = [7, 15, 30]

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SaldoProjetadoCard({ data }: { data: SaldoProjetadoData }) {
  const router = useRouter()
  const [dias, setDias] = useState<JanelaDias>(30)
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState(() => (data.saldoAtualCents / 100).toFixed(2).replace('.', ','))
  const [saving, setSaving] = useState(false)

  const projecao = data.projecoes[dias]

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
    <div className={`rounded-2xl border p-5 ${projecao.negativo ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">🔮</div>
        <div className="flex gap-1">
          {JANELAS.map(j => (
            <button
              key={j}
              type="button"
              onClick={e => { e.stopPropagation(); setDias(j) }}
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${dias === j ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {j}d
            </button>
          ))}
        </div>
      </div>
      <p className={`text-2xl font-black ${projecao.negativo ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
        {formatMoney(projecao.saldoProjetadoCents)}
      </p>
      <p className="text-muted-foreground text-sm">Saldo projetado em {dias} dias</p>
      {projecao.negativo && (
        <p className="text-red-600 dark:text-red-400 text-xs font-semibold mt-1">⚠️ Fica negativo nesse período</p>
      )}

      {editing ? (
        <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-2 py-1 bg-background text-foreground"
            placeholder="0,00"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="text-blue-600 dark:text-blue-400 text-xs font-semibold shrink-0 disabled:opacity-50">
            {saving ? '...' : 'Salvar'}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setEditing(true) }}
            className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:underline text-left"
          >
            Saldo em caixa: {formatMoney(data.saldoAtualCents)} · editar
          </button>
          <Link href="/dashboard/futuro" onClick={e => e.stopPropagation()} className="text-muted-foreground text-xs font-semibold hover:text-foreground shrink-0">
            Ver linha do tempo →
          </Link>
        </div>
      )}
    </div>
  )
}
