import { Router } from "express";
import { supabase } from "../db.js";

const router = Router();

// 1. Get Complexes
router.get("/", async (req, res) => {
  try {
    const { data: complexes, error } = await supabase
      .from('complexes')
      .select('*, buildings(id, units(id))')
      .order('name');
      
    if (error) throw error;

    const formatted = complexes.map((c: any) => {
      const building_count = c.buildings ? c.buildings.length : 0;
      const unit_count = c.buildings ? c.buildings.reduce((acc: number, b: any) => acc + (b.units ? b.units.length : 0), 0) : 0;
      const { buildings, ...rest } = c;
      return {
        ...rest,
        building_count,
        unit_count
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Add Complex with Auto-generation
router.post("/", async (req, res) => {
  try {
    const { name, district, neighborhood, buildings } = req.body;
    
    const { data: complexData, error: complexError } = await supabase
      .from('complexes')
      .insert([{ name, district, neighborhood }])
      .select()
      .single();
      
    if (complexError) throw complexError;
    const complexId = complexData.id;

    for (const b of buildings) {
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .insert([{ complex_id: complexId, name: b.name }])
        .select()
        .single();
        
      if (buildingError) throw buildingError;
      const buildingId = buildingData.id;

      const unitsToInsert = [];
      for (let f = 1; f <= b.floors; f++) {
        for (let u = 1; u <= b.lines; u++) {
          const unitNum = `${f}${String(u).padStart(2, '0')}`;
          unitsToInsert.push({
            building_id: buildingId,
            unit_number: unitNum,
            floor: f,
            area_m2: 84.00,
            status: '공실'
          });
        }
      }
      
      if (unitsToInsert.length > 0) {
        const { error: unitsError } = await supabase.from('units').insert(unitsToInsert);
        if (unitsError) throw unitsError;
      }
    }

    res.json({ id: complexId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import Complexes
router.post("/bulk", async (req, res) => {
  // ... (existing code)
});

// Delete Complex
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get buildings
    const { data: buildings, error: bSelectError } = await supabase.from('buildings').select('id').eq('complex_id', id);
    if (bSelectError) throw bSelectError;
    
    if (buildings && buildings.length > 0) {
      for (const building of buildings) {
        // Fetch units for this building
        const { data: units, error: uSelectError } = await supabase.from('units').select('id').eq('building_id', building.id);
        if (uSelectError) throw uSelectError;

        if (units && units.length > 0) {
          const unitIds = units.map(u => u.id);
          
          // Delete contracts in chunks
          const chunkSize = 100;
          for (let i = 0; i < unitIds.length; i += chunkSize) {
            const chunk = unitIds.slice(i, i + chunkSize);
            const { error: cError } = await supabase.from('contracts').delete().in('unit_id', chunk);
            if (cError) throw cError;
            
            const { error: uError } = await supabase.from('units').delete().in('id', chunk);
            if (uError) throw uError;
          }
        }

        // Delete building
        const { error: bError } = await supabase.from('buildings').delete().eq('id', building.id);
        if (bError) throw bError;
      }
    }

    // Delete complex
    const { error } = await supabase.from('complexes').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete complex error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Complex Details (with buildings, floors, lines)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: complex, error: complexError } = await supabase
      .from('complexes')
      .select('*')
      .eq('id', id)
      .single();
      
    if (complexError || !complex) return res.status(404).json({ error: "Complex not found" });

    const { data: buildingsData, error: buildingsError } = await supabase
      .from('buildings')
      .select('id, name, units(floor, unit_number)')
      .eq('complex_id', id)
      .order('name');
      
    if (buildingsError) throw buildingsError;

    const buildings = buildingsData.map((b: any) => {
      let maxFloor = 0;
      let maxLine = 0;
      if (b.units && b.units.length > 0) {
        maxFloor = Math.max(...b.units.map((u: any) => u.floor));
        maxLine = Math.max(...b.units.map((u: any) => parseInt(u.unit_number.slice(-2)) || 0));
      }
      return {
        id: b.id,
        name: b.name,
        floors: maxFloor,
        lines: maxLine
      };
    });

    res.json({ ...complex, buildings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Complex
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, district, neighborhood, buildings } = req.body;
    
    const { error: updateError } = await supabase
      .from('complexes')
      .update({ name, district, neighborhood })
      .eq('id', id);
    if (updateError) throw updateError;
    
    // Get existing buildings
    const { data: existingBuildings, error: getBError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('complex_id', id);
    if (getBError) throw getBError;
    
    const existingBuildingIds = existingBuildings.map((b: any) => b.id);
    const newBuildingIds = buildings.filter((b: any) => b.id).map((b: any) => b.id);
    
    // Delete removed buildings
    const buildingsToDelete = existingBuildingIds.filter(bId => !newBuildingIds.includes(bId));
    if (buildingsToDelete.length > 0) {
      const { error: delError } = await supabase.from('buildings').delete().in('id', buildingsToDelete);
      if (delError) throw delError;
    }

    for (const b of buildings) {
      let buildingId = b.id;
      if (buildingId) {
        const { error: bUpdateError } = await supabase.from('buildings').update({ name: b.name }).eq('id', buildingId);
        if (bUpdateError) throw bUpdateError;
      } else {
        const { data: newB, error: bInsertError } = await supabase.from('buildings').insert([{ complex_id: id, name: b.name }]).select().single();
        if (bInsertError) throw bInsertError;
        buildingId = newB.id;
      }

      // Handle units
      const { data: existingUnits, error: uGetError } = await supabase
        .from('units')
        .select('id, floor, unit_number')
        .eq('building_id', buildingId);
      if (uGetError) throw uGetError;
      
      const unitsToDelete = [];
      const existingUnitSet = new Set();
      
      for (const u of existingUnits) {
        const line = parseInt(u.unit_number.slice(-2)) || 0;
        if (u.floor > b.floors || line > b.lines) {
          unitsToDelete.push(u.id);
        } else {
          existingUnitSet.add(`${u.floor}-${line}`);
        }
      }
      
      if (unitsToDelete.length > 0) {
        const { error: uDelError } = await supabase.from('units').delete().in('id', unitsToDelete);
        if (uDelError) throw uDelError;
      }

      // Add missing units
      const unitsToInsert = [];
      for (let f = 1; f <= b.floors; f++) {
        for (let l = 1; l <= b.lines; l++) {
          if (!existingUnitSet.has(`${f}-${l}`)) {
            const unitNum = `${f}${String(l).padStart(2, '0')}`;
            unitsToInsert.push({
              building_id: buildingId,
              unit_number: unitNum,
              floor: f,
              area_m2: 84.00,
              status: '공실'
            });
          }
        }
      }
      
      if (unitsToInsert.length > 0) {
        const { error: uInsError } = await supabase.from('units').insert(unitsToInsert);
        if (uInsError) throw uInsError;
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Buildings for Complex
router.get("/:complexId/buildings", async (req, res) => {
  try {
    const { complexId } = req.params;
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('complex_id', complexId)
      .order('name');
      
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
