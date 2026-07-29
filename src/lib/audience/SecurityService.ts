import { createClient } from '@/lib/supabase/server'

export class SecurityService {
  /**
   * Check if a user has a specific permission in a workspace.
   */
  static async checkPermission(
    workspaceId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const supabase = await createClient()

    // Retrieve user's role in this workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role_id')
      .match({ workspace_id: workspaceId, user_id: userId })
      .single()

    if (!member || !member.role_id) return false

    // Check if the role grants the exact permission
    const { data: permission } = await supabase
      .from('role_permissions')
      .select('id')
      .match({ role_id: member.role_id, resource, action })
      .single()

    return !!permission
  }

  /**
   * Enforce permission (throws an error if not allowed)
   */
  static async enforce(
    workspaceId: string,
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const isAllowed = await this.checkPermission(workspaceId, userId, resource, action)
    if (!isAllowed) {
      throw new Error(`Forbidden: You lack permission to ${action} ${resource} in this workspace.`)
    }
  }
}
