const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("=== Checking Vault secrets ===");

    // We can't query vault.secrets directly via postgREST unless it is exposed in the API settings.
    // Let's check if we can run it via a direct query. PostgREST usually doesn't expose the vault schema.
    // Wait, let's check if there is an error when querying or if we can do it.
    const { data, error } = await supabase
      .from('decrypted_secrets')
      .select('*')
      .eq('name', 'app_base_url')
      .maybeSingle();

    if (error) {
      console.log("Could not query decrypted_secrets directly (standard PostgREST behavior):", error.message);
      console.log("We will include the vault update in the SQL migration script for the user to run in the SQL Editor.");
    } else {
      console.log("Secret found in decrypted_secrets:", data);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
