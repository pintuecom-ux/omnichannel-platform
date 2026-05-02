import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar/Sidebar'
import InboundCallWatcher from '@/components/InboundCallWatcher'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div id="app">
      <Sidebar />
      <InboundCallWatcher />
      <div id="content">
        {children}
      </div>
    </div>
  )
}