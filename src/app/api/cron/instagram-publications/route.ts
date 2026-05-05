/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { admin } from '@/lib/instagram/helpers'
import { publishScheduledPublication } from '@/lib/instagram/service'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: due, error } = await admin
    .from('scheduled_publications')
    .select('*, channel:channels(*)')
    .eq('platform', 'instagram')
    .eq('status', 'scheduled')
    .lte('publish_at', new Date().toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<Record<string, any>> = []

  for (const row of due ?? []) {
    try {
      await admin.from('scheduled_publications').update({
        status: 'publishing',
        updated_at: new Date().toISOString(),
      }).eq('id', row.id).eq('status', 'scheduled')

      const publication = {
        ...row,
        channel: undefined,
      }

      await publishScheduledPublication({
        publication,
        channel: Array.isArray(row.channel) ? row.channel[0] : row.channel,
      })
      results.push({ id: row.id, status: 'published' })
    } catch (err: any) {
      await admin.from('scheduled_publications').update({
        status: 'failed',
        retry_count: (row.retry_count ?? 0) + 1,
        last_error: err.message ?? 'publish_failed',
        updated_at: new Date().toISOString(),
      }).eq('id', row.id)
      results.push({ id: row.id, status: 'failed', error: err.message })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
