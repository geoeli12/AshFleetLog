import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Download } from "lucide-react";

// NOTE: for styled XLSX export (borders/fills/bold), install:
// npm i xlsx-js-style
import * as XLSX from "xlsx-js-style";

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function toYmd(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function safeYmd(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toNullableInt(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
}

const numericKeys = [
  "pallet_1_6",
  "pallet_1_reg",
  "pallet_2_prem",
  "pallet_2_reg",
  "pallet_2x4",
  "customs_count",
];

const emptyForm = {
  date: "",
  company: "",
  ht: "",
  pallet_1_6: "",
  pallet_1_reg: "",
  pallet_2_prem: "",
  pallet_2_reg: "",
  pallet_2x4: "",
  customs_count: "",
  bol_number: "",
  po_number: "",
  type: "",
  notes: "",

  // UI-only fields (DO NOT save to DailyOrder table)
  region: "IL",
  address: "",
  dock_hours: "",
  eta: "",
};

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/10 px-4 py-3 shadow-sm">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

/** ============ XLSX EXPORT HELPERS (styled) ============ */
function downloadArrayBufferAsFile(buf, filename) {
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mkBorder() {
  return {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
}

function setCell(ws, addr, v, s) {
  ws[addr] = ws[addr] || {};
  ws[addr].v = v;
  if (s) ws[addr].s = s;
}

function safeNumOrBlank(v) {
  const n = Number(v ?? "");
  if (Number.isNaN(n) || v === null || v === undefined || String(v).trim() === "")
    return "";
  return n;
}

function exportDailyOrdersToXlsx({ dayName, ymd, orders }) {
  const headers = [
    "Company",
    "HT",
    "#1.6",
    "#1 Reg",
    "#2 Prem",
    "#2 Reg",
    "2x4",
    "Customs Count",
    "Bol #",
    "PO #",
    "Type",
    "Notes",
  ];

  const wb = XLSX.utils.book_new();
  const aoa = [];
  aoa.push([""]);

  const row2 = new Array(13).fill("");
  row2[1] = dayName || ""; // B
  let prettyDate = "";
  try {
    const [yy, mm, dd] = String(ymd).split("-").map((x) => Number(x));
    if (yy && mm && dd) prettyDate = `${mm}/${dd}/${yy}`;
  } catch {
    prettyDate = ymd || "";
  }
  row2[2] = prettyDate; // C
  aoa.push(row2);

  aoa.push(["", ...headers]);

  let t1_6 = 0;
  let t1_reg = 0;
  let t2_prem = 0;
  let t2_reg = 0;
  let t2x4 = 0;
  let tCustoms = 0;

  for (const o of orders) {
    t1_6 += Number(o?.pallet_1_6 ?? 0) || 0;
    t1_reg += Number(o?.pallet_1_reg ?? 0) || 0;
    t2_prem += Number(o?.pallet_2_prem ?? 0) || 0;
    t2_reg += Number(o?.pallet_2_reg ?? 0) || 0;
    t2x4 += Number(o?.pallet_2x4 ?? 0) || 0;
    tCustoms += Number(o?.customs_count ?? 0) || 0;

    aoa.push([
      "",
      o.customer || "", // DailyOrder table column is still "customer"
      o.ht || "",
      safeNumOrBlank(o.pallet_1_6),
      safeNumOrBlank(o.pallet_1_reg),
      safeNumOrBlank(o.pallet_2_prem),
      safeNumOrBlank(o.pallet_2_reg),
      safeNumOrBlank(o.pallet_2x4),
      safeNumOrBlank(o.customs_count),
      o.bol_number || "",
      o.po_number || "",
      o.type || "",
      o.notes || "",
    ]);
  }

  aoa.push([
    "",
    "TOTAL",
    "",
    t1_6,
    t1_reg,
    t2_prem,
    t2_reg,
    t2x4,
    tCustoms,
    "",
    "",
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [
    { wch: 2 },
    { wch: 18 }, // Company
    { wch: 14 }, // HT
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 34 },
    { wch: 12 },
  ];

  const border = mkBorder();

  setCell(ws, "B2", dayName || "", {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: "center", vertical: "center" },
  });
  setCell(ws, "C2", prettyDate || "", {
    font: { bold: true, sz: 14 },
    alignment: { horizontal: "center", vertical: "center" },
  });

  for (let i = 0; i < headers.length; i++) {
    const col = XLSX.utils.encode_col(1 + i);
    const addr = `${col}3`;
    setCell(ws, addr, headers[i], {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    });
  }

  const startRow = 4;
  const endRow = Math.max(4, 3 + orders.length + 1);
  const firstCol = 1;
  const lastCol = 12;
  const typeCol = 11;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = firstCol; c <= lastCol; c++) {
      const addr = XLSX.utils.encode_cell({ r: r - 1, c });
      const existing = ws[addr] || { v: "" };
      const isType = c === typeCol;
      ws[addr] = {
        ...existing,
        s: {
          border,
          alignment: { vertical: "center", wrapText: c === lastCol },
          ...(isType
            ? { fill: { patternType: "solid", fgColor: { rgb: "DDEBF7" } } }
            : {}),
        },
      };
    }
  }

  const totalRow = 3 + orders.length + 1;
  const thickTop = {
    top: { style: "medium", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

  for (let c = firstCol; c <= lastCol; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalRow - 1, c });
    const existing = ws[addr] || { v: "" };
    const isType = c === typeCol;
    const inSumCols = c >= 3 && c <= 8;
    ws[addr] = {
      ...existing,
      s: {
        ...(existing.s || {}),
        border: inSumCols ? thickTop : border,
        font: { bold: true },
        alignment: { vertical: "center", wrapText: c === lastCol },
        ...(isType ? { fill: { patternType: "solid", fgColor: { rgb: "DDEBF7" } } } : {}),
      },
    };
  }

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  range.e.c = Math.max(range.e.c, 13);
  range.e.r = Math.max(range.e.r, endRow - 1);
  ws["!ref"] = XLSX.utils.encode_range(range);

  XLSX.utils.book_append_sheet(wb, ws, "Daily Orders");

  const fileName = `DailyOrders_${ymd || "export"}.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadArrayBufferAsFile(out, fileName);
}
/** ===================================================== */

export default function DailyOrders() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  const ymd = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const [activeRegion, setActiveRegion] = useState("IL");

  const regionBadgeClass =
    activeRegion === "PA" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ["dailyOrders", ymd],
    queryFn: async () => {
      try {
        const res = await api.entities.DailyOrder.filter({ date: ymd }, "created_at");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
    enabled: Boolean(ymd),
  });

  const orders = useMemo(() => unwrapListResult(rawOrders), [rawOrders]);

  const summary = useMemo(() => {
    const s = {
      count: orders.length,
      pallet_1_6: 0,
      pallet_1_reg: 0,
      pallet_2_prem: 0,
      pallet_2_reg: 0,
      pallet_2x4: 0,
      customs_count: 0,
    };

    for (const o of orders) {
      for (const k of numericKeys) {
        const n = Number(o?.[k] ?? 0);
        if (!Number.isNaN(n)) s[k] += n;
      }
    }
    return s;
  }, [orders]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [activeOrder, setActiveOrder] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [companyFocused, setCompanyFocused] = useState(false);
  const ignoreCompanyBlurRef = useRef(false);

  const { data: rawCustomersIL } = useQuery({
    queryKey: ["customersIL"],
    queryFn: async () => {
      try {
        const res = await api.entities.CustomerIL.list("customer");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const { data: rawCustomersPA } = useQuery({
    queryKey: ["customersPA"],
    queryFn: async () => {
      try {
        const res = await api.entities.CustomerPA.list("customer");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const customersIL = useMemo(() => unwrapListResult(rawCustomersIL), [rawCustomersIL]);
  const customersPA = useMemo(() => unwrapListResult(rawCustomersPA), [rawCustomersPA]);

  const customerDirectory = useMemo(() => {
    const normalize = (v) => (v ?? "").toString().trim();

    const withMeta = (rows, region) =>
      (rows || []).map((r, idx) => ({
        _key: `${region}-${r?.id ?? idx}`,
        region,
        customer: normalize(r?.customer),
        address: normalize(r?.address),
        receivingHours: normalize(r?.receivingHours),
        receivingNotes: normalize(r?.receivingNotes),
        eta: normalize(r?.eta),
      }));

    return [...withMeta(customersIL, "IL"), ...withMeta(customersPA, "PA")].filter(
      (r) => r.customer
    );
  }, [customersIL, customersPA]);

  const normalizeCustomerKey = (v) =>
    (v ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^\d+\s+/, "")
      .replace(/^[-–—\s]+/, "")
      .trim();

  const findCustomerMatch = (companyName) => {
    const q = normalizeCustomerKey(companyName);
    if (!q) return null;

    const inRegion = customerDirectory.filter((r) => (r.region || "IL") === activeRegion);

    return (
      inRegion.find((r) => normalizeCustomerKey(r.customer) === q) ||
      inRegion.find((r) => normalizeCustomerKey(r.customer).startsWith(q)) ||
      inRegion.find((r) => normalizeCustomerKey(r.customer).includes(q)) ||
      customerDirectory.find((r) => normalizeCustomerKey(r.customer) === q) ||
      customerDirectory.find((r) => normalizeCustomerKey(r.customer).startsWith(q)) ||
      customerDirectory.find((r) => normalizeCustomerKey(r.customer).includes(q)) ||
      null
    );
  };

  const getDockHoursForCustomer = (companyName) => {
    const match = findCustomerMatch(companyName);
    if (!match) return "";
    return (match.receivingHours || match.receivingNotes || "").trim();
  };

  const getEtaForCustomer = (companyName) => {
    const match = findCustomerMatch(companyName);
    if (!match) return "";
    return (match.eta || "").trim();
  };

  const getAddressForCustomer = (companyName) => {
    const match = findCustomerMatch(companyName);
    if (!match) return "";
    return (match.address || "").trim();
  };

  const applyCustomerPick = (row) => {
    const dock = (row?.receivingHours || row?.receivingNotes || "").trim();
    const pickedRegion = (row?.region || activeRegion || "IL").toString().trim().toUpperCase();

    if (pickedRegion && pickedRegion !== activeRegion) setActiveRegion(pickedRegion);

    setForm((prev) => ({
      ...prev,
      region: pickedRegion || prev.region,
      company: row?.customer || prev.company,
      address: (row?.address || "").trim(),
      dock_hours: dock || "",
      eta: (row?.eta || "").trim() || "",
    }));
  };

  const tryAutoFillFromCustomer = () => {
    const companyName = String(form.company || "").trim();
    if (!companyName) return;

    const match = findCustomerMatch(companyName);
    const addr = match ? (match.address || "").trim() : getAddressForCustomer(companyName);
    const dock = match
      ? (match.receivingHours || match.receivingNotes || "").trim()
      : getDockHoursForCustomer(companyName);
    const eta = match ? (match.eta || "").trim() : getEtaForCustomer(companyName);

    if (!addr && !dock && !eta && !match) return;

    const matchRegion = (match?.region || form.region || activeRegion || "IL")
      .toString()
      .trim()
      .toUpperCase();

    setForm((prev) => ({
      ...prev,
      region: prev.region || matchRegion,
      address: prev.address || addr,
      dock_hours: prev.dock_hours || dock,
      eta: prev.eta || eta,
    }));
  };

  const companyMatches = useMemo(() => {
    const q = (form.company || "").trim().toLowerCase();
    if (!q) return [];

    const matches = customerDirectory.filter((c) =>
      String(c?.customer || "").toLowerCase().includes(q)
    );

    matches.sort((a, b) => {
      const aPri = (a.region || "IL") === activeRegion ? 0 : 1;
      const bPri = (b.region || "IL") === activeRegion ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      return String(a.customer || "").localeCompare(String(b.customer || ""), undefined, {
        sensitivity: "base",
      });
    });

    return matches.slice(0, 10);
  }, [form.company, customerDirectory, activeRegion]);

  const dayName = useMemo(() => {
    try {
      return format(selectedDate, "EEEE");
    } catch {
      return "";
    }
  }, [selectedDate]);

  const openAdd = () => {
    setMode("add");
    setActiveOrder(null);
    setForm({ ...emptyForm, date: ymd, region: activeRegion || "IL" });
    setDialogOpen(true);
  };

  const openEdit = (order) => {
    setMode("edit");
    setActiveOrder(order);

    const next = { ...emptyForm };
    next.date = safeYmd(order?.date) || ymd;
    next.company = order?.customer ?? "";
    next.ht = order?.ht ?? "";
    next.bol_number = order?.bol_number ?? "";
    next.po_number = order?.po_number ?? "";
    next.type = order?.type ?? "";
    next.notes = order?.notes ?? "";

    for (const k of numericKeys) {
      const v = order?.[k];
      next[k] = v === null || v === undefined ? "" : String(v);
    }

    next.address = "";
    next.dock_hours = "";
    next.eta = "";

    next.region = activeRegion || "IL";
    const inferred = findCustomerMatch(next.company);
    if (inferred?.region) next.region = String(inferred.region).trim().toUpperCase();

    setForm(next);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    if (mode !== "add") return;
    setForm((p) => ({ ...p, date: ymd }));
  }, [ymd, dialogOpen, mode]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (mode !== "add") return;
    setForm((p) => ({ ...p, region: p.region || activeRegion || "IL" }));
  }, [activeRegion, dialogOpen, mode]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!String(form.company || "").trim()) return;
    if (
      String(form.address || "").trim() &&
      String(form.dock_hours || "").trim() &&
      String(form.eta || "").trim()
    ) {
      return;
    }
    tryAutoFillFromCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, form.company, customerDirectory, activeRegion]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const buildPayload = () => {
    // DailyOrder table column stays as "customer" in Supabase
    const payload = {
      date: safeYmd(form.date) || ymd,
      customer: String(form.company ?? "").trim() || null,
      ht: String(form.ht ?? "").trim() || null,
      bol_number: String(form.bol_number ?? "").trim() || null,
      po_number: String(form.po_number ?? "").trim() || null,
      type: String(form.type ?? "").trim() || null,
      notes: String(form.notes ?? "").trim() || null,
    };

    for (const k of numericKeys) payload[k] = toNullableInt(form[k]);
    return payload;
  };

  const buildDispatchOrderPayload = () => {
    const region = (form.region || activeRegion || "IL").toString().trim().toUpperCase();
    const company = String(form.company ?? "").trim() || null;

    // Best compatibility: send BOTH keys. This prevents Supabase rejecting inserts
    // whether your dispatch_orders table uses "customer" OR "company".
    return {
      date: safeYmd(form.date) || ymd,
      region,
      company,
      customer: company,
      trailer_number: null,
      notes: String(form.notes ?? "").trim() || null,
      dock_hours: String(form.dock_hours ?? "").trim() || null,
      eta: String(form.eta ?? "").trim() || null,
      bol: String(form.bol_number ?? "").trim() || null,
      item: String(form.type ?? "").trim() || null,
      delivered_by: null,
    };
  };

  // Sync to dispatch_orders so ETA/Dock Hours/etc actually persist.
  // Strategy:
  //  - Try to find an existing DispatchOrder for the same date + company/customer (+ bol if present)
  //  - If found: update it
  //  - If not found (or filter fails): create a new one
  const syncDispatchOrder = async () => {
    const dispatchPayload = buildDispatchOrderPayload();

    const companyKey = dispatchPayload.company || dispatchPayload.customer;
    if (!companyKey) return;

    const dateKey = dispatchPayload.date;
    const bolKey = dispatchPayload.bol || null;

    try {
      // Best-effort search (depends on your apiClient/entity filter support)
      const filterObj = bolKey
        ? { date: dateKey, bol: bolKey, company: companyKey }
        : { date: dateKey, company: companyKey };

      let res = await api.entities.DispatchOrder.filter(filterObj, "created_at");
      const list = unwrapListResult(res);

      // If the API ignores the "company" filter because the column is actually "customer",
      // try again using "customer" as the filter key.
      if (!Array.isArray(list) || list.length === 0) {
        const filterObj2 = bolKey
          ? { date: dateKey, bol: bolKey, customer: companyKey }
          : { date: dateKey, customer: companyKey };
        res = await api.entities.DispatchOrder.filter(filterObj2, "created_at");
      }

      const list2 = unwrapListResult(res);
      const existing = Array.isArray(list2) && list2.length ? list2[0] : null;

      if (existing?.id) {
        await api.entities.DispatchOrder.update(existing.id, dispatchPayload);
      } else {
        await api.entities.DispatchOrder.create(dispatchPayload);
      }
    } catch {
      // If filter/update isn't supported in your apiClient, just create.
      await api.entities.DispatchOrder.create(dispatchPayload);
    }
  };


  const save = async () => {
    try {
      const payload = buildPayload();

      if (mode === "add") {
        await api.entities.DailyOrder.create(payload);

        try {
          await syncDispatchOrder();
        } catch (e) {
          // eslint-disable-next-line no-alert
          alert(
            `Daily Order saved, but creating Dispatch Order failed. ${
              e?.message ? String(e.message) : ""
            }`
          );
        }
      } else {
        if (!activeOrder?.id) return;
        await api.entities.DailyOrder.update(activeOrder.id, payload);
        try {
          await syncDispatchOrder();
        } catch {
          // ignore
        }
      }

      await qc.invalidateQueries({ queryKey: ["dailyOrders", ymd] });
      setDialogOpen(false);
      setActiveOrder(null);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not save order. ${e?.message ? String(e.message) : ""}`);
    }
  };

  const deleteOrder = async (order) => {
    if (!order?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete this order for "${order.customer || "Unknown"}"?`);
    if (!ok) return;

    try {
      await api.entities.DailyOrder.delete(order.id);
      await qc.invalidateQueries({ queryKey: ["dailyOrders", ymd] });
      if (activeOrder?.id === order.id) {
        setDialogOpen(false);
        setActiveOrder(null);
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not delete order. ${e?.message ? String(e.message) : ""}`);
    }
  };

  const onExport = () => {
    try {
      exportDailyOrdersToXlsx({
        dayName,
        ymd,
        orders,
      });
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(
        `Export failed. ${
          e?.message ? String(e.message) : "Make sure xlsx-js-style is installed."
        }`
      );
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="w-full px-6 py-6 space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {dayName}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setSelectedDate((d) => subDays(d, 1))}
                    aria-label="Previous day"
                    title="Previous day"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/10 px-3 py-2 shadow-sm">
                    <Input
                      type="date"
                      value={ymd}
                      onChange={(e) => {
                        const v = safeYmd(e.target.value);
                        if (!v) return;
                        const [yy, mm, dd] = v.split("-").map((x) => Number(x));
                        if (!yy || !mm || !dd) return;
                        setSelectedDate(new Date(yy, mm - 1, dd));
                      }}
                      className="h-9 w-[160px] rounded-xl"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setSelectedDate((d) => addDays(d, 1))}
                    aria-label="Next day"
                    title="Next day"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl bg-white/80 ring-1 ring-black/10 px-2 py-2 shadow-sm">
                  <Button
                    type="button"
                    variant={activeRegion === "IL" ? "default" : "outline"}
                    className={`rounded-2xl h-9 px-4 ${
                      activeRegion === "IL" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                    }`}
                    onClick={() => setActiveRegion("IL")}
                    title="IL Region"
                  >
                    IL
                  </Button>
                  <Button
                    type="button"
                    variant={activeRegion === "PA" ? "default" : "outline"}
                    className={`rounded-2xl h-9 px-4 ${
                      activeRegion === "PA" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    }`}
                    onClick={() => setActiveRegion("PA")}
                    title="PA Region"
                  >
                    PA
                  </Button>
                </div>

                <Button variant="outline" onClick={onExport} className="rounded-2xl">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <Button onClick={openAdd} className="rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <Stat label="Orders" value={summary.count} />
              <Stat label="#1.6" value={summary.pallet_1_6} />
              <Stat label="#1 Reg" value={summary.pallet_1_reg} />
              <Stat label="#2 Prem" value={summary.pallet_2_prem} />
              <Stat label="#2 Reg" value={summary.pallet_2_reg} />
              <Stat label="2x4" value={summary.pallet_2x4} />
              <Stat label="Customs" value={summary.customs_count} />
            </div>

            <div className="rounded-3xl ring-1 ring-black/10 bg-white overflow-x-auto">
              <Table className="table-auto min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Company</TableHead>
                    <TableHead className="whitespace-nowrap">HT</TableHead>
                    <TableHead className="whitespace-nowrap">#1.6</TableHead>
                    <TableHead className="whitespace-nowrap">#1 Reg</TableHead>
                    <TableHead className="whitespace-nowrap">#2 Prem</TableHead>
                    <TableHead className="whitespace-nowrap">#2 Reg</TableHead>
                    <TableHead className="whitespace-nowrap">2x4</TableHead>
                    <TableHead className="whitespace-nowrap">Customs Count</TableHead>
                    <TableHead className="whitespace-nowrap">BOL #</TableHead>
                    <TableHead className="whitespace-nowrap">PO #</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="min-w-[260px]">Notes</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-10 text-slate-600">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-10 text-slate-600">
                        No orders for this day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-amber-50/70"
                        onClick={() => openEdit(o)}
                        title="Click to edit"
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {o.customer || ""}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{o.ht || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_1_6 ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_1_reg ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2_prem ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2_reg ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.pallet_2x4 ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.customs_count ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.bol_number || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.po_number || ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{o.type || ""}</TableCell>
                        <TableCell className="whitespace-normal break-words">{o.notes || ""}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => openEdit(o)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => deleteOrder(o)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[85vh] overflow-hidden rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl">
                {mode === "add" ? "New Daily Order" : "Edit Daily Order"}
              </DialogTitle>

              <Badge
                className={`rounded-full px-3 py-1 text-xs font-semibold border-0 ${regionBadgeClass}`}
              >
                {activeRegion}
              </Badge>
            </div>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={safeYmd(form.date)}
                  onChange={(e) => setField("date", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2 relative">
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                  onFocus={() => setCompanyFocused(true)}
                  onBlur={() => {
                    if (ignoreCompanyBlurRef.current) {
                      ignoreCompanyBlurRef.current = false;
                      return;
                    }
                    tryAutoFillFromCustomer();
                    setCompanyFocused(false);
                  }}
                  placeholder="Uline - 16"
                  className="rounded-2xl"
                  autoComplete="off"
                />

                {companyFocused && companyMatches.length > 0 && (
                  <div
                    className="absolute z-30 mt-1 left-0 right-0 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden"
                    onMouseDown={() => {
                      ignoreCompanyBlurRef.current = true;
                    }}
                    onMouseUp={() => {
                      ignoreCompanyBlurRef.current = false;
                    }}
                  >
                    <div className="max-h-64 overflow-auto">
                      {companyMatches.map((c) => (
                        <button
                          type="button"
                          key={c._key ?? c.id ?? c.customer}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                          onClick={() => {
                            applyCustomerPick(c);
                            setCompanyFocused(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{c.customer}</div>
                              {c.address ? (
                                <div className="truncate text-xs text-slate-600">{c.address}</div>
                              ) : null}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                (c.region || "IL") === "PA"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {c.region || "IL"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Pulled from Customers (you can edit here)"
                  className="min-h-[80px] rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Dock Hours</Label>
                <Input
                  value={form.dock_hours}
                  onChange={(e) => setField("dock_hours", e.target.value)}
                  placeholder='e.g. "6am - 4am"'
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>ETA</Label>
                <Input
                  value={form.eta}
                  onChange={(e) => setField("eta", e.target.value)}
                  placeholder="e.g. 28 min"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>HT</Label>
                <Input
                  value={form.ht}
                  onChange={(e) => setField("ht", e.target.value)}
                  placeholder="Heat Treated"
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  placeholder="96x48"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>#1.6</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_1_6}
                  onChange={(e) => setField("pallet_1_6", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>#1 Reg</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_1_reg}
                  onChange={(e) => setField("pallet_1_reg", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>#2 Prem</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2_prem}
                  onChange={(e) => setField("pallet_2_prem", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>#2 Reg</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2_reg}
                  onChange={(e) => setField("pallet_2_reg", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>2x4</Label>
                <Input
                  inputMode="numeric"
                  value={form.pallet_2x4}
                  onChange={(e) => setField("pallet_2x4", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Customs Count</Label>
                <Input
                  inputMode="numeric"
                  value={form.customs_count}
                  onChange={(e) => setField("customs_count", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>BOL #</Label>
                <Input
                  value={form.bol_number}
                  onChange={(e) => setField("bol_number", e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>PO #</Label>
                <Input
                  value={form.po_number}
                  onChange={(e) => setField("po_number", e.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Optional"
                  className="min-h-[110px] rounded-2xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {mode === "edit" ? (
              <Button
                variant="destructive"
                className="rounded-2xl mr-auto"
                onClick={() => deleteOrder(activeOrder)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : null}

            <Button variant="outline" className="rounded-2xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-2xl" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}