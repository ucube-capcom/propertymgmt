import { supabase } from './server/db.js';

async function test() {
  console.log("Testing connection...");
  const { data, error } = await supabase.from('contracts').select().limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Columns:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
  }
}

test();
