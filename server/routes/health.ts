import { Router } from "express";
import { supabase } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { count, error } = await supabase.from('complexes').select('*', { count: 'exact', head: true });
    res.json({ 
      status: "ok", 
      db_connected: !error,
      complex_count: count || 0
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/inspect", async (req, res) => {
  try {
    const { data, error } = await supabase.from('contracts').select().limit(1);
    if (error) return res.json({ error });
    const columns = data.length > 0 ? Object.keys(data[0]) : "No rows found to inspect columns";
    res.json({ columns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
