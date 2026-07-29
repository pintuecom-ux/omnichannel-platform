const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (key) => env.split('\n').find(line => line.startsWith(key + '='))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLists() {
  const { data, error } = await supabase.from('lists').select('id, name, is_archived');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Lists:', JSON.stringify(data, null, 2));
  }
}

checkLists();
