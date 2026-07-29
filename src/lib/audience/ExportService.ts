import { createClient } from '@/lib/supabase/server'
import { ExportJob } from '@/types'

export class ExportService {
  /**
   * Request an export of data. The background worker will pick this up to generate the CSV/JSON.
   */
  static async requestExport(
    workspaceId: string,
    userId: string,
    dataset: string = 'contacts',
    queryConfig: Record<string, any> = {},
    fieldSelection: string[] = [],
    format: string = 'csv'
  ): Promise<ExportJob> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('export_jobs')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        dataset,
        query_config: queryConfig,
        field_selection: fieldSelection,
        format,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return data as ExportJob
  }
}
