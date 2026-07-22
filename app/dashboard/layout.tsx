import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_id, businesses(name)')
    .eq('id', user.id)
    .single()

  const biz = profile?.businesses as unknown as { name: string } | null

  return (
    <DashboardSidebar
      businessName={biz?.name ?? ''}
      userName={profile?.full_name ?? ''}
    >
      {children}
    </DashboardSidebar>
  )
}
