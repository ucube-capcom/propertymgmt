import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const csvPath = path.resolve(__dirname, 'complexes.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  });

  console.log(`Found ${records.length} records in CSV.`);

  for (const record of records) {
    const name = record['k-아파트명'];
    const district = record['주소(시군구)'];
    const neighborhood = record['주소(읍면동)'];
    const totalBuildings = parseInt(record['k-전체동수'] || '0', 10);
    const totalUnits = parseInt(record['k-전체세대수'] || '0', 10);

    if (!name || !district) continue;

    console.log(`Processing ${name} (${district})...`);

    // 1. Check if complex exists
    const { data: existing } = await supabase
      .from('complexes')
      .select('id')
      .eq('name', name)
      .eq('district', district)
      .eq('neighborhood', neighborhood)
      .maybeSingle();

    let complexId;

    if (existing) {
      console.log(`  Complex already exists: ${existing.id}`);
      complexId = existing.id;
    } else {
      // 2. Insert Complex
      const { data: newComplex, error: complexError } = await supabase
        .from('complexes')
        .insert([{ name, district, neighborhood }])
        .select()
        .single();

      if (complexError) {
        console.error(`  Error inserting complex ${name}:`, complexError.message);
        continue;
      }
      complexId = newComplex.id;
      console.log(`  Created complex: ${complexId}`);
    }

    // 3. Check if buildings exist (simple check)
    const { count } = await supabase
      .from('buildings')
      .select('*', { count: 'exact', head: true })
      .eq('complex_id', complexId);

    if (count && count > 0) {
      console.log(`  Buildings already exist for complex ${complexId}, skipping building generation.`);
      continue;
    }

    // 4. Generate Buildings and Units
    // Limit total buildings to max 5 to avoid timeouts during seeding of large datasets
    const buildingsToCreate = Math.min(totalBuildings || 1, 5); 
    
    for (let b = 1; b <= buildingsToCreate; b++) {
      const bName = `${100 + b}`;
      const { data: building, error: bError } = await supabase
        .from('buildings')
        .insert([{ complex_id: complexId, name: bName }])
        .select()
        .single();

      if (bError) {
        console.error(`  Error inserting building ${bName}:`, bError.message);
        continue;
      }

      // Generate some units for this building
      // Default: 10 floors, 4 units per floor = 40 units
      const unitsToInsert = [];
      const floors = 10;
      const lines = 4;

      for (let f = 1; f <= floors; f++) {
        for (let l = 1; l <= lines; l++) {
          const unitNum = `${f}${String(l).padStart(2, '0')}`;
          unitsToInsert.push({
            building_id: building.id,
            unit_number: unitNum,
            floor: f,
            area_m2: 84.00,
            status: '공실'
          });
        }
      }

      const { error: uError } = await supabase.from('units').insert(unitsToInsert);
      if (uError) {
        console.error(`  Error inserting units for building ${bName}:`, uError.message);
      } else {
        console.log(`  Created building ${bName} with ${unitsToInsert.length} units.`);
      }
    }
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
