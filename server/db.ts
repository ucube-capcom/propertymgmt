import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_QXTUKKl3aaWISmxmdDKOUw_QGxZxqta";

if (!supabaseUrl) {
  console.warn("SUPABASE_URL is not set. Please set it in your environment variables.");
}

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey);
