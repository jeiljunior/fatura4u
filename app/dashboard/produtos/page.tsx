import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import ProdutosClient from './ProdutosClient'

export default async function ProdutosPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const { data: produtos } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('business_id', effective.businessId)
    .order('nome')

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Produtos</h1>
        <p className="text-slate-400 text-sm mt-0.5">Catálogo de mercadorias usado na emissão de NF-e/NFC-e</p>
      </div>
      <div className="p-6">
        <ProdutosClient initialProdutos={produtos ?? []} />
      </div>
    </main>
  )
}
