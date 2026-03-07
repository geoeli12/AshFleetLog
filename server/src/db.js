// server/src/db.js
import { createClient } from "@supabase/supabase-js";

export let supabase = null;

/**
 * Collections define:
 * - table name in Supabase
 * - primary key column
 * - allowed columns (anything not listed is dropped)
 */
const COLLECTIONS = {
  drivers: {
    table: "drivers",
    primaryKey: "id",
    allowed: ["id", "name", "phone", "state", "active", "created_at"],
  },

  shifts: {
    table: "shifts",
    primaryKey: "id",
    allowed: [
      "id",
      "shift_date",
      "shift_type",
      "start_time",
      "end_time",
      "driver_name",
      "driver_id",
      "unit_number",
      "start_odometer",
      "end_odometer",
      "status",
      "attendance_status",
      "created_at",
    ],
  },

  runs: {
    table: "runs",
    primaryKey: "id",
    allowed: [
      "id",
      "run_date",
      "shift_id",
      "driver_id",
      "driver_name",
      "load_type",
      "run_type",
      "city",
      "customer_name",
      "trailer_dropped",
      "trailer_picked_up",
      "start_location",
      "end_location",
      "departure_time",
      "arrival_time",
      "notes",
      "created_at",
    ],
  },

  schedules: {
    table: "schedules",
    primaryKey: "id",
    allowed: ["id", "schedule_date", "data", "created_at"],
  },

  dispatch_orders: {
    table: "dispatch_orders",
    primaryKey: "id",
    allowed: [
      "id",
      "date",
      "region",
      "customer",
      "city",
      "bol_number",
      "item",
      "notes",
      "dock_hours",
      "eta",
      "trailer_number",
      "driver_name",
      "source_file_name",
      "created_at",
    ],
  },

  daily_orders: {
    table: "daily_orders",
    primaryKey: "id",
    allowed: [
      "id",
      "date",
      "customer",
      "ht",
      "pallet_1_6",
      "pallet_1_reg",
      "pallet_2_prem",
      "pallet_2_reg",
      "pallet_2x4",
      "customs_count",
      "bol_number",
      "po_number",
      "type",
      "notes",
      "created_at",
    ],
  },

  pickup_orders: {
    table: "pickup_orders",
    primaryKey: "id",
    allowed: [
      "id",
      "date_called_out",
      "date_picked_up",
      "region",
      "company",
      "eta",
      "dk_trl",
      "location",
      "driver",
      "shift_code",
      "notes",
      "created_at",
    ],
  },

  customLoadTypes: {
    table: "custom_load_types",
    primaryKey: "id",
    allowed: ["id", "label", "created_at"],
  },

  fuel_readings: {
    table: "fuel_readings",
    primaryKey: "id",
    allowed: [
      "id",
      "driver_id",
      "driver_name",
      "before_image",
      "after_image",
      "before_reading",
      "after_reading",
      "gallons_used",
      "date",
      "time",
      "notes",
      "created_at",
    ],
  },

  fuel_refills: {
    table: "fuel_refills",
    primaryKey: "id",
    allowed: [
      "id",
      "gallons_added",
      "date",
      "cost",
      "invoice_number",
      "notes",
      "running_total_after",
      "created_at",
    ],
  },

  fuel_tank: {
    table: "fuel_tank",
    primaryKey: "id",
    allowed: ["id", "current_gallons", "last_updated", "created_at"],
  },

  // ---- CUSTOMERS ----


  inventory_entries: {
    table: "inventory_entries",
    primaryKey: "id",
    allowed: [
      "id",
      "customer_name",
      "notes",
      "counted_by",
      "date",
      "date_count_received",
      "ash_pallet_ref",
      "trailer_number",
      "customer_ref",
      "pallet_48x40_1",
      "pallet_48x40_2",
      "large_odd",
      "small_odd",
      "chep_peco",
      "scrap_pull",
      "trash_pallets",
      "euro_pallets",
      "block_pallets",
      "stringer_pallets",
      "plastic_pallets",
      "bailed_cardboard",
      "occ",
      "boxes_of_plastic",
      "bailed_plastic",
      "gaylords",
      "boxes",
      "tops",
      "ibc_crates",
      "totes",
      "created_at",
    ],
  },

  customer_prices: {
    table: "customer_prices",
    primaryKey: "id",
    allowed: [
      "id",
      "customer_name",
      "pay_mixed",
      "flat_rate_per_load",
      "price_48x40_1",
      "price_48x40_2",
      "price_large_odd",
      "price_small_odd",
      "price_trash",
      "price_chep_peco",
      "price_expendable",
      "price_scrap_full_truck",
      "price_bailed_cardboard",
      "misc",
      "freight",
      "notes",
      "created_at",
    ],
  },

  customers_il: {
    table: "customers_il",
    primaryKey: "id",
    allowed: [
      "id",
      "customer",
      "address",
      "receiving_hours",
      "receiving_notes",
      "weekend_hours",
      "distance",
      "contact",
      "contact_phone",
      "contact_email",
      "notes",
      "drop_trailers",
      "coordinates",
      "dis",
      "eta",
      "created_at",
    ],
  },

  customers_pa: {
    table: "customers_pa",
    primaryKey: "id",
    allowed: [
      "id",
      "customer",
      "address",
      "receiving_hours",
      "receiving_notes",
      "weekend_hours",
      "distance",
      "contact",
      "contact_phone",
      "contact_email",
      "notes",
      "drop_trailers",
      "coordinates",
      "dis",
      "eta",
      "created_at",
    ],
  },
};

