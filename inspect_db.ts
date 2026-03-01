import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("Inspecting 'contracts' table...");
  const { data, error } = await supabase.from('contracts').select().limit(1);
  if (error) {
    console.error("Error fetching contracts:", error);
  } else {
    console.log("Contracts columns:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
  }

  console.log("\nInspecting 'persons' table...");
  const { data: pData, error: pError } = await supabase.from('persons').select().limit(1);
  if (pError) {
    console.error("Error fetching persons:", pError);
  } else {
    console.log("Persons columns:", pData.length > 0 ? Object.keys(pData[0]) : "No rows found");
  }
}

inspect();
