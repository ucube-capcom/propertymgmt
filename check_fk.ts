import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      tenant:persons!contracts_tenant_id_fkey(name, phone),
      owner:persons!contracts_owner_id_fkey(name, phone)
    `)
    .limit(1);
  console.log(JSON.stringify(data, null, 2), error);
}

run();
