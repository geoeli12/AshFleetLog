// src/api/apiClient.js
// Standalone (no Base44) API client for this app.
// Default: use Vite proxy to /api => http://localhost:5050
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function req(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`,
    {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    }
  );

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) ? data.error : res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function makeEntity(resource) {
  return {
    list: (sort) => req(`/api/${resource}${sort ? `?sort=${encodeURIComponent(sort)}` : ""}`),
    filter: (where = {}, sort) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(where || {})) {
        if (v === undefined || v === null || v === "") continue;
        qs.set(k, String(v));
      }
      if (sort) qs.set("sort", sort);
      const s = qs.toString();
      return req(`/api/${resource}${s ? `?${s}` : ""}`);
    },
    create: (data) => req(`/api/${resource}`, { method: "POST", body: JSON.stringify(data || {}) }),
    update: (id, data) => req(`/api/${resource}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data || {}) }),
    delete: (id) => req(`/api/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const api = {
  entities: {
    Driver: makeEntity("drivers"),
    Shift: makeEntity("shifts"),
    Run: makeEntity("runs"),
    Schedule: makeEntity("schedules"),
    DispatchOrder: makeEntity("dispatch-orders"),
    PickupOrder: makeEntity("pickup-orders"),
    CustomLoadType: makeEntity("custom-load-types"),
    FuelReading: makeEntity("fuel-readings"),
    FuelRefill: makeEntity("fuel-refills"),
    FuelTank: makeEntity("fuel-tank"),

    // Customers
    CustomerIL: makeEntity("customers-il"),
    CustomerPA: makeEntity("customers-pa"),

    // Inventory
    InventoryEntry: makeEntity("inventory-entries"),

    // Customer pricing
    CustomerPrice: makeEntity("customer-prices"),

    // Daily Orders
    DailyOrder: makeEntity("daily-orders"),
  },

  custom: {
    customersIL: {
      bulkUpsert: (rows) => req("/api/customers-il/bulk", { method: "POST", body: JSON.stringify({ rows: rows || [] }) }),
    },
    customersPA: {
      bulkUpsert: (rows) => req("/api/customers-pa/bulk", { method: "POST", body: JSON.stringify({ rows: rows || [] }) }),
    },
  },
};
