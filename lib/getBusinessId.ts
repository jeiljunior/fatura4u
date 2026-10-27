import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platformAdmin'

// Resolve o business_id "efetivo" da requisição: o do próprio usuário logado,
// ou — se ele for super admin com uma sessão de impersonation ativa (cookie
// setado por /api/admin/impersonate) — o do tenant que está sendo visualizado
// em modo suporte. Usado por todas as páginas do dashboard em vez de ler
// profile.business_id direto, pra que o modo "entrar como tenant" funcione
// em qualquer tela sem duplicar essa lógica.
export async function getEffectiveBusinessId(): Promise<{ businessId: string; isImpersonating: boolean } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get('admin_impersonating_business_id')?.value

  // Só consulta a tabela de administradores quando o cookie de suporte existe,
  // pra não pagar uma consulta extra em toda requisição normal.
  if (impersonatingId && await isPlatformAdmin(user.id)) {
    return { businessId: impersonatingId, isImpersonating: true }
  }

  if (!profile.business_id) return null
  return { businessId: profile.business_id, isImpersonating: false }
}
