import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, ChevronLeft, ChevronRight, History, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { addDays, format, subDays } from "date-fns";
import { toast } from "sonner";

import AddPickupForm from "@/components/pickups/AddPickupForm";
import PickupTable from "@/components/pickups/PickupTable";
import StatusSummary from "../components/pickups/StatusSummary";

function parseYMDToLocalDate(ymd) {
  if (!ymd || typeof ymd !== "string" || ymd.length < 10) return new Date();
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

const parseCityFromAddress = (address) => {
  if (!address) return "";
  const parts = String(address).split(",").map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : "";
};

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function toUiLog(row) {
  const region = (row.region ?? row.state ?? row.location_region ?? "").toString().trim();
  return {
    id: row.id,
    region: region.toUpperCase(),
    created_at: row.created_at ?? null,
    company: row.company ?? row.customer ?? "",
    dk_trl: row.dk_trl ?? row.dk_trl_number ?? row.dk_trl_no ?? row.dk_trl_num ?? "",
    location: row.location ?? row.address ?? "",
    eta: row.eta ?? "",
    date_called_out: toYMD(row.date_called_out ?? row.called_out_date ?? row.date ?? ""),
    date_picked_up: toYMD(row.date_picked_up ?? row.picked_up_date ?? ""),
    driver: row.driver ?? row.driver_name ?? "",
    shift_code: row.shift_code ?? row.shift ?? row.shiftType ?? "",
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
    eta: ui.eta || "",
    date_called_out: toYMD(ui.date_called_out) || null,
    date_picked_up: toYMD(ui.date_picked_up) || null,
    driver: ui.driver || "",
    shift_code: ui.shift_code || "",
    notes: ui.notes || "",
  };
}

function getStorageKey(region, selectedDate) {
  return `pickup_order_${String(region || "").toUpperCase()}_${selectedDate || ""}`;
}

function getDispatchedStorageKey(region, selectedDate) {
  return `pickup_dispatched_${String(region || "").toUpperCase()}_${selectedDate || ""}`;
}

function loadStoredIds(key) {
  if (typeof window === "undefined" || !key) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveStoredIds(key, ids) {
  if (typeof window === "undefined" || !key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.map(String)));
  } catch {
    // ignore
  }
}

