import Link from 'next/link'
import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { hojeBRT } from '@/lib/dateBrt'
import { lerPlanos } from '@/lib/planos'

export const dynamic = 'force-dynamic'

// Primeiro instante do mês corrente em Brasília (UTC-3), como ISO.
function inicioDoMes(): string {
  const [ano, mes] = hojeBRT().split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, 1, 3)).toISOString()
}

export default async function PlanosPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')
  const id = effective.businessId
  const desde = inicioDoMes()

  const [{ data: biz }, { count: nfse }, { count: nfProduto }, { count: usuarios }, planos] = await Promise.all([
    supabaseAdmin.from('businesses').select('name, razao_social, document_type, document_number').eq('id', id).single(),
    supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true }).eq('business_id', id).eq('status', 'autorizada').gte('created_at', desde),
    supabaseAdmin.from('notas_produto').select('*', { count: 'exact', head: true }).eq('business_id', id).eq('status', 'autorizada').gte('created_at', desde),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('business_id', id),
    lerPlanos().catch(() => null),
  ])

  const documento = (biz?.document_number ?? '').replace(/\D/g, '')
  const nomeFiscal = biz?.razao_social || biz?.name || ''
  const notasNoMes = (nfse ?? 0) + (nfProduto ?? 0)
  const aberta = planos?.contratacao_aberta ?? false

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Meu plano</h1>
        <p className="text-slate-400 text-sm mt-0.5">Seu uso do FATUR4U e como contratar um plano</p>
      </div>

      <div className="p-6 max-w-3xl space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 text-sm">Dados para a nota fiscal</p>
            {documento ? (
              <p className="text-slate-500 text-sm mt-0.5">{nomeFiscal} · documento terminado em {documento.slice(-4)}</p>
            ) : (
              <p className="text-amber-600 text-sm mt-0.5">Ainda não há CNPJ/CPF cadastrado. Preencha para podermos emitir a nota da sua assinatura.</p>
            )}
          </div>
          <Link href="/dashboard/configuracoes" className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Alterar dados
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-900">Seu plano agora: Grátis</p>
          <p className="text-slate-500 text-sm mt-1">Por enquanto, todas as contas usam o FATUR4U sem limites de notas e de usuários.</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-xs">Notas emitidas neste mês</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{notasNoMes}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 text-xs">Usuários da conta</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{usuarios ?? 0}</p>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            Quando os planos pagos começarem, os limites de cada plano passam a valer. Notas emitidas contam NFS-e, NF-e e NFC-e autorizadas.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-900 text-sm">Quer mais notas ou mais usuários?</p>
          <p className="text-slate-500 text-sm mt-1">
            {aberta
              ? 'Os planos pagos estão sendo liberados. Veja as opções e entre em contato para contratar.'
              : 'A contratação dos planos pagos será liberada em breve. Enquanto isso, você segue usando o FATUR4U normalmente.'}
          </p>
          <Link href="/#planos" className="inline-block mt-3 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Ver os planos
          </Link>
        </div>
      </div>
    </main>
  )
}
