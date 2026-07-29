import { createClient } from '@/lib/supabase/server'
import { ContactConsent } from '@/types'

export class ConsentService {
  /**
   * Record or update consent for a specific channel and purpose
   */
  static async setConsent(
    workspaceId: string,
    contactId: string,
    channel: string,
    purpose: string,
    status: 'granted' | 'withdrawn' | 'pending',
    source: string,
    legalBasis: string = 'legitimate_interest',
    evidence?: string
  ): Promise<ContactConsent> {
    const supabase = await createClient()

    const consentData = {
      workspace_id: workspaceId,
      contact_id: contactId,
      channel,
      purpose,
      status,
      source,
      legal_basis: legalBasis,
      evidence,
      updated_at: new Date().toISOString(),
      ...(status === 'granted' ? { granted_at: new Date().toISOString() } : {}),
      ...(status === 'withdrawn' ? { withdrawn_at: new Date().toISOString() } : {})
    }

    const { data, error } = await supabase
      .from('contact_consents')
      .upsert(consentData, {
        onConflict: 'contact_id, channel, purpose',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) throw error
    return data as ContactConsent
  }

  /**
   * Check if a contact has active consent for a specific channel and purpose
   */
  static async hasConsent(
    workspaceId: string,
    contactId: string,
    channel: string,
    purpose: string
  ): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_consents')
      .select('status, expires_at')
      .match({
        workspace_id: workspaceId,
        contact_id: contactId,
        channel,
        purpose
      })
      .single()

    if (error || !data) return false

    if (data.status !== 'granted') return false
    
    // Check expiration if applicable
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false
    }

    return true
  }

  /**
   * Fetch all consent records for a contact
   */
  static async getContactConsents(workspaceId: string, contactId: string): Promise<ContactConsent[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_consents')
      .select('*')
      .match({ workspace_id: workspaceId, contact_id: contactId })

    if (error) throw error
    return data as ContactConsent[]
  }
}
