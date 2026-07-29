import { createClient } from '@/lib/supabase/server'
import { ImportJob } from '@/types'

export class ImportService {
  /**
   * Create a new Import Job. The actual parsing/processing will be picked up by a background worker.
   */
  static async createImportJob(
    workspaceId: string,
    userId: string,
    fileName: string,
    fileUrl: string,
    source: string = 'csv'
  ): Promise<ImportJob> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        file_name: fileName,
        file_url: fileUrl,
        source,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return data as ImportJob
  }

  /**
   * Configure mapping after columns are parsed
   */
  static async updateMapping(
    workspaceId: string,
    jobId: string,
    mappingConfig: Record<string, any>,
    defaultTags: string[] = [],
    defaultLists: string[] = []
  ) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('import_jobs')
      .update({
        mapping_config: mappingConfig,
        default_tags: defaultTags,
        default_lists: defaultLists,
        status: 'mapping'
      })
      .match({ id: jobId, workspace_id: workspaceId })

    if (error) throw error
    return true
  }

  /**
   * Start the import process (Signals worker to begin)
   */
  static async startImport(workspaceId: string, jobId: string) {
    const supabase = await createClient()

    const { error } = await supabase
      .from('import_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .match({ id: jobId, workspace_id: workspaceId })

    if (error) throw error
    return true
  }
}
