const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://dfaodhmeasbhrdcdjujw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYW9kaG1lYXNiaHJkY2RqdWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA1ODQ4NCwiZXhwIjoyMDkxNjM0NDg0fQ.FVOeRGGtajqGq8LpOGwRgjvPSTS5TQAyGKXOWFwBVVE'
)

async function test() {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, avatar_url, facebook_scoped_id, instagram_scoped_id')
    .order('created_at', { ascending: false })
    .limit(10)

  console.log("Recent Contacts:")
  console.log(JSON.stringify(data, null, 2))
}

test()
