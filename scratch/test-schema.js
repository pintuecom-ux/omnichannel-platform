const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://dfaodhmeasbhrdcdjujw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYW9kaG1lYXNiaHJkY2RqdWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA1ODQ4NCwiZXhwIjoyMDkxNjM0NDg0fQ.FVOeRGGtajqGq8LpOGwRgjvPSTS5TQAyGKXOWFwBVVE')

async function run() {
  const { data: res } = await supabase.from('contacts').select('*').limit(1)
  console.log('contacts columns:', res && res.length ? Object.keys(res[0]) : 'Empty table')
}
run()
