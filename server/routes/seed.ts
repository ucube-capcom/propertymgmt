import { Router } from "express";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { supabase } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.post("/", async (req, res) => {
  try {
    const csvPath = path.resolve(__dirname, '../../complexes.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: "complexes.csv not found" });
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    });

    let complexCount = 0;
    let buildingCount = 0;

    for (const record of records) {
      const name = record['k-아파트명'];
      const district = record['주소(시군구)'];
      const neighborhood = record['주소(읍면동)'];
      const totalBuildings = parseInt(record['k-전체동수'] || '0', 10);

      if (!name || !district) continue;

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
        complexId = existing.id;
      } else {
        const { data: newComplex, error: complexError } = await supabase
          .from('complexes')
          .insert([{ name, district, neighborhood }])
          .select()
          .single();

        if (complexError) {
          console.error(`Error inserting complex ${name}:`, complexError.message);
          continue;
        }
        complexId = newComplex.id;
        complexCount++;
      }

      // 2. Check if buildings exist
      const { count } = await supabase
        .from('buildings')
        .select('*', { count: 'exact', head: true })
        .eq('complex_id', complexId);

      if (count && count > 0) continue;

      // 3. Generate Buildings and Units
      const buildingsToCreate = Math.min(totalBuildings || 1, 5); 
      
      for (let b = 1; b <= buildingsToCreate; b++) {
        const bName = `${100 + b}`;
        const { data: building, error: bError } = await supabase
          .from('buildings')
          .insert([{ complex_id: complexId, name: bName }])
          .select()
          .single();

        if (bError) continue;
        buildingCount++;

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

        await supabase.from('units').insert(unitsToInsert);
      }
    }

    res.json({ success: true, complexes: complexCount, buildings: buildingCount });
  } catch (error: any) {
    console.error("Seed error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
