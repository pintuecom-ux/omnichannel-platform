import { createClient } from '@/lib/supabase/server'
import { Contact, ContactIdentity } from '@/types'

export class IdentityService {
  /**
   * Resolves an identity to an existing contact or creates a new one.
   * Based on SDP 03 (Contact Identity Resolution)
   */
  static async resolveIdentity(
    workspaceId: string,
    provider: 'whatsapp' | 'instagram' | 'facebook' | 'email' | 'custom' | 'external_crm' | string,
    identifier: string,
    additionalData?: Partial<Contact>
  ): Promise<Contact> {
    const supabase = await createClient()

    // 1. Look up existing identity in contact_identities
    const { data: existingIdentity } = await supabase
      .from('contact_identities')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('identifier', identifier)
      .single()

    if (existingIdentity) {
      // 2a. Found via new identities table
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', existingIdentity.contact_id)
        .single()
        
      if (contact) {
        // Optionally update contact with additionalData here
        return contact as Contact
      }
    }

    // 3. Fallback to existing flat columns for backward compatibility (SDP 03.22)
    let legacyQuery = supabase.from('contacts').select('*').eq('workspace_id', workspaceId)
    
    if (provider === 'whatsapp' || provider === 'phone') {
      legacyQuery = legacyQuery.eq('phone', identifier)
    } else if (provider === 'email') {
      legacyQuery = legacyQuery.eq('email', identifier)
    } else if (provider === 'instagram') {
      legacyQuery = legacyQuery.eq('instagram_scoped_id', identifier)
    } else if (provider === 'facebook') {
      legacyQuery = legacyQuery.eq('facebook_scoped_id', identifier)
    } else if (provider === 'custom' || provider === 'external_crm') {
      legacyQuery = legacyQuery.eq('external_id', identifier)
    } else {
      // Unrecognized provider without a dedicated column, fail legacy lookup
      legacyQuery = legacyQuery.eq('id', '00000000-0000-0000-0000-000000000000') // impossible match
    }

    const { data: legacyContacts } = await legacyQuery.limit(1)

    if (legacyContacts && legacyContacts.length > 0) {
      const contact = legacyContacts[0]
      
      // Backfill the identity table
      await supabase.from('contact_identities').insert({
        workspace_id: workspaceId,
        contact_id: contact.id,
        provider,
        identifier,
        is_verified: true // Assuming primary match is verified
      })

      return contact as Contact
    }

    // 4. Create new contact if not found
    return await this.createContact(workspaceId, provider, identifier, additionalData)
  }

  static async createContact(
    workspaceId: string,
    provider: string,
    identifier: string,
    additionalData?: Partial<Contact>
  ): Promise<Contact> {
    const supabase = await createClient()
    
    // Determine legacy columns to populate
    const newContactData: Record<string, any> = {
      workspace_id: workspaceId,
      source: additionalData?.source || provider,
      ...additionalData
    }

    if (provider === 'whatsapp' || provider === 'phone') newContactData.phone = identifier;
    if (provider === 'email') newContactData.email = identifier;
    if (provider === 'instagram') newContactData.instagram_scoped_id = identifier;
    if (provider === 'facebook') newContactData.facebook_scoped_id = identifier;

    // Ensure meta is initialized
    if (!newContactData.meta) newContactData.meta = {};

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(newContactData)
      .select()
      .single()

    if (error || !contact) {
      throw new Error(`Failed to create contact: ${error?.message}`)
    }

    // Insert into contact_identities
    await supabase.from('contact_identities').insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      provider,
      identifier,
      is_verified: true
    })

    return contact as Contact
  }

  /**
   * Merges two contacts. The victim contact is archived or soft deleted.
   */
  static async mergeContacts(
    workspaceId: string,
    survivorId: string,
    victimId: string,
    mergedBy?: string,
    reason?: string
  ): Promise<Contact> {
    const supabase = await createClient()
    
    // 1. Fetch both contacts
    const { data: survivor } = await supabase.from('contacts').select('*').eq('id', survivorId).single()
    const { data: victim } = await supabase.from('contacts').select('*').eq('id', victimId).single()

    if (!survivor || !victim) throw new Error('Survivor or victim contact not found')

    // 2. Transfer identities
    await supabase
      .from('contact_identities')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)

    // 3. (Future) Transfer conversations, lists, tags, events...
    await supabase.from('conversations').update({ contact_id: survivorId }).eq('contact_id', victimId)
    await supabase.from('list_subscriptions').update({ contact_id: survivorId }).eq('contact_id', victimId)

    // 4. Record merge history
    await supabase.from('contact_merge_history').insert({
      workspace_id: workspaceId,
      merged_contact_id: survivorId,
      from_contact_id: victimId,
      merged_by: mergedBy,
      reason: reason || 'Manual Merge',
      fields_changed: { note: 'Merged from identity engine' }
    })

    // 5. Soft delete victim (using is_suppressed or a new deleted_at flag based on SDP)
    await supabase.from('contacts').update({ is_suppressed: true }).eq('id', victimId)

    // Return updated survivor
    const { data: updatedSurvivor } = await supabase.from('contacts').select('*').eq('id', survivorId).single()
    return updatedSurvivor as Contact
  }
}