function sortByCreatedAtAndId(list) {
  return list.slice().sort((a, b) => {
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
}

function isDispatchedForView(log, selectedDate) {
  const driver = (log?.driver ?? "").toString().trim();
  const picked = toYMD(log?.date_picked_up);
  return Boolean(driver) && Boolean(picked) && picked === selectedDate;
}

function applyVisibleOrdering(list, selectedDate, manualOrderIds, dispatchedIds) {
  const baseSorted = sortByCreatedAtAndId(list);
  const visibleIds = new Set(baseSorted.map((x) => String(x.id)));
  const cleanedManual = manualOrderIds.filter((id) => visibleIds.has(String(id)));
  const cleanedDispatched = dispatchedIds.filter((id) => visibleIds.has(String(id)));

  const manualRank = new Map(cleanedManual.map((id, index) => [String(id), index]));
  const dispatchedRank = new Map(cleanedDispatched.map((id, index) => [String(id), index]));

  return baseSorted.sort((a, b) => {
    const aDispatched = isDispatchedForView(a, selectedDate);
    const bDispatched = isDispatchedForView(b, selectedDate);

    if (aDispatched !== bDispatched) return aDispatched ? -1 : 1;

    if (aDispatched && bDispatched) {
      const aRank = dispatchedRank.has(String(a.id)) ? dispatchedRank.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
      const bRank = dispatchedRank.has(String(b.id)) ? dispatchedRank.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return 0;
    }

    const aRank = manualRank.has(String(a.id)) ? manualRank.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
    const bRank = manualRank.has(String(b.id)) ? manualRank.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return 0;
  });
}

function moveIdWithinArray(ids, activeId, overId) {
  const next = ids.map(String);
  const fromIndex = next.indexOf(String(activeId));
  const toIndex = next.indexOf(String(overId));

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return next;

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function PickUps() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [region, setRegion] = useState(() => {
    try {
      return localStorage.getItem("pickup_region") || "IL";
    } catch {
      return "IL";
    }
  });
  const [manualOrderIds, setManualOrderIds] = useState([]);
  const [dispatchedOrderIds, setDispatchedOrderIds] = useState([]);

  React.useEffect(() => {
    try {
      localStorage.setItem("pickup_region", region);
    } catch {
      // ignore
    }
  }, [region]);

  useEffect(() => {
    setManualOrderIds(loadStoredIds(getStorageKey(region, selectedDate)));
    setDispatchedOrderIds(loadStoredIds(getDispatchedStorageKey(region, selectedDate)));
  }, [region, selectedDate]);

  useEffect(() => {
    saveStoredIds(getStorageKey(region, selectedDate), manualOrderIds);
  }, [manualOrderIds, region, selectedDate]);

  useEffect(() => {
    saveStoredIds(getDispatchedStorageKey(region, selectedDate), dispatchedOrderIds);
  }, [dispatchedOrderIds, region, selectedDate]);

  const queryClient = useQueryClient();

  const { data: rawRows, isLoading, refetch } = useQuery({
    queryKey: ["pickupOrders"],
    queryFn: async () => {
      try {
        const list = await api.entities.PickupOrder.list("-date_called_out");
        return unwrapListResult(list);
      } catch (e) {
        toast.error(e?.message || "Failed to load pick ups");
        return [];
      }
    },
  });

  const uiLogs = useMemo(() => unwrapListResult(rawRows).map(toUiLog), [rawRows]);

  const createMutation = useMutation({
    mutationFn: async (uiData) => api.entities.PickupOrder.create(toDbPayload(uiData)),
    onSuccess: (created) => {
      queryClient.setQueryData(["pickupOrders"], (old) => {
        const arr = unwrapListResult(old);
        if (!created) return arr;
        const createdId = created.id ?? created?.data?.id;
        const exists = createdId != null && arr.some((x) => (x?.id ?? x?.data?.id) === createdId);
        return exists ? arr : [created, ...arr];
      });
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });

      const createdId = created?.id ?? created?.data?.id;
      if (createdId != null) {
        setManualOrderIds((prev) => [...prev, String(createdId)]);
      }

      toast.success("Pick up added");
    },
    onError: (e) => toast.error(e?.message || "Failed to add pick up"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => api.entities.PickupOrder.update(id, toDbPayload(data)),
    onSuccess: async (_, variables) => {

      const nextData = variables?.data || {};
      const id = variables?.id;

      const driverName = String(nextData?.driver || "").trim();
      const previousDriver = String(nextData?._previousDriver || "").trim();
      const orderDate = toYMD(nextData?.date_called_out);

      // 🚨 HANDLE DRIVER REMOVAL (MATCH DISPATCH LOGIC)
      if (!driverName && previousDriver) {

        const existingShiftList = await api.entities.Shift.filter(
          {
            driver_name: previousDriver,
            shift_date: orderDate,
            status: "active"
          },
          "-created_date",
          1
        );

        const shiftArray = Array.isArray(existingShiftList)
          ? existingShiftList
          : existingShiftList?.data || [];

        let shift = shiftArray[0];

        if (shift) {

          const existingRuns = await api.entities.Run.filter({
            shift_id: shift.id
          });

          const runsArray = Array.isArray(existingRuns)
            ? existingRuns
            : existingRuns?.data || [];

          const orderFromDb = await api.entities.PickupOrder.get(id);
          const fullOrder = orderFromDb?.data || orderFromDb;

          // 🎯 MATCH EXACT RUN
          const matchingRuns = runsArray.filter(r =>
            String(r.trailer_dropped || "") === String(fullOrder.dk_trl || "") &&
            String(r.customer_name || "") === String(fullOrder.company || "") &&
            String(r.run_date || "") === String(orderDate || "") &&
            String(r.driver_name || "") === String(previousDriver || "") &&
            String(r.run_type || "") === "pickup"
          );

          // ❌ DELETE MATCHING RUNS
          for (const run of matchingRuns) {
            await api.entities.Run.delete(run.id);
          }

          // 🧹 DELETE SHIFT IF EMPTY
          const remainingRuns = await api.entities.Run.filter({ shift_id: shift.id });

          const remainingArray = Array.isArray(remainingRuns)
            ? remainingRuns
            : remainingRuns?.data || [];

          if (!remainingArray.length) {
            await api.entities.Shift.delete(shift.id);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["activeShifts"] });
        queryClient.invalidateQueries({ queryKey: ["runs"] });

        return;
      }

      // 🚨 ONLY CREATE IF DRIVER EXISTS
      if (!driverName) {
        queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
        return;
      }

      try {

        // 🔍 1. CHECK OR CREATE SHIFT
        const existingShiftList = await api.entities.Shift.filter(
          {
            driver_name: driverName,
            shift_date: orderDate,
            status: "active"
          },
          "-created_date",
          1
        );

        const shiftArray = Array.isArray(existingShiftList)
          ? existingShiftList
          : existingShiftList?.data || [];

        let shift = shiftArray[0];

        if (!shift) {
          const createdShift = await api.entities.Shift.create({
            driver_name: driverName,
            shift_date: orderDate,
            shift_type: "day",
            status: "active",
            start_time: new Date().toISOString(),
            attendance_status: "present"
          });

          shift = createdShift?.id
            ? createdShift
            : createdShift?.data;
        }

        // 🔍 2. CHECK EXISTING RUNS
        const existingRuns = await api.entities.Run.filter({
          shift_id: shift.id
        });

        const runsArray = Array.isArray(existingRuns)
          ? existingRuns
          : existingRuns?.data || [];

        // 🔥 GET FULL ORDER
        const orderFromDb = await api.entities.PickupOrder.get(id);
        const fullOrder = orderFromDb?.data || orderFromDb;

        // 🔥 MATCH EXISTING RUN
        const existingRun = runsArray.find(r =>
          String(r.trailer_dropped || "") === String(fullOrder.dk_trl || "") &&
          String(r.customer_name || "") === String(fullOrder.company || "") &&
          String(r.run_date || "") === String(orderDate || "") &&
          String(r.driver_name || "") === String(driverName || "") &&
          String(r.run_type || "") === "pickup"
        );

        if (existingRun) return;

        // 🔥 CITY
        const city = parseCityFromAddress(fullOrder.location || "");

        // 🟢 CREATE RUN
        await api.entities.Run.create({
          shift_id: shift.id,
          driver_name: driverName,

          dispatch_id: id,

          run_date: orderDate,

          customer_name: fullOrder.company || "",
          trailer_dropped: fullOrder.dk_trl || "",

          notes: fullOrder.notes || "",
          city: city || "",

          load_type: "pickup",
          run_type: "pickup",

          created_at: new Date().toISOString()
        });

        queryClient.invalidateQueries({ queryKey: ["activeShifts"] });
        queryClient.invalidateQueries({ queryKey: ["runs"] });

      } catch (err) {
        console.error("Pickup → Shift sync failed:", err);
      }

      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
    },
    onError: (e) => toast.error(e?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.entities.PickupOrder.delete(id),
    onSuccess: (_, id) => {
      setManualOrderIds((prev) => prev.filter((x) => String(x) !== String(id)));
      setDispatchedOrderIds((prev) => prev.filter((x) => String(x) !== String(id)));
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
    },
    onError: (e) => toast.error(e?.message || "Failed to delete"),
  });

  const copyMutation = useMutation({
    mutationFn: async (row) => {
      const copyRow = {
        ...row,
        id: undefined,
        created_at: undefined,
      };
      return api.entities.PickupOrder.create(toDbPayload(copyRow));
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });

      const createdId = created?.id ?? created?.data?.id;
      if (createdId != null) {
        setManualOrderIds((prev) => [...prev, String(createdId)]);
      }

      toast.success("Pick up copied");
    },
    onError: (e) => toast.error(e?.message || "Failed to copy pick up"),
  });

  const statsLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const filtered = base.filter((log) => {
      const called = toYMD(log.date_called_out);
      const picked = toYMD(log.date_picked_up);

      if (!called) return false;

      const hasPuDate = Boolean(picked);

      // ONLY show rows for selected day
      if (called !== selectedDate) return false;
      if (region && String(log.region || "").toUpperCase() !== String(region).toUpperCase()) return false;

      return true;
    });

    return sortByCreatedAtAndId(filtered);
  }, [uiLogs, selectedDate, region]);

  const filteredLogs = useMemo(() => {
    const base = Array.isArray(uiLogs) ? uiLogs : [];
    const filtered = base.filter((log) => {
      const called = toYMD(log.date_called_out);
      const picked = toYMD(log.date_picked_up);

      if (!called) return false;

      const hasPuDate = Boolean(picked);

      // ONLY show rows for selected day
      if (called !== selectedDate) return false;
      if (region && String(log.region || "").toUpperCase() !== String(region).toUpperCase()) return false;
      if (!searchTerm) return true;

      const search = searchTerm.toLowerCase();
      return (
        log.company?.toLowerCase().includes(search) ||
        log.dk_trl?.toLowerCase().includes(search) ||
        log.location?.toLowerCase().includes(search) ||
        log.driver?.toLowerCase().includes(search) ||
        log.notes?.toLowerCase().includes(search)
      );
    });

    return applyVisibleOrdering(filtered, selectedDate, manualOrderIds, dispatchedOrderIds);
  }, [uiLogs, selectedDate, searchTerm, region, manualOrderIds, dispatchedOrderIds]);

  useEffect(() => {
    const visibleIds = new Set(filteredLogs.map((log) => String(log.id)));

    setManualOrderIds((prev) => {
      const filteredManual = prev.filter((id) => visibleIds.has(String(id)));
      const visibleOpenIds = filteredLogs
        .filter((log) => !isDispatchedForView(log, selectedDate))
        .map((log) => String(log.id));

      const existing = new Set(filteredManual.map(String));
      const merged = filteredManual.slice();

      visibleOpenIds.forEach((id) => {
        if (!existing.has(id)) {
          merged.push(id);
          existing.add(id);
        }
      });

      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });

    setDispatchedOrderIds((prev) => {
      const visibleDispatchedIds = filteredLogs
        .filter((log) => isDispatchedForView(log, selectedDate))
        .map((log) => String(log.id));

      const filteredPrev = prev.filter((id) => visibleDispatchedIds.includes(String(id)));
      const existing = new Set(filteredPrev.map(String));
      const merged = filteredPrev.slice();

      visibleDispatchedIds.forEach((id) => {
        if (!existing.has(id)) {
          merged.push(id);
          existing.add(id);
        }
      });

      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
  }, [filteredLogs, selectedDate]);

  const handleMoveRow = (activeId, overId) => {
    if (!activeId || !overId || String(activeId) === String(overId)) return;

    const activeLog = filteredLogs.find((log) => String(log.id) === String(activeId));
    const overLog = filteredLogs.find((log) => String(log.id) === String(overId));
    if (!activeLog || !overLog) return;

    const activeDispatched = isDispatchedForView(activeLog, selectedDate);
    const overDispatched = isDispatchedForView(overLog, selectedDate);

    if (activeDispatched && overDispatched) {
      setDispatchedOrderIds((prev) => {
        const currentVisible = filteredLogs
          .filter((log) => isDispatchedForView(log, selectedDate))
          .map((log) => String(log.id));
        const base = currentVisible.length ? currentVisible : prev.map(String);
        return moveIdWithinArray(base, activeId, overId);
      });
      return;
    }

    if (!activeDispatched && !overDispatched) {
      setManualOrderIds((prev) => {
        const currentVisible = filteredLogs
          .filter((log) => !isDispatchedForView(log, selectedDate))
          .map((log) => String(log.id));
        const base = currentVisible.length ? currentVisible : prev.map(String);
        return moveIdWithinArray(base, activeId, overId);
      });
    }
  };

  const dayLabel = useMemo(() => {
    try {
      return format(parseYMDToLocalDate(selectedDate), "EEEE").toUpperCase();
    } catch {
      return "";
    }
  }, [selectedDate]);

  const checkPreviousDayPickups = async () => {
    try {
      const selected = parseYMDToLocalDate(selectedDate);
      const prevDay = subDays(selected, 1);

      const unfinished = uiLogs.filter((log) => {
        const called = parseYMDToLocalDate(log.date_called_out);
        const picked = toYMD(log.date_picked_up);

        return (
          called.getFullYear() === prevDay.getFullYear() &&
          called.getMonth() === prevDay.getMonth() &&
          called.getDate() === prevDay.getDate() &&
          !picked && // NOT picked up
          String(log.region || "").toUpperCase() === String(region).toUpperCase()
        );
      });

      if (!unfinished.length) {
        toast.info("No unfinished pick ups from previous day");
        return;
      }

      let createdCount = 0;

      for (const row of unfinished) {

        const alreadyExists = uiLogs.some((log) => {
          return (
            toYMD(log.date_called_out) === selectedDate &&
            log.company === row.company &&
            log.dk_trl === row.dk_trl
          );
        });

        if (alreadyExists) continue;

        const newRow = {
          ...row,
          date_called_out: selectedDate,
          driver: "",
          date_picked_up: "",
        };

        await createMutation.mutateAsync(newRow);
        createdCount++;
      }

      toast.success(`${createdCount} pick ups carried over`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to check previous pick ups");
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="w-full px-4 md:px-6 xl:px-8 py-4">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2.5 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Pick Ups</h1>
                <p className="text-sm text-slate-500">
                  Track trailer doors, call-outs, and pickups
                </p>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">

              <Link to={createPageUrl("PickupHistory")}>
                <Button variant="outline" className="rounded-xl">
                  <History className="h-4 w-4 mr-2" />
                  Pick Up History
                </Button>
              </Link>

              {/* ✅ NEW BUTTON */}
              <Button
                variant="outline"
                onClick={checkPreviousDayPickups}
                className="rounded-xl"
              >
                Check Previous Day Pick Ups
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>

            </div>

          </div>
        </div>
      </div>

      <main className="w-full max-w-none px-4 md:px-6 xl:px-8 py-8 space-y-6">
        <StatusSummary logs={statsLogs} variant="pickups" selectedDate={selectedDate} />

        <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
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

            <AddPickupForm
              onAdd={async (row) => {
                const payload = { ...row, date_called_out: row.date_called_out || selectedDate, region };
                return createMutation.mutateAsync(payload);
              }}
              defaultCalledOutDate={selectedDate}
              region={region}
            />
          </div>

          <div className="w-full xl:w-auto flex items-center justify-center">
            <div className="flex flex-col items-center">
              {dayLabel ? (
                <div className="text-slate-700 font-extrabold tracking-wide text-xl leading-none mb-2">
                  {dayLabel}
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const d = subDays(parseYMDToLocalDate(selectedDate), 1);
                    setSelectedDate(format(d, "yyyy-MM-dd"));
                  }}
                  className="rounded-xl h-12 w-12"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-3">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border-0 p-0 h-8 text-lg font-semibold text-center w-40"
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
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="relative w-full xl:w-80">
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
            <p className="text-slate-500">Loading pick ups...</p>
          </div>
        ) : (
          <PickupTable
            viewDate={selectedDate}
            logs={filteredLogs}

            onUpdate={(id, data, originalRow) =>
              updateMutation.mutateAsync({
                id,
                data: {
                  ...data,
                  _previousDriver: originalRow?.driver || ""
                }
              })
            }

            onDelete={(id) => deleteMutation.mutateAsync(id)}
            onCopy={(row) => copyMutation.mutateAsync(row)}
            onMoveRow={handleMoveRow}
          />
        )}
      </main>
    </div>
  );
}