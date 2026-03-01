import { Router } from "express";
import { supabase } from "../db.js";
import { reverseTypeMap } from "../utils.js";

const router = Router();

// Get Contracts for Unit
router.get("/:unitId/contracts", async (req, res) => {
  try {
    const { unitId } = req.params;
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        id,
        unit_id,
        type,
        price_sale,
        price_deposit,
        price_rent,
        contract_date,
        move_in_date,
        expiration_date,
        notes,
        created_at,
        tenant_id,
        owner_id,
        tenant:tenant_id(id, name, phone),
        owner:owner_id(id, name)
      `)
      .eq('unit_id', unitId)
      .order('contract_date', { ascending: false });
      
    if (error) throw error;

    // Map DB fields to frontend fields
    const mappedData = data.map((c: any) => ({
      id: c.id,
      unit_id: c.unit_id,
      type: reverseTypeMap[c.type] || c.type,
      price_sale: c.price_sale || 0,
      price_deposit: c.price_deposit || 0,
      price_rent: c.price_rent || 0,
      customer_name: c.tenant?.name || 'Unknown',
      customer_phone: c.tenant?.phone || '',
      owner_name: c.owner?.name || '',
      contract_date: c.contract_date || '',
      move_in_date: c.move_in_date || '',
      expiration_date: c.expiration_date || '',
      notes: c.notes || '',
      created_at: c.created_at,
      person_id: c.tenant_id // Include tenant_id as person_id for updates
    }));

    res.json(mappedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
