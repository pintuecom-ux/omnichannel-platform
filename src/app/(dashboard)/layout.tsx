import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GlobalSidebar from '@/components/sidebar/GlobalSidebar'
import ModuleSidebar from '@/components/sidebar/ModuleSidebar'
import InboundCallWatcher from '@/components/InboundCallWatcher'
import { GlobalCommandPalette } from '@/components/ui/GlobalCommandPalette'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div id="app">
      <GlobalSidebar />
      <ModuleSidebar />
      <InboundCallWatcher />
      <GlobalCommandPalette />
      <div id="content">
        {children}
      </div>
    </div>
  )
}