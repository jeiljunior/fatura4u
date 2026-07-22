'use client'

import { useState } from 'react'

export default function ImpersonateButton({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImpersonate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao iniciar sessão de suporte')
        setLoading(false)
        return
      }
      window.location.href = data.redirectTo
    } catch {
      setError('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
      >
        {loading ? '⏳ Entrando...' : '🔑 Entrar como esse tenant'}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}
