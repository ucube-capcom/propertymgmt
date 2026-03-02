import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function run() {
  const { data, error } = await supabase.from('contracts').select('*').limit(1);
  console.log(data, error);
}

run();
