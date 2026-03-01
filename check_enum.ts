
import { supabase } from "./server/db.ts";

async function checkEnum() {
  console.log("Checking unit_status enum values...");
  
  // Try to update a unit with an invalid status to see the error message
  // We need a valid unit ID first. Let's fetch one.
  const { data: units, error: fetchError } = await supabase.from('units').select('id').limit(1);
  
  if (fetchError) {
    console.error("Error fetching unit:", fetchError);
    return;
  }

  if (!units || units.length === 0) {
    console.log("No units found to test update.");
    return;
  }

  const unitId = units[0].id;
  console.log(`Testing with unit ID: ${unitId}`);

  const { error: updateError } = await supabase
    .from('units')
    .update({ status: 'INVALID_STATUS_TO_TRIGGER_ERROR' })
    .eq('id', unitId);

  if (updateError) {
    console.log("Update error message:", updateError.message);
    // The error message usually contains the valid enum values like:
    // invalid input value for enum unit_status: "INVALID_STATUS_TO_TRIGGER_ERROR"
    // DETAIL:  Key (status)=(INVALID_STATUS_TO_TRIGGER_ERROR) is not present in table "unit_status".
    // Wait, usually it lists valid values if it's an enum type in Postgres error message?
    // Sometimes it says: "invalid input value for enum unit_status: "..."
    // Let's see if we can get more details.
  } else {
    console.log("Update succeeded unexpectedly with invalid status!");
  }
}

checkEnum();
