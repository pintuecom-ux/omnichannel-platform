const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

const supabase = createClient(
  'https://dfaodhmeasbhrdcdjujw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYW9kaG1lYXNiaHJkY2RqdWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA1ODQ4NCwiZXhwIjoyMDkxNjM0NDg0fQ.FVOeRGGtajqGq8LpOGwRgjvPSTS5TQAyGKXOWFwBVVE'
)

async function test() {
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('platform', 'facebook')
    .limit(1)
    .single()

  if (!channel) return console.log("No FB channel found")

  const psid = "26071499279214761"
  const token = channel.access_token

  console.log("Using token from channel:", channel.name)

  try {
    console.log("Trying /psid...")
    const res = await axios.get(`https://graph.facebook.com/v25.0/${psid}`, {
      params: { fields: 'name,first_name,last_name,profile_pic', access_token: token },
    })
    console.log("Result:", res.data)
  } catch (err) {
    console.log("Error 1:", err.response?.data || err.message)
    try {
      console.log("Trying /psid/picture...")
      const picRes = await axios.get(`https://graph.facebook.com/v25.0/${psid}/picture`, {
        params: { redirect: false, type: 'large', access_token: token },
      })
      console.log("Pic Result:", picRes.data)
    } catch (e2) {
      console.log("Error 2:", e2.response?.data || e2.message)
    }
  }
}

test()
