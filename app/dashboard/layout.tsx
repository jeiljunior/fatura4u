import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import DashboardSidebar from '@/components/DashboardSidebar'
import ImpersonateBanner from '@/components/ImpersonateBanner'
import { isPlatformAdmin } from '@/lib/platformAdmin'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const cookieStore = await cookies()
  const impersonatingId = cookieStore.get('admin_impersonating_business_id')?.value
  const isAdmin = await isPlatformAdmin(user.id)
  const isImpersonating = !!impersonatingId && isAdmin

  const effectiveBusinessId = isImpersonating ? impersonatingId! : profile.business_id
  if (!effectiveBusinessId) {
    // Administrador "puro" (sem negócio próprio) — manda pro painel master em
    // vez de travar num /dashboard que ele não tem como acessar.
    redirect(isAdmin ? '/admin' : '/login')
  }

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('name, logo_url, brand_color')
    .eq('id', effectiveBusinessId)
    .single()

  return (
    <>
      {isImpersonating && <ImpersonateBanner />}
      <DashboardSidebar
        businessName={biz?.name ?? ''}
        userName={profile.full_name ?? ''}
        logoUrl={biz?.logo_url}
        brandColor={biz?.brand_color}
        isAdmin={isAdmin}
      >
        {children}
      </DashboardSidebar>
    </>
  )
}
