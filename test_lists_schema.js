const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (key) => env.split('\n').find(line => line.startsWith(key + '='))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function describeLists() {
  const { data, error } = await supabase.from('lists').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Lists Schema (from first row):', data[0] ? Object.keys(data[0]) : 'Table is empty');
  }
}

describeLists();
