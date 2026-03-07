import { supabase, normalizePayload, apiShape, tableNameFor } from "../db.js";
import { makeEntityRouter } from "./entityRouter.js";

const collectionKey = "customers_pa";
const table = tableNameFor(collectionKey);

const router = makeEntityRouter({ collectionKey });

// Bulk upsert (used to initialize from the built-in Excel JSON seed)
// Body can be: { rows: [...] } OR just an array
router.post("/bulk", async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body?.rows;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "Expected body to be an array or { rows: [...] }" });
    }

    const payloads = rows
      .map((r) => normalizePayload(collectionKey, r))
      .filter((p) => Object.keys(p || {}).length);

    if (!payloads.length) return res.json({ ok: true, count: 0 });

    const { data, error } = await supabase
      .from(table)
      .upsert(payloads, { onConflict: "id" })
      .select("*");

    if (error) {
      console.error("CUSTOMERS_PA bulk upsert error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ ok: true, count: (data || []).length, rows: (data || []).map((r) => apiShape(collectionKey, r)) });
  } catch (e) {
    console.error("CUSTOMERS_PA bulk exception:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
