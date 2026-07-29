const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (key) => env.split('\n').find(line => line.startsWith(key + '='))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function describeSegments() {
  // Try to insert a dummy to get schema, or just select 1 if it has rows
  const { data, error } = await supabase.from('segments').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Segments Schema:', Object.keys(data[0]));
    } else {
      console.log('Segments table is empty. Attempting dummy insert to fetch schema...');
      const { data: d2, error: e2 } = await supabase.from('segments').insert({ workspace_id: 'e066de40-e0c5-46da-8038-adcec4ce17b1', name: 'dummy', slug: 'dummy-123' }).select();
      if (e2) { console.error('Insert error:', e2); }
      else { 
        console.log('Segments Schema (after dummy insert):', Object.keys(d2[0]));
        await supabase.from('segments').delete().eq('id', d2[0].id);
      }
    }
  }
}

describeSegments();
