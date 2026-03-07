import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, RefreshCw, Search, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, addDays, subDays } from "date-fns";
import DispatchTable from "@/components/dispatch/DispatchTable";
import AddDispatchForm from "@/components/dispatch/AddDispatchForm";
import StatusSummary from "@/components/dispatch/StatusSummary";
import { toast } from "sonner";

const PENDING_BOL_PREFIX = "__PENDING_BOL__:";

function parseYMDToLocalDate(ymd) {
  // Avoid `new Date('YYYY-MM-DD')` (UTC parsing) which causes off-by-one in US timezones.
  if (!ymd || typeof ymd !== "string" || ymd.length < 10) return new Date();
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function looksNumericId(v) {
  const s = String(v ?? "").trim();
  return s !== "" && /^\d+$/.test(s);
}

function isPendingBol(v) {
  const s = String(v ?? "").trim();
  return s.startsWith(PENDING_BOL_PREFIX);
}

function cleanBolForUi(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (isPendingBol(s)) return "";
  return s;
}

function makePendingBolToken(dateYmd) {
  // Must be NOT NULL + unique per row (DB has unique constraint with bol in key)
  const rand = Math.random().toString(16).slice(2);
  return `${PENDING_BOL_PREFIX}${dateYmd}:${Date.now()}:${rand}`;
}

function normalizeIncomingUiRow(ui, fallbackDateYmd) {
  // Defensive normalization for bulk-paste rows.
  // Common issue: Excel paste includes a leading index column (1,2,3...), shifting everything right.
  const out = {
    date: ui?.date || fallbackDateYmd || "",
    company: String(ui?.company ?? ""),
    trailer_number: String(ui?.trailer_number ?? ""),
    notes: String(ui?.notes ?? ""),
    dock_hours: String(ui?.dock_hours ?? ""),
    eta: String(ui?.eta ?? ""),
    bol: String(ui?.bol ?? ""),
    item: String(ui?.item ?? ""),
    delivered_by: String(ui?.delivered_by ?? ""),
  };

  const companyIsIndex = looksNumericId(out.company);
  const nextLooksLikeCompany = out.trailer_number && /[A-Za-z]/.test(out.trailer_number);
  const deliveredLooksLikeItem = out.delivered_by && (/(\d+\s*[xX]\s*\d+)/.test(out.delivered_by) || /baled|occ/i.test(out.delivered_by));
  const itemIsBlankish = !out.item || out.item.trim() === "-";
  const bolIsBlankish = !out.bol || out.bol.trim() === "-";

  if (companyIsIndex && nextLooksLikeCompany && deliveredLooksLikeItem && itemIsBlankish && bolIsBlankish) {
    // Shift left by 1 slot, and treat delivered_by as item.
    out.company = out.trailer_number;
    out.trailer_number = out.notes;
    out.notes = out.dock_hours;
    out.dock_hours = out.eta;
    out.eta = out.bol;
    out.bol = out.item;
    out.item = out.delivered_by;
    out.delivered_by = "";
  }

  // Clean up common placeholders
  const dashToEmpty = (s) => {
    const t = String(s ?? "").trim();
    return t === "-" ? "" : t;
  };
  out.company = dashToEmpty(out.company);
  out.trailer_number = dashToEmpty(out.trailer_number);
  out.notes = dashToEmpty(out.notes);
  out.dock_hours = dashToEmpty(out.dock_hours);
  out.eta = dashToEmpty(out.eta);
  out.bol = dashToEmpty(out.bol);
  out.item = dashToEmpty(out.item);
  out.delivered_by = dashToEmpty(out.delivered_by);

  // If BOL is blank, generate a unique placeholder so DB NOT NULL + unique constraint won't crash.
  if (!out.bol) {
    const ymd = toYMD(out.date) || fallbackDateYmd || toYMD(new Date());
    out.bol = makePendingBolToken(ymd);
  }

  return out;
}

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  // Accept ISO timestamps and YYYY-MM-DD
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  // Fallback: Date parse
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function hasRealBol(uiLog) {
  // UI already strips pending BOL tokens, so "real" BOL = non-empty string.
  return String(uiLog?.bol ?? "").trim() !== "";
}

function toUiLog(order) {
  const region = (order.region ?? order.state ?? order.location ?? order.site ?? order.area ?? order.market ?? "");
  return {
    id: order.id,
    date: toYMD(order.date),
    region: String(region || ""),
    created_at: order.created_at ?? order.inserted_at ?? order.createdAt ?? null,
    company: order.customer ?? order.company ?? "",
    trailer_number: order.trailer_number ?? "",
    notes: order.notes ?? "",
    dock_hours: order.dock_hours ?? "",
    eta: order.eta ?? order.ETA ?? order.eta_time ?? order.eta_minutes ?? "", 
    // Keep the raw DB value so edits don't accidentally overwrite our
    // generated pending-token (used to keep rows with blank BOL unique).
    bol_token: String(order.bol_number ?? order.bol ?? ""),
    bol: cleanBolForUi(order.bol_number ?? order.bol ?? ""),
    item: (order.item ?? order.item_description ?? order.item_desc ?? order.item_info ?? order.items ?? order.item_name ?? order.item_text ?? order.itemText ?? order.load_item ?? order.loadItem ?? order.product ?? order.description ?? ""),
    delivered_by: order.driver_name ?? order.delivered_by ?? "",
  };
}

function toDbPayload(ui) {
  const uiBol = String(ui?.bol ?? "").trim();
  const uiBolToken = String(ui?.bol_token ?? ui?.bolToken ?? ui?.bol_number ?? ui?.bolNumber ?? "");

  const region = String(ui?.region ?? ui?.state ?? ui?.location ?? ui?.site ?? ui?.area ?? ui?.market ?? "").trim().toUpperCase();

  return {
    date: toYMD(ui.date) || null,
    region,
    state: region,
    location: region,
    site: region,
    area: region,
    market: region,
    customer: ui.company || "",
    trailer_number: ui.trailer_number || "",
    notes: ui.notes || "",
    dock_hours: ui.dock_hours || "",
    eta: String(ui?.eta ?? "").trim(), 
    // IMPORTANT:
    // If the DB value was a pending-token, the UI shows it as blank.
    // On edit (like changing Trailer #), we must NOT overwrite the token with "";
    // otherwise multiple blank-BOL rows collide with the unique constraint.
    bol_number: uiBol || uiBolToken || "",
    // Item field name varies across versions; send a wide payload so the server can persist it.
    item: ui.item || "",
    item_name: ui.item || "",
    item_text: ui.item || "",
    itemText: ui.item || "",
    item_description: ui.item || "",
    item_desc: ui.item || "",
    item_info: ui.item || "",
    items: ui.item || "",
    load_item: ui.item || "",
    loadItem: ui.item || "",
    product: ui.item || "",
    description: ui.item || "",
    // Delivered / driver name varies too
    driver_name: ui.delivered_by || "",
    delivered_by: ui.delivered_by || "", 
  };
}

export default function DispatchLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [region, setRegion] = useState(() => {
    try {
      return localStorage.getItem("dispatch_region") || "IL";
    } catch {
      return "IL";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("dispatch_region", region);
    } catch {
      // ignore
    }
  }, [region]);
  const orderStorageKey = useMemo(() => {
    const r = String(region || "IL").toUpperCase();
    return `dispatch_order_${selectedDate}_${r}`;
  }, [selectedDate, region]);

  const [manualOrderIds, setManualOrderIds] = useState(() => {
    try {
      const raw = localStorage.getItem(orderStorageKey);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(orderStorageKey);
      const arr = raw ? JSON.parse(raw) : [];
      setManualOrderIds(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      setManualOrderIds([]);
    }
  }, [orderStorageKey]);

  const persistManualOrder = (ids) => {
    const clean = (Array.isArray(ids) ? ids : []).map(String);
    setManualOrderIds(clean);
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(clean));
    } catch {
      // ignore
    }
  };

  const applyManualOrder = (list, orderIds) => {
    const ids = Array.isArray(orderIds) ? orderIds.map(String) : [];
    if (!ids.length) return list;

    const pos = new Map(ids.map((id, i) => [String(id), i]));
    return list
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const ap = pos.has(String(a.item.id)) ? pos.get(String(a.item.id)) : 1e9 + a.idx;
        const bp = pos.has(String(b.item.id)) ? pos.get(String(b.item.id)) : 1e9 + b.idx;
        return ap - bp;
      })
      .map((x) => x.item);
  };

  const queryClient = useQueryClient();

  const {
    data: rawOrders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.DispatchOrder.list("-date");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load dispatch orders");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawOrders).map(toUiLog), [rawOrders]);

  const createMutation = useMutation({
    mutationFn: async (uiData) => api.entities.DispatchOrder.create(toDbPayload(uiData)),
    onSuccess: (created, variables) => {
      // Optimistically put the new row into the cache so it appears immediately,
      // even if the list endpoint is slightly delayed.
      queryClient.setQueryData(["dispatchOrders"], (old) => {
        const arr = unwrapListResult(old);
        if (!created) return arr;
        // Prevent duplicates if invalidate refetch returns the same row
        const createdId = created.id ?? created?.data?.id;
        const exists = createdId != null && arr.some((x) => (x?.id ?? x?.data?.id) === createdId);
        return exists ? arr : [created, ...arr];
      });
      queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] });
      toast.success("Entry added");
    },
    onError: (e) => toast.error(e?.message || "Failed to add entry"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.DispatchOrder.update(id, toDbPayload(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.DispatchOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dispatchOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to delete entry"),
  });

  const filteredLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const filtered = base.filter((log) => {
      if (toYMD(log.date) !== selectedDate) return false;
      if (region && String(log.region || "").toUpperCase() !== String(region).toUpperCase()) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        log.company?.toLowerCase().includes(search) ||
        log.trailer_number?.toLowerCase().includes(search) ||
        log.bol?.toLowerCase().includes(search) ||
        log.delivered_by?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search) ||
        log.item?.toLowerCase().includes(search)
      );
    });

    // ORDERING RULE (per Geo's workflow):
    // 1) Rows WITH a real BOL stay together (top section)
    // 2) Rows WITHOUT a real BOL stay together (bottom section)
    // 3) Within each section, keep the order stable by created_at (or id as fallback)
    const defaultSorted = filtered
      .slice()
      .sort((a, b) => {
        const aBol = hasRealBol(a);
        const bBol = hasRealBol(b);
        if (aBol !== bBol) return aBol ? -1 : 1;

        const at = a.created_at ? new Date(a.created_at).getTime() : NaN;
        const bt = b.created_at ? new Date(b.created_at).getTime() : NaN;
        const aHas = Number.isFinite(at);
        const bHas = Number.isFinite(bt);
        if (aHas && bHas && at !== bt) return at - bt;
        const ai = typeof a.id === "number" ? a.id : Number(String(a.id ?? "").replace(/\D/g, ""));
        const bi = typeof b.id === "number" ? b.id : Number(String(b.id ?? "").replace(/\D/g, ""));
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return 0;
      });

    return applyManualOrder(defaultSorted, manualOrderIds);
  }, [uiLogs, selectedDate, searchTerm, region, manualOrderIds]);

  const logsForSummary = useMemo(() => {
    // Do NOT count rows without a real BOL in the status summary.
    // Since we strip pending tokens for UI, "no real bol" means empty string here.
    return filteredLogs.filter((l) => String(l?.bol ?? "").trim() !== "");
  }, [filteredLogs]);

  const dayLabel = useMemo(() => {
    try {
      return format(parseYMDToLocalDate(selectedDate), "EEEE").toUpperCase();
    } catch {
      return "";
    }
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Dispatch Log</h1>
                <p className="text-sm text-slate-500">Track loads and deliveries</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("LoadHistory")}>
                <Button variant="outline" className="rounded-xl">
                  <History className="h-4 w-4 mr-2" />
                  Load History
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 space-y-6">
        <StatusSummary logs={logsForSummary} />

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Left: Region + Add */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto order-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={region?.toUpperCase() === "IL" ? "default" : "outline"}
                onClick={() => setRegion("IL")}
                className="rounded-xl h-12 px-4"
              >
                IL
              </Button>
              <Button
                type="button"
                variant={region?.toUpperCase() === "PA" ? "default" : "outline"}
                onClick={() => setRegion("PA")}
                className="rounded-xl h-12 px-4"
              >
                PA
              </Button>
            </div>
            <AddDispatchForm
              onAdd={async (row) => {
                const normalized = normalizeIncomingUiRow(row, selectedDate);
                normalized.region = region;
                return createMutation.mutateAsync(normalized);
              }}
              defaultDate={selectedDate}
              region={region}
            />
          </div>

          {/* Middle: Day label + Date picker (moved down + aligned with Add row) */}
          <div className="w-full lg:flex-1 order-3 lg:order-2">
            <div className="flex items-center justify-center gap-4 mt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = subDays(parseYMDToLocalDate(selectedDate), 1);
                  setSelectedDate(format(d, "yyyy-MM-dd"));
                }}
                className="rounded-xl h-12 w-12"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-3">
                <div className="text-center leading-none">
                  <div className="text-2xl font-extrabold tracking-wide text-slate-800">{dayLabel}</div>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-0 p-0 h-8 text-lg font-semibold text-center w-44 mt-1"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const d = addDays(parseYMDToLocalDate(selectedDate), 1);
                  setSelectedDate(format(d, "yyyy-MM-dd"));
                }}
                className="rounded-xl h-12 w-12"
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Right: Search */}
          <div className="relative w-full lg:w-72 order-2 lg:order-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading dispatch logs...</p>
          </div>
        ) : (
          <DispatchTable
            logs={filteredLogs}
            reorderEnabled={!searchTerm}
            onReorder={(nextLogs) => {
              // Persist full order for this date/region (even if some rows are hidden by search later).
              persistManualOrder((nextLogs || []).map((l) => String(l.id)));
            }}
            onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
            onDelete={(id) => deleteMutation.mutateAsync(id)}
          />
        )}
      </main>
    </div>
  );
}
