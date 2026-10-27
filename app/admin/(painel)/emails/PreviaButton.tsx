'use client'

import { useState } from 'react'

export default function PreviaButton({ id }: { id: string }) {
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'ok' | 'erro'>('parado')
  const [msg, setMsg] = useState('')

  async function enviar() {
    setEstado('enviando')
    setMsg('')
    const res = await fetch('/api/admin/emails/previa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) { setEstado('ok'); setMsg(`Enviado para ${data.para}`) }
    else { setEstado('erro'); setMsg(data.error ?? 'Não foi possível enviar.') }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button onClick={enviar} disabled={estado === 'enviando'}
        className="rounded-md border border-zinc-200 px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50">
        {estado === 'enviando' ? 'Enviando...' : 'Enviar prévia para mim'}
      </button>
      {msg && <span className={`text-xs ${estado === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</span>}
    </span>
  )
}
