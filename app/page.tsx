import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-black text-slate-900">Fatura4U</h1>
      <p className="text-slate-500">Emissão de NFS-e e cobrança para quem não precisa de agenda.</p>
      <div className="flex gap-3">
        <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2">Entrar</Link>
        <Link href="/cadastro" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
          Criar conta
        </Link>
      </div>
    </main>
  );
}
