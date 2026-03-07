import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RefreshCw, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DispatchTable from "@/components/dispatch/DispatchTable";
import { format } from "date-fns";
import { toast } from "sonner";

const PENDING_BOL_PREFIX = "__PENDING_BOL__:";

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

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
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

function toUiLog(order) {
  return {
    id: order.id,
    date: toYMD(order.date),
    region: String(order.region ?? '').toUpperCase(),
    company: order.customer ?? order.company ?? "",
    trailer_number: order.trailer_number ?? "",
    notes: order.notes ?? "",
    dock_hours: order.dock_hours ?? "",
    bol_token: String(order.bol_number ?? order.bol ?? ""),
    bol: cleanBolForUi(order.bol_number ?? order.bol ?? ""),
    item: order.item ?? "",
    delivered_by: order.driver_name ?? order.delivered_by ?? "",
  };
}

function toDbPayload(ui) {
  const uiBol = String(ui?.bol ?? "").trim();
  const uiBolToken = String(ui?.bol_token ?? ui?.bolToken ?? ui?.bol_number ?? ui?.bolNumber ?? "");

  return {
    date: ui.date || null,
    region: (ui.region || '').toUpperCase(),
    customer: ui.company || "",
    trailer_number: ui.trailer_number || "",
    notes: ui.notes || "",
    dock_hours: ui.dock_hours || "",
    bol_number: uiBol || uiBolToken || "",
    item: ui.item || "",
    driver_name: ui.delivered_by || "",
  };
}

function formatDateHeader(ymd) {
  // ymd is "yyyy-MM-dd"
  if (!ymd) return "No date";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return format(d, "MMM d, yyyy");
}

export default function LoadHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const queryClient = useQueryClient();

  const {
    data: rawOrders,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      try {
        // This is pulling your Supabase-backed DispatchOrder entity (dispatch_orders)
        const list = await api.entities.DispatchOrder.list("-date");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load dispatch history");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawOrders).map(toUiLog), [rawOrders]);

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

    // Region filter (ALL / IL / PA)
    const regioned =
      regionFilter === "ALL" ? base : base.filter((log) => (log.region || "").toUpperCase() === regionFilter);

    // Text search
    if (!searchTerm) return regioned;
    const search = searchTerm.toLowerCase();

    return regioned.filter((log) => {
      return (
        log.company?.toLowerCase().includes(search) ||
        log.trailer_number?.toLowerCase().includes(search) ||
        log.bol?.toLowerCase().includes(search) ||
        log.delivered_by?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search) ||
        log.item?.toLowerCase().includes(search) ||
        log.date?.includes(search)
      );
    });
  }, [uiLogs, searchTerm, regionFilter]);

  // ✅ Group by date (newest first), "No date" last
  const groupedByDate = useMemo(() => {
    const groups = new Map(); // key -> logs[]
    for (const log of filteredLogs) {
      const key = (log.date || "").trim() || "NO_DATE";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(log);
    }

    const keys = Array.from(groups.keys());

    keys.sort((a, b) => {
      if (a === "NO_DATE" && b === "NO_DATE") return 0;
      if (a === "NO_DATE") return 1; // NO_DATE last
      if (b === "NO_DATE") return -1;
      // ymd strings sort correctly descending lexicographically
      return a < b ? 1 : a > b ? -1 : 0;
    });

    return keys.map((k) => ({
      key: k,
      title: k === "NO_DATE" ? "No date" : formatDateHeader(k),
      dateYmd: k === "NO_DATE" ? "" : k,
      logs: groups.get(k) || [],
    }));
  }, [filteredLogs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <History className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Load History</h1>
                <p className="text-sm text-slate-500">All dispatch records</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("DispatchLog")}>
                <Button variant="outline" className="rounded-xl">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Today
                </Button>
              </Link>
              <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={regionFilter === "IL" ? "default" : "outline"}
                className="rounded-xl px-4"
                onClick={() => setRegionFilter((prev) => (prev === "IL" ? "ALL" : "IL"))}
              >
                IL
              </Button>
              <Button
                type="button"
                variant={regionFilter === "PA" ? "default" : "outline"}
                className="rounded-xl px-4"
                onClick={() => setRegionFilter((prev) => (prev === "PA" ? "ALL" : "PA"))}
              >
                PA
              </Button>
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-2xl">{filteredLogs.length}</span> total entries
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search all history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Loading history...</p>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No history found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-800 font-bold text-lg">{group.title}</div>
                  <div className="text-slate-500 text-sm">{group.logs.length} entries</div>
                </div>

                <DispatchTable
                  logs={group.logs}
                  onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
                  onDelete={(id) => deleteMutation.mutateAsync(id)}
                />
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}