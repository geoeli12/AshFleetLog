import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { toast } from "sonner";

import PickupTable from "@/components/pickups/PickupTable";

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

function toUiLog(row) {
  const region = (row.region ?? row.state ?? "").toString().trim();
  return {
    id: row.id,
    region: region.toUpperCase(),
    created_at: row.created_at ?? null,
    company: row.company ?? row.customer ?? "",
    dk_trl: row.dk_trl ?? row.dk_trl_number ?? "",
    location: row.location ?? row.address ?? "",
    date_called_out: toYMD(row.date_called_out ?? row.called_out_date ?? row.date ?? ""),
    date_picked_up: toYMD(row.date_picked_up ?? row.picked_up_date ?? ""),
    driver: row.driver ?? row.driver_name ?? "",
    shift_code: row.shift_code ?? row.shift ?? "",
    notes: row.notes ?? "",
  };
}

function toDbPayload(ui) {
  const region = (ui.region ?? "").toString().trim().toUpperCase();
  return {
    region,
    company: ui.company || "",
    dk_trl: ui.dk_trl || "",
    location: ui.location || "",
    date_called_out: toYMD(ui.date_called_out) || null,
    date_picked_up: toYMD(ui.date_picked_up) || null,
    driver: ui.driver || "",
    shift_code: ui.shift_code || "",
    notes: ui.notes || "",
  };
}

function formatDateHeader(ymd) {
  if (!ymd) return "No date";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return format(d, "MMM d, yyyy");
}

export default function PickupHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const queryClient = useQueryClient();

  const { data: rawRows, isLoading, refetch } = useQuery({
    queryKey: ["pickupOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.PickupOrder.list("-date_picked_up");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load pickup history");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawRows).map(toUiLog), [rawRows]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.PickupOrder.update(id, toDbPayload(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.PickupOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pickupOrders"] }),
    onError: (e) => toast.error(e?.message || "Failed to delete entry"),
  });

  const filteredLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const regioned =
      regionFilter === "ALL" ? base : base.filter((log) => (log.region || "").toUpperCase() === regionFilter);

    if (!searchTerm) return regioned;
    const search = searchTerm.toLowerCase();
    return regioned.filter((log) => {
      return (
        log.company?.toLowerCase().includes(search) ||
        log.dk_trl?.toLowerCase().includes(search) ||
        log.location?.toLowerCase().includes(search) ||
        log.driver?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search) ||
        log.date_called_out?.includes(search) ||
        log.date_picked_up?.includes(search)
      );
    });
  }, [uiLogs, searchTerm, regionFilter]);

  // Group by Date Picked Up (newest first). Blank dates go to "No date".
  const groupedByDate = useMemo(() => {
    const groups = new Map();
    for (const log of filteredLogs) {
      const key = (log.date_picked_up || "").trim() || "NO_DATE";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(log);
    }

    const keys = Array.from(groups.keys());
    keys.sort((a, b) => {
      if (a === "NO_DATE" && b === "NO_DATE") return 0;
      if (a === "NO_DATE") return 1;
      if (b === "NO_DATE") return -1;
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
                <h1 className="text-xl font-bold text-slate-800">Pick Up History</h1>
                <p className="text-sm text-slate-500">All pick up records</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("PickUps")}>
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
                <PickupTable
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
