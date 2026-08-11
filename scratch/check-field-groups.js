const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkSchema() {
  const { data, error } = await supabase.from('field_groups').select('*').limit(1)
  if (error) {
    console.error('Error fetching field_groups:', error)
  } else if (data && data.length > 0) {
    console.log('field_groups columns:', Object.keys(data[0]))
  } else {
    // If empty, we can try to fetch a single row with headers or just get the definition somehow.
    // Easiest is to insert a dummy and see error, or just use rpc.
    console.log('field_groups is empty, trying to insert a dummy row to get schema')
    const { error: insertError } = await supabase.from('field_groups').insert({}).select()
    console.log('Insert error:', insertError)
  }
}
checkSchema()
