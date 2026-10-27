'use client'

import { useState } from 'react'
import PreviaButton from './PreviaButton'

type Item = { id: string; titulo: string; quando: string; assunto: string; html: string }

export default function ListaEmails({ itens }: { itens: Item[] }) {
  const [lista, setLista] = useState(itens)
  const [aberto, setAberto] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<number | null>(null)

  async function aplicar(nova: Item[]) {
    setLista(nova)
    await fetch('/api/admin/emails/ordem', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordem: nova.map(i => i.id) }),
    }).catch(() => {})
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= lista.length || de === para) return
    const nova = [...lista]
    const [item] = nova.splice(de, 1)
    nova.splice(para, 0, item)
    aplicar(nova)
  }

  const seta = 'flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-30'
  const botao = 'rounded-md border border-zinc-200 px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-50'

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">Arraste pela alça ⋮⋮ para reorganizar (ou use as setas).</p>
      <ol>
        {lista.map((e, i) => (
          <li key={e.id}
            draggable={arrastando === i}
            onDragOver={ev => { if (arrastando !== null) ev.preventDefault() }}
            onDrop={() => { if (arrastando !== null) mover(arrastando, i); setArrastando(null) }}
            onDragEnd={() => setArrastando(null)}
            className="mb-2 rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span onMouseDown={() => setArrastando(i)} onMouseUp={() => setArrastando(null)} title="Arraste para reorganizar"
                className="cursor-grab select-none text-zinc-400">⋮⋮</span>
              <span className="w-5 text-sm text-zinc-500">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-zinc-900">{e.titulo}</p>
                <p className="text-xs text-zinc-500">Assunto: {e.assunto}</p>
                <p className="text-xs text-zinc-400">{e.quando}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label="Subir" className={seta}>↑</button>
                <button type="button" disabled={i === lista.length - 1} onClick={() => mover(i, i + 1)} aria-label="Descer" className={seta}>↓</button>
                <button type="button" onClick={() => setAberto(aberto === e.id ? null : e.id)} className={botao}>
                  {aberto === e.id ? 'Fechar' : 'Ver e-mail'}
                </button>
                <PreviaButton id={e.id} />
              </div>
            </div>
            {aberto === e.id && (
              <div className="border-t border-zinc-100 p-4">
                <iframe
                  title={e.titulo}
                  sandbox=""
                  srcDoc={`<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;padding:16px">${e.html}</body>`}
                  className="h-64 w-full rounded-lg border border-zinc-200 bg-white"
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
