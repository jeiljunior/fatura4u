'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoComunicadoButton() {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  async function criar() {
    setCriando(true)
    setErro('')
    const res = await fetch('/api/admin/comunicados', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setErro(data.error ?? 'Não foi possível criar'); setCriando(false); return }
    router.push(`/admin/comunicados/${data.id}`)
  }

  return (
    <div className="text-right">
      <button onClick={criar} disabled={criando} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {criando ? 'Criando...' : 'Novo comunicado'}
      </button>
      {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
    </div>
  )
}
