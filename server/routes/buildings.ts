import { Router } from "express";
import { supabase } from "../db.js";
import { reverseTypeMap } from "../utils.js";

const router = Router();

// Get Units for Building
router.get("/:buildingId/units", async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { data, error } = await supabase
      .from('units')
      .select('*, contracts(id, type, expiration_date, tenant:tenant_id(name))')
      .eq('building_id', buildingId)
      .order('unit_number');
      
    if (error) throw error;

    // Map to include contract info for the UI
    const formatted = data.map((u: any) => {
      const activeContract = u.contracts && u.contracts.length > 0 ? u.contracts[0] : null;
      return {
        ...u,
        contract_id: activeContract?.id,
        contract_type: activeContract ? (reverseTypeMap[activeContract.type] || activeContract.type) : null,
        customer_name: activeContract?.tenant?.name,
        expiration_date: activeContract?.expiration_date,
        has_active_contract: !!activeContract
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
