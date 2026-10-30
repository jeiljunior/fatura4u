'use client'

import { useState, useEffect } from 'react'

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

export default function ContasPagarModelosSection() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loaded, setLoaded] = useState(false)

  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Outros')
  const [valueReais, setValueReais] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/contas-pagar-modelos')
      .then(r => r.json())
      .then(data => { setModelos(data.modelos ?? []); setLoaded(true) })
  }, [])

  async function handleCreate() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/contas-pagar-modelos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao,
        categoria,
        valueCents: valueReais ? Math.round(Number(valueReais.replace(',', '.')) * 100) : null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar modelo'); return }
    setModelos(prev => [...prev, data.modelo].sort((a, b) => a.descricao.localeCompare(b.descricao)))
    setDescricao(''); setValueReais(''); setCategoria('Outros')
  }

  async function handleDelete(id: string) {
    setModelos(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/contas-pagar-modelos/${id}`, { method: 'DELETE' })
  }

  return (
    <div>
      <p className="text-slate-500 text-sm mb-4">
        Cadastre aqui as despesas que se repetem (aluguel, assinaturas...). Ao criar uma nova conta a pagar, você
        poderá escolher um desses modelos pra preencher descrição, categoria e valor automaticamente, sem digitar
        tudo de novo.
      </p>

      {!loaded ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : (
        <>
          {modelos.length === 0 ? (
            <p className="text-slate-400 text-sm mb-4">Nenhum modelo cadastrado ainda.</p>
          ) : (
            <div className="space-y-2 mb-5">
              {modelos.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.descricao}</p>
                    <p className="text-xs text-slate-400">
                      {m.categoria ?? 'Sem categoria'}{m.valor_cents ? ` · ${fmt(m.valor_cents)}` : ''}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="shrink-0 text-red-500 hover:text-red-600 text-xs font-semibold">
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Novo modelo</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input placeholder="Descrição (ex: Aluguel do escritório)" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm sm:col-span-1" />
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="Valor padrão (R$, opcional)" value={valueReais} onChange={e => setValueReais(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button onClick={handleCreate} disabled={saving || !descricao}
              className="mt-3 bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
              {saving ? 'Adicionando...' : '+ Adicionar modelo'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
