import { supabase } from "./server/db.js";

async function checkUnits() {
  const { data, error } = await supabase.from('units').select('*').limit(1);
  if (error) {
    console.error('Error fetching unit:', error);
  } else {
    console.log('Unit data:', data[0]);
  }
}

checkUnits();
