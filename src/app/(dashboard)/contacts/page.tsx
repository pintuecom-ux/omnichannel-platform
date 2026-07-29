import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { ContactsGrid } from '@/components/audience/ContactsGrid'
import { ContactsToolbar } from '@/components/audience/ContactsToolbar'
import { ContactsClientWrapper } from '@/components/audience/ContactsClientWrapper'
import { Contact } from '@/types'

export default async function ContactsPage() {
  const supabase = await createClient()

  // For UI demonstration, we'll fetch up to 50 contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // This will be replaced by a client component wrapper that manages selection state and fetching
  // but for the sake of the SDP 06 foundation, we render the grid with initial data.
  
  return (
    <div className="flex-1 h-full flex flex-col p-6 max-w-[1600px] mx-auto w-full">
      <ContactsClientWrapper initialContacts={(contacts as Contact[]) || []} />
    </div>
  )
}