function requireCollection(key) {
  const c = COLLECTIONS[key];
  if (!c) throw new Error(`Unknown collection: ${key}`);
  return c;
}

function pickAllowed(collectionKey, payload) {
  const c = requireCollection(collectionKey);
  const out = {};
  for (const k of c.allowed) {
    if (payload && payload[k] !== undefined) out[k] = payload[k];
  }
  return out;
}

export function tableNameFor(collectionKey) {
  return requireCollection(collectionKey).table;
}

function normalizeNumericId(id) {
  if (id === undefined || id === null) return null;
  if (typeof id === "number" && Number.isFinite(id)) return Math.trunc(id);

  // Handle strings like "il-1", "pa-23", "IL-004" or even "  12  "
  if (typeof id === "string") {
    const s = id.trim();
    if (!s) return null;

    const m = s.match(/(\d+)/); // first number group
    if (!m) return null;

    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  return null;
}

/**
 * Normalize incoming payloads from the frontend.
 * IMPORTANT: returns ONLY allowed columns to prevent Supabase insert/update failures.
 */
export function normalizePayload(collectionKey, payload) {
  if (!payload || typeof payload !== "object") return {};

  const p = { ...payload };

  // ---- DRIVERS ----
  if (collectionKey === "drivers") {
    // UI variants -> DB column names
    if (p.driverName !== undefined && p.name === undefined) p.name = p.driverName;
    if (p.phoneNumber !== undefined && p.phone === undefined) p.phone = p.phoneNumber;

    delete p.driverName;
    delete p.phoneNumber;

    // Ensure active is always boolean so UI doesn't break filters/badges
    if (p.active === undefined || p.active === null) p.active = false;

    return pickAllowed(collectionKey, p);
  }

  // ---- SHIFTS ----
  if (collectionKey === "shifts") {
    // UI sends `date` sometimes; DB column is `shift_date`
    if (p.date !== undefined && p.shift_date === undefined) p.shift_date = p.date;
    delete p.date;

    // Ensure status default
    if (p.status === undefined || p.status === null || p.status === "") p.status = "active";

    return pickAllowed(collectionKey, p);
  }

  // ---- RUNS ----
  if (collectionKey === "runs") {
    // UI sends `date`; DB column is `run_date`
    if (p.date !== undefined && p.run_date === undefined) p.run_date = p.date;
    delete p.date;

    return pickAllowed(collectionKey, p);
  }

  // ---- DISPATCH ORDERS ----
  if (collectionKey === "dispatch_orders") {
    // Accept a few friendly UI keys
    if (p.bol !== undefined && p.bol_number === undefined) p.bol_number = p.bol;
    if (p.trl_number !== undefined && p.trailer_number === undefined) p.trailer_number = p.trl_number;
    if (p.trl !== undefined && p.trailer_number === undefined) p.trailer_number = p.trl;
    if (p.driver !== undefined && p.driver_name === undefined) p.driver_name = p.driver;

    delete p.bol;
    delete p.trl_number;
    delete p.trl;
    delete p.driver;

    return pickAllowed(collectionKey, p);
  }

  // ---- PICKUP ORDERS ----
  if (collectionKey === "pickup_orders") {
    // Friendly UI aliases
    if (p.called_out_date !== undefined && p.date_called_out === undefined) p.date_called_out = p.called_out_date;
    if (p.picked_up_date !== undefined && p.date_picked_up === undefined) p.date_picked_up = p.picked_up_date;
    if (p.dk_trl_number !== undefined && p.dk_trl === undefined) p.dk_trl = p.dk_trl_number;
    if (p.dk_trl_no !== undefined && p.dk_trl === undefined) p.dk_trl = p.dk_trl_no;
    if (p.driver_name !== undefined && p.driver === undefined) p.driver = p.driver_name;
    if (p.shift !== undefined && p.shift_code === undefined) p.shift_code = p.shift;

    delete p.called_out_date;
    delete p.picked_up_date;
    delete p.dk_trl_number;
    delete p.dk_trl_no;
    delete p.driver_name;
    delete p.shift;

    return pickAllowed(collectionKey, p);
  }

  // ---- CUSTOMERS (IL/PA) ----
  if (collectionKey === "customers_il" || collectionKey === "customers_pa") {
    if (p.receivingHours !== undefined && p.receiving_hours === undefined) p.receiving_hours = p.receivingHours;
    if (p.receivingNotes !== undefined && p.receiving_notes === undefined) p.receiving_notes = p.receivingNotes;
    if (p.weekendHours !== undefined && p.weekend_hours === undefined) p.weekend_hours = p.weekendHours;
    if (p.dropTrailers !== undefined && p.drop_trailers === undefined) p.drop_trailers = p.dropTrailers;
    if (p.contactPhone !== undefined && p.contact_phone === undefined) p.contact_phone = p.contactPhone;
    if (p.contactEmail !== undefined && p.contact_email === undefined) p.contact_email = p.contactEmail;

    delete p.receivingHours;
    delete p.receivingNotes;
    delete p.weekendHours;
    delete p.dropTrailers;
    delete p.contactPhone;
    delete p.contactEmail;

    // IMPORTANT: Your Excel/JSON may still have ids like "il-1" / "pa-1".
    // Supabase table uses bigint, so we must normalize to a numeric id.
    const nid = normalizeNumericId(p.id);
    if (nid === null) {
      delete p.id;
    } else {
      p.id = nid;
    }

    return pickAllowed(collectionKey, p);
  }

  // Default: strip to allowed keys
  return pickAllowed(collectionKey, p);
}

/**
 * Shape outgoing rows so frontend always gets what it expects.
 */
export function apiShape(collectionKey, row) {
  if (!row || typeof row !== "object") return row;

  if (collectionKey === "drivers") {
    const out = { ...row };

    // Always expose a boolean `active` to frontend
    if (out.active === undefined || out.active === null) out.active = false;

    // Some schemas use is_active; if present, map it
    if (out.active === false && out.is_active !== undefined && out.is_active !== null) {
      out.active = Boolean(out.is_active);
    }

    // Some schemas store phone_number; map it
    if (!out.phone && out.phone_number) out.phone = out.phone_number;

    return out;
  }

  if (collectionKey === "customers_il" || collectionKey === "customers_pa") {
    const out = { ...row };
    if (out.receiving_hours !== undefined && out.receivingHours === undefined) out.receivingHours = out.receiving_hours;
    if (out.receiving_notes !== undefined && out.receivingNotes === undefined) out.receivingNotes = out.receiving_notes;
    if (out.weekend_hours !== undefined && out.weekendHours === undefined) out.weekendHours = out.weekend_hours;
    if (out.drop_trailers !== undefined && out.dropTrailers === undefined) out.dropTrailers = out.drop_trailers;
    if (out.contact_phone !== undefined && out.contactPhone === undefined) out.contactPhone = out.contact_phone;
    if (out.contact_email !== undefined && out.contactEmail === undefined) out.contactEmail = out.contact_email;
    return out;
  }

  return row;
}

export async function initDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.");
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("drivers").select("id").limit(1);
  if (error && error.code !== "PGRST116") {
    console.log("Supabase check error:", error);
  }
}

export async function listRecords(collectionKey) {
  const c = requireCollection(collectionKey);

  const { data, error } = await supabase
    .from(c.table)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((r) => apiShape(collectionKey, r));
}

export async function getRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { data, error } = await supabase
    .from(c.table)
    .select("*")
    .eq(c.primaryKey, id)
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function createRecord(collectionKey, payload) {
  const c = requireCollection(collectionKey);

  const insertPayload = normalizePayload(collectionKey, payload);

  const { data, error } = await supabase
    .from(c.table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function updateRecord(collectionKey, id, payload) {
  const c = requireCollection(collectionKey);

  const updatePayload = normalizePayload(collectionKey, payload);

  const { data, error } = await supabase
    .from(c.table)
    .update(updatePayload)
    .eq(c.primaryKey, id)
    .select("*")
    .single();

  if (error) throw error;
  return apiShape(collectionKey, data);
}

export async function deleteRecord(collectionKey, id) {
  const c = requireCollection(collectionKey);

  const { error } = await supabase.from(c.table).delete().eq(c.primaryKey, id);
  if (error) throw error;
  return { ok: true };
}
