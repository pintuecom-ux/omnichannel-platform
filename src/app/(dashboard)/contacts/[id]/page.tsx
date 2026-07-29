import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Contact } from '@/types'
import { Contact360Layout } from '@/components/audience/Contact360Layout'
import { Contact360MainWorkspace } from '@/components/audience/Contact360MainWorkspace'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Contact360Page(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  // Fetch the specific contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !contact) {
    return notFound()
  }

  return (
    <Contact360Layout contact={contact as Contact}>
      <Contact360MainWorkspace contact={contact as Contact} />
    </Contact360Layout>
  )
}
