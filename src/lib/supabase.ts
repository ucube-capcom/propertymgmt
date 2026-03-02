
import { createClient } from '@supabase/supabase-js';

//const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
//const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const supabaseUrl = "https://upmmldhvmeyysfkovcrl.supabase.co"; //
const supabaseKey = "sb_publishable_VVjyEX-VPPGo1AetcInSZQ_lIwbgsBy"; //

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

