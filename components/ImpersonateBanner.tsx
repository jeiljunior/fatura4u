'use client'

export default function ImpersonateBanner() {
  return (
    <div className="bg-amber-400 text-amber-900 px-6 py-3 flex items-center justify-between text-sm font-semibold">
      <span>⚠️ Modo suporte ativo — você está visualizando como este tenant</span>
      <form action="/api/admin/exit-impersonate" method="post">
        <button
          type="submit"
          className="bg-amber-900 text-amber-100 hover:bg-amber-800 px-4 py-1.5 rounded-lg text-xs font-bold transition"
        >
          Encerrar sessão de suporte
        </button>
      </form>
    </div>
  )
}
