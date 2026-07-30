import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ContactsClientWrapper } from '@/components/audience/ContactsClientWrapper'
import { Contact, SavedView } from '@/types'

export default async function ContactsPage() {
  const supabase = await createClient()

  // For UI demonstration, we'll fetch up to 50 contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch saved views for the contacts entity
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('entity_type', 'contacts')
    .order('created_at', { ascending: true })
  
  return (
    <div className="flex-1 h-full flex flex-col p-6 max-w-[1600px] mx-auto w-full">
      <ContactsClientWrapper 
        initialContacts={(contacts as Contact[]) || []} 
        initialSavedViews={(savedViews as SavedView[]) || []}
      />
    </div>
  )
}
