import { Router } from "express";
import { supabase } from "../db.js";
import { typeMap, reverseTypeMap } from "../utils.js";

const router = Router();

// Search Contracts and Units
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);

    const terms = q.toLowerCase().split(' ').filter(t => t.trim().length > 0);
    if (terms.length === 0) return res.json([]);

    const results: any[] = [];

    // 1. Search persons by name or phone
    const { data: persons, error: pError } = await supabase
      .from('persons')
      .select('id, name, phone')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

    if (pError) throw pError;

    if (persons && persons.length > 0) {
      const personIds = persons.map(p => p.id);
      const { data: contracts, error: cError } = await supabase
        .from('contracts')
        .select(`*`)
        .in('tenant_id', personIds)
        .limit(1);

      if (contracts && contracts.length > 0) {
        console.log('DEBUG: Contracts table columns:', Object.keys(contracts[0]));
      }
      
      const { data: allContracts, error: allCError } = await supabase
        .from('contracts')
        .select(`
          id, 
          tenant_id,
          unit_id,
          units (
            unit_number,
            building_id,
            buildings (
              name,
              complex_id,
              complexes (
                name
              )
            )
          )
        `)
        .in('tenant_id', personIds);

      if (cError || allCError) throw (cError || allCError);

      allContracts.forEach((c: any) => {
        const person = persons.find(p => p.id === c.tenant_id);
        results.push({
          type: 'contract',
          id: c.id,
          customer_name: person?.name || 'Unknown',
          customer_phone: person?.phone || '',
          unit_id: c.unit_id,
          unit_number: c.units?.unit_number,
          building_id: c.units?.building_id,
          building_name: c.units?.buildings?.name,
          complex_id: c.units?.buildings?.complex_id,
          complex_name: c.units?.buildings?.complexes?.name
        });
      });
    }

    // 2. Search Units/Buildings/Complexes
    // Fetch all units with their relations (since it's a small DB, this is fine for quick search)
    // For larger DBs, we would use a Postgres function or pg_trgm
    const { data: allUnits, error: uError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        building_id,
        buildings (
          name,
          complex_id,
          complexes (
            name
          )
        )
      `);

    if (uError) throw uError;

    if (allUnits) {
      const matchedUnits = allUnits.filter((u: any) => {
        const complexName = u.buildings?.complexes?.name || '';
        const buildingName = u.buildings?.name || '';
        const unitNumber = u.unit_number || '';
        
        const fullName = `${complexName} ${buildingName}동 ${unitNumber}호`.toLowerCase();
        const shortName = `${complexName} ${buildingName} ${unitNumber}`.toLowerCase();
        
        return terms.every(t => fullName.includes(t) || shortName.includes(t));
      });

      // Take top 20 to avoid huge payloads
      matchedUnits.slice(0, 20).forEach((u: any) => {
        // Avoid duplicates if already added via contract
        if (!results.some(r => r.unit_id === u.id && r.type === 'unit')) {
          results.push({
            type: 'unit',
            id: `unit_${u.id}`,
            customer_name: '단지/호수 검색',
            unit_id: u.id,
            unit_number: u.unit_number,
            building_id: u.building_id,
            building_name: u.buildings?.name,
            complex_id: u.buildings?.complex_id,
            complex_name: u.buildings?.complexes?.name
          });
        }
      });
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error searching contracts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Add Contract
router.post("/", async (req, res) => {
  try {
    console.log('Adding contract:', req.body);
    const { 
      unit_id, 
      customer_name, 
      customer_phone, 
      type, 
      price_sale, 
      price_deposit, 
      price_rent, 
      contract_date, 
      move_in_date, 
      expiration_date, 
      notes,
      owner_name
    } = req.body;
    
    if (!unit_id) {
      return res.status(400).json({ error: 'unit_id is required' });
    }

    // 1. Find or create person (customer/tenant)
    let tenantId;
    const phoneVal = customer_phone ? customer_phone.trim() : null;
    const nameVal = customer_name ? customer_name.trim() : 'Unknown';
    
    if (phoneVal) {
      const { data: existing, error: findError } = await supabase
        .from('persons')
        .select('id')
        .eq('phone', phoneVal)
        .maybeSingle();
      
      if (findError) {
        console.error('Error finding tenant:', findError);
      } else if (existing) {
        tenantId = existing.id;
      }
    }
    
    if (!tenantId) {
      const { data: newPerson, error: personError } = await supabase
        .from('persons')
        .insert([{ name: nameVal, phone: phoneVal }])
        .select('id')
        .single();
      
      if (personError) {
        console.error('Error creating tenant:', personError);
        throw personError;
      }
      tenantId = newPerson.id;
    }

    // 1.1 Find or create person (owner)
    let ownerId = null;
    if (owner_name) {
      const { data: existingOwner, error: ownerFindError } = await supabase
        .from('persons')
        .select('id')
        .eq('name', owner_name.trim())
        .maybeSingle();
      
      if (existingOwner) {
        ownerId = existingOwner.id;
      } else {
        const { data: newOwner, error: ownerCreateError } = await supabase
          .from('persons')
          .insert([{ name: owner_name.trim() }])
          .select('id')
          .single();
        if (!ownerCreateError) ownerId = newOwner.id;
      }
    }

    // 2. Create contract
    const contractType = typeMap[type] || type;
    
    const insertData: any = {
      unit_id,
      tenant_id: tenantId,
      owner_id: ownerId,
      type: contractType,
      price_sale: type === 'sale' ? (price_sale || 0) : 0,
      price_deposit: type !== 'sale' ? (price_deposit || 0) : 0,
      price_rent: price_rent || 0,
      contract_date: contract_date || null,
      move_in_date: move_in_date || null,
      expiration_date: expiration_date || null,
      notes,
      is_active: true
    };

    console.log('Inserting contract data:', insertData);

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert([insertData])
      .select('id')
      .maybeSingle();
      
    if (contractError) {
      console.error('Supabase contract error:', {
        message: contractError.message,
        details: contractError.details,
        hint: contractError.hint,
        code: contractError.code
      });
      throw contractError;
    }

    if (!contract) {
      throw new Error('Failed to create contract - no data returned');
    }

    // 3. Update unit status (Optional, the UI uses contracts to determine status)
    // Valid enum values found: '공실', '거주중'
    // We use '거주중' for any active contract for now.
    const { error: unitError } = await supabase
      .from('units')
      .update({ status: '거주중' }) 
      .eq('id', unit_id);
    
    if (unitError) {
      console.error('Error updating unit status:', unitError.message || JSON.stringify(unitError));
    }

    res.json(contract);
  } catch (error: any) {
    console.error('Error adding contract:', error);
    res.status(500).json({ 
      error: error.message || 'Unknown error',
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null
    });
  }
});

// Update Contract
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_name, 
      customer_phone, 
      type, 
      price_sale, 
      price_deposit, 
      price_rent, 
      contract_date, 
      move_in_date, 
      expiration_date, 
      notes,
      owner_name,
      person_id 
    } = req.body;
    
    // Update person (tenant)
    if (person_id) {
      const { error: personError } = await supabase
        .from('persons')
        .update({ name: customer_name, phone: customer_phone || null })
        .eq('id', person_id);
      
      if (personError) {
        console.error('Error updating tenant:', personError);
      }
    }

    // Update/Create owner if name provided
    let ownerId = null;
    if (owner_name) {
      const { data: existingOwner } = await supabase
        .from('persons')
        .select('id')
        .eq('name', owner_name.trim())
        .maybeSingle();
      
      if (existingOwner) {
        ownerId = existingOwner.id;
      } else {
        const { data: newOwner } = await supabase
          .from('persons')
          .insert([{ name: owner_name.trim() }])
          .select('id')
          .single();
        if (newOwner) ownerId = newOwner.id;
      }
    }

    const contractType = typeMap[type] || type;

    const updateData: any = {
      type: contractType,
      price_sale: type === 'sale' ? (price_sale || 0) : 0,
      price_deposit: type !== 'sale' ? (price_deposit || 0) : 0,
      price_rent: price_rent || 0,
      contract_date: contract_date || null,
      move_in_date: move_in_date || null,
      expiration_date: expiration_date || null,
      notes
    };

    if (ownerId) updateData.owner_id = ownerId;

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .select('id')
      .maybeSingle();
      
    if (contractError) {
      console.error('Supabase update contract error:', {
        message: contractError.message,
        details: contractError.details,
        hint: contractError.hint,
        code: contractError.code
      });
      throw contractError;
    }

    if (!contract) {
      throw new Error('Contract not found or update failed');
    }
    
    res.json(contract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    res.status(500).json({ 
      error: error.message || 'Unknown error',
      details: error.details || null,
      code: error.code || null
    });
  }
});

// Delete Contract
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting contract ${id}`);
    
    // Get unit_id before deleting
    const { data: contract, error: fetchError } = await supabase.from('contracts').select('unit_id').eq('id', id).single();
    
    if (fetchError) {
      console.error('Error fetching contract for deletion:', fetchError);
      // If contract doesn't exist, we can't delete it, but maybe it's already gone.
      // Let's proceed to try deleting anyway to be safe, or return 404.
    }

    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting contract:', error);
      throw error;
    }

    // Check if unit has other contracts, if not, set to 공실
    if (contract?.unit_id) {
      const { count, error: countError } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', contract.unit_id);
      
      if (countError) console.error('Error counting contracts:', countError);

      if (count === 0) {
        const { error: updateError } = await supabase.from('units').update({ status: '공실' }).eq('id', contract.unit_id);
        if (updateError) console.error('Error setting unit to vacant:', updateError);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
