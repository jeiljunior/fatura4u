import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import NotasProdutoClient from './NotasProdutoClient'

export default async function NotasProdutoPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const [{ data: notas }, { data: customers }, { data: produtos }] = await Promise.all([
    supabaseAdmin.from('notas_produto').select('*, customers(name)').eq('business_id', effective.businessId).order('created_at', { ascending: false }),
    supabaseAdmin.from('customers').select('id, name, document').eq('business_id', effective.businessId).order('name'),
    supabaseAdmin.from('produtos').select('id, nome, ncm, cfop, unidade, preco_venda_cents').eq('business_id', effective.businessId).eq('ativo', true).order('nome'),
  ])

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Notas de Produto</h1>
        <p className="text-slate-400 text-sm mt-0.5">Emissão de NF-e (empresas) e NFC-e (consumidor final)</p>
      </div>
      <div className="p-6">
        <NotasProdutoClient initialNotas={notas ?? []} customers={customers ?? []} produtos={produtos ?? []} />
      </div>
    </main>
  )
}
