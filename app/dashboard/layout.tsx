import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import DashboardSidebar from '@/components/DashboardSidebar'
import ImpersonateBanner from '@/components/ImpersonateBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_id, super_admin')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get('admin_impersonating_business_id')?.value
  const isImpersonating = profile.super_admin && !!impersonatingId

  const effectiveBusinessId = isImpersonating ? impersonatingId! : profile.business_id
  if (!effectiveBusinessId) {
    // Super admin "puro" (sem negócio próprio) — manda pro painel master em
    // vez de travar num /dashboard que ele não tem como acessar.
    redirect(profile.super_admin ? '/admin' : '/login')
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('name')
    .eq('id', effectiveBusinessId)
    .single()

  return (
    <>
      {isImpersonating && <ImpersonateBanner />}
      <DashboardSidebar
        businessName={biz?.name ?? ''}
        userName={profile.full_name ?? ''}
      >
        {children}
      </DashboardSidebar>
    </>
  )
}
