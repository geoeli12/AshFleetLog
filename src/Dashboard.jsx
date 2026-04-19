import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const Section = ({ children }) => (
  <section className="space-y-4">
    {children}
  </section>
);

const StatPill = ({ label, value, className }) => (
  <div
    className={[
      "relative overflow-hidden rounded-2xl px-4 py-3 sm:px-5 sm:py-4",
      "backdrop-blur-xl ring-1 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.35)]",
      "text-white",
      className || "",
    ].join(" ")}
    style={{
      backgroundColor: "var(--dash-tile-bg)",
      borderColor: "var(--dash-tile-ring)",
    }}
  >
    <div
      className="absolute inset-0 opacity-70"
      style={{
        background:
          "radial-gradient(80% 120% at 10% 0%, rgba(245,158,11,0.22), transparent 55%)",
      }}
    />
    <div className="relative flex items-center justify-between gap-3">
      <div className="text-xs sm:text-sm text-white/70">{label}</div>
      <div className="text-lg sm:text-xl font-semibold tracking-tight">{value}</div>
    </div>
  </div>
);

const Tile = ({ to, icon: Icon, title, description, pill }) => (
  <Link
    to={to}
    className={[
      "group relative overflow-hidden rounded-3xl p-4 sm:p-5",
      "backdrop-blur-xl ring-1",
      "shadow-[0_18px_60px_-28px_rgba(0,0,0,0.45)]",
      "transition-all duration-200",
      "hover:-translate-y-0.5 hover:ring-amber-400/35 hover:shadow-[0_22px_70px_-28px_rgba(0,0,0,0.55)]",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    ].join(" ")}
    style={{
      backgroundColor: "var(--dash-tile-bg)",
      borderColor: "var(--dash-tile-ring)",
    }}
  >
    <div className="pointer-events-none absolute -inset-24 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(245,158,11,0.22),transparent_65%)]" />
    </div>
    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <div className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-sm" />
    </div>

    <div className="relative flex items-start gap-3 sm:gap-4">
      <div className="relative shrink-0">
        <div
          className={[
            "grid place-items-center rounded-2xl",
            "bg-gradient-to-br from-white/12 to-white/4 ring-1 ring-white/10",
            "shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)]",
            "transition-transform duration-200 group-hover:scale-[1.03]",
            "h-10 w-10 sm:h-12 sm:w-12",
          ].join(" ")}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
        </div>

        {pill ? (
          <div className="absolute -top-2 -right-2">
            <Badge className="rounded-full bg-amber-400 text-black hover:bg-amber-400">
              {pill}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm sm:text-base font-semibold text-white">
              {title}
            </div>
          </div>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/70" />
        </div>

        <div className="mt-1 whitespace-normal break-words text-xs sm:text-sm leading-snug text-white/70">
          {description}
        </div>
      </div>
    </div>
  </Link>
);

function safeParseISO(d) {
  try {
    if (!d) return null;
    return parseISO(String(d));
  } catch {
    return null;
  }
}

function dateOnlyLocal(dt) {
  if (!dt) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function parseCityFromAddress(address) {
  if (!address) return "";
  const parts = String(address).split(",").map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

export default function Dashboard() {

  const dispatchQuery = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      const list = await api.entities.DispatchOrder.list("-date");
      return Array.isArray(list) ? list : [];
    },
  });

  const pickupQuery = useQuery({
    queryKey: ["pickupOrders"],
    queryFn: async () => {
      const list = await api.entities.PickupOrder.list("-date_called_out");
      return Array.isArray(list) ? list : [];
    },
  });

  const counts = useMemo(() => {
    const orders = Array.isArray(dispatchQuery.data) ? dispatchQuery.data : [];
    const now = new Date();

    const today = dateOnlyLocal(now);
    const wkStart = startOfWeek(now, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(now, { weekStartsOn: 1 });
    const moStart = startOfMonth(now);
    const moEnd = endOfMonth(now);

    let todayCount = 0;
    let remainNoDriver = 0;
    let weekCount = 0;
    let weekRemainingNoDriver = 0;
    let monthCount = 0;

    for (const o of orders) {
      const d = safeParseISO(o?.date);
      if (!d) continue;

      const localDay = dateOnlyLocal(d);
      if (!localDay) continue;

      const drv = String(o?.driver_name || "").trim();
      const inToday = today && localDay.getTime() === today.getTime();
      const inWeek = isWithinInterval(localDay, {
        start: dateOnlyLocal(wkStart),
        end: dateOnlyLocal(wkEnd),
      });
      const inMonth = isWithinInterval(localDay, {
        start: dateOnlyLocal(moStart),
        end: dateOnlyLocal(moEnd),
      });

      if (inToday) {
        todayCount += 1;
        if (!drv) remainNoDriver += 1;
      }
      if (inWeek) {
        weekCount += 1;
        if (!drv) weekRemainingNoDriver += 1;
      }
      if (inMonth) monthCount += 1;
    }

    return { todayCount, remainNoDriver, weekCount, weekRemainingNoDriver, monthCount };
  }, [dispatchQuery.data]);

  return (
    <div
      className="min-h-screen"
      style={{
        ["--dash-tile-bg"]: "rgba(2, 6, 23, 0.78)",
        ["--dash-tile-ring"]: "rgba(255,255,255,0.10)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, rgba(245,158,11,0.10), transparent 55%), radial-gradient(65% 60% at 0% 35%, rgba(120,113,108,0.10), transparent 58%), radial-gradient(65% 60% at 100% 60%, rgba(180,83,9,0.07), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(0,0,0,0.22)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="w-full px-4 sm:px-6 py-3">
        <div className="mt-2 space-y-6">
          <Section>
            <div className="flex flex-col lg:flex-row gap-6">

              <div className="flex-1">

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                  <StatPill label="Today" value={counts.todayCount} />
                  <StatPill label="Remaining (no driver)" value={counts.remainNoDriver} />
                  <StatPill label="This week" value={counts.weekCount} />
                  <StatPill label="Remaining (week)" value={counts.weekRemainingNoDriver} />
                  <StatPill label="This month" value={counts.monthCount} />
                </div>

                <DispatchBoard 
                  dispatchQuery={dispatchQuery} 
                  pickupQuery={pickupQuery} 
                />

              </div>

            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function DispatchBoard({ dispatchQuery, pickupQuery }) {

  const [dragItem, setDragItem] = useState(null);
  const [dragOverDriver, setDragOverDriver] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  const [selectedRegion, setSelectedRegion] = useState("ALL");

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const groupedByDriver = useMemo(() => {

    const orders = [
      ...(Array.isArray(dispatchQuery.data)
        ? dispatchQuery.data.map(o => ({ ...o, __type: "delivery" }))
        : []),

      ...(Array.isArray(pickupQuery.data)
        ? pickupQuery.data.map(o => ({
            ...o,
            __type: "pickup",

            // 🔥 ADD THIS LINE RIGHT HERE
            city: o?.city || parseCityFromAddress(o?.location || "")
          }))
        : [])
    ]
    .filter(o => {
      const orderDate =
        o?.date ||                 // dispatch_orders
        o?.date_called_out;        // pickup_orders

      return orderDate === selectedDate;
    });

    const map = {};

    for (const o of orders) {

      if (selectedRegion !== "ALL") {
        const region = String(o?.region || "").toUpperCase();
        if (region !== selectedRegion) continue;
      }

      // const driver = String(o?.driver_name || "").trim();

      const driver = String(
        o?.driver_name || 
        o?.driver || 
        o?.delivered_by || ""
      ).trim();

      // ❌ SKIP UNASSIGNED RUNS COMPLETELY
      if (!driver) continue;

      if (!map[driver]) map[driver] = [];
      map[driver].push(o);
    }

    return map;
  }, [dispatchQuery.data, pickupQuery.data, selectedRegion, selectedDate]);

  const handleDragStart = (run, fromDriver) => {
    setDragItem({ run, fromDriver });
  };

  const handleDrop = (toDriver) => {
    if (!dragItem) return;
    setDragItem(null);
    setDragOverDriver(null);
  };

  const handleDragOver = (e, driver) => {
    e.preventDefault();
    setDragOverDriver(driver);
  };

  const handleClickRun = (run) => {
    setSelectedRun(run);
    console.log("Clicked run:", run);
  };

  return (
    <div className="mt-6 space-y-4">

      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => changeDate(-1)} className="px-2 py-1 rounded bg-slate-300 text-black">←</button>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-2 py-1 rounded border text-black"
        />

        <button onClick={() => changeDate(1)} className="px-2 py-1 rounded bg-slate-300 text-black">→</button>
      </div>

      <div className="flex gap-2 mb-2">

        <button
          onClick={() => setSelectedRegion("ALL")}
          className={`px-3 py-1 rounded-full text-xs border transition ${
            selectedRegion === "ALL"
              ? "bg-amber-400 text-black border-amber-400"
              : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
          }`}
        >
          ALL
        </button>

        <button
          onClick={() => setSelectedRegion("IL")}
          className={`px-3 py-1 rounded-full text-xs border transition ${
            selectedRegion === "IL"
              ? "bg-amber-400 text-black border-amber-400"
              : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
          }`}
        >
          IL
        </button>

        <button
          onClick={() => setSelectedRegion("PA")}
          className={`px-3 py-1 rounded-full text-xs border transition ${
            selectedRegion === "PA"
              ? "bg-amber-400 text-black border-amber-400"
              : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
          }`}
        >
          PA
        </button>

      </div>

      {Object.entries(groupedByDriver).map(([driver, runs]) => (

        <div
          key={driver}
          onDragOver={(e) => handleDragOver(e, driver)}
          onDrop={() => handleDrop(driver)}
          className={`rounded-2xl p-4 backdrop-blur-xl ring-1 ${
            dragOverDriver === driver ? "ring-amber-400/60" : ""
          }`}
          style={{
            backgroundColor: "var(--dash-tile-bg)",
            borderColor: "var(--dash-tile-ring)",
          }}
        >

          {/* 🔥 NEW WRAPPER (Driver + Pills SAME ROW) */}
          <div className="flex items-center gap-3 mb-3">

            {/* 🔹 Driver Name (unchanged, just moved inside flex) */}
            <div className="text-white font-semibold whitespace-nowrap">
              {driver}
            </div>

            {/* 🔹 Pills Container (same as before) */}
            <div className="flex flex-wrap gap-2">

              {/* 🔥 DEFAULT MAIN PILL (ALWAYS FIRST) */}
              <div
                key={`main-${driver}`}
                className="w-[90px] h-[60px] text-white bg-red-500/90 shadow flex items-center justify-center"
                style={{
                  clipPath: "polygon(50% 0%, 100% 35%, 100% 100%, 0% 100%, 0% 35%)",
                  paddingTop: "10px"
                }}
              >
                <div className="flex flex-col items-center justify-center text-center leading-tight">

                  {/* Customer */}
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 opacity-80" />
                    <span className="text-xs font-semibold truncate">
                      Ash Pallet
                    </span>
                  </div>

                  {/* City (derived from address) */}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 opacity-70" />
                    <span className="text-[10px] opacity-80 truncate">
                      Antioch
                    </span>
                  </div>

                </div>
              </div>

              {/* 🔥 ACTUAL RUNS */}
              {runs.map((r) => {
                const isPickup = r?.__type === "pickup";

                const color = isPickup
                  ? "bg-green-500/90"
                  : "bg-blue-500/90";

                return (
                  <React.Fragment key={r.id}>

                    {/* 🚛 TRAILER NUMBER PILL (NEW) */}
                    <div
                      className="px-3 h-[60px] text-white bg-slate-700/90 shadow flex items-center justify-center rounded-lg"
                    >
                      <span className="text-xs font-semibold">
                        {r?.trailer_number || r?.dk_trl || "TRL ?"}
                      </span>
                    </div>

                    {/* 🔵 RUN ARROW */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(r, driver)}
                      onClick={() => handleClickRun(r)}
                      className={`relative min-w-[110px] w-auto h-[60px] px-4 text-white ${color} shadow cursor-pointer flex items-center justify-center`}
                      style={{
                        clipPath: "polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%)"
                      }}
                    >
                      <div className="relative w-full h-full">

                        {/* 🔥 ETA TOP LEFT */}
                        {r?.eta && (
                          <div className="absolute bottom-1 left-2 text-[10px] font-semibold text-black opacity-90">
                            {r.eta}
                          </div>
                        )}

                        {/* 🔹 MAIN CONTENT CENTERED */}
                        <div className="flex flex-col items-center justify-center text-center leading-tight pl-2 pr-5 h-full">

                          {/* 🔹 Customer */}
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 opacity-80" />

                            <span
                              className={`text-xs font-semibold leading-tight text-center ${
                                (r?.customer || r?.company || "").length > 25
                                  ? "max-w-[90px] break-words"
                                  : "whitespace-nowrap"
                              }`}
                            >
                              {r?.customer || r?.company || "No Name"}
                            </span>
                          </div>

                          {/* 🔹 City */}
                          {r?.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 opacity-70" />
                              <span className="text-[10px] opacity-80 truncate">
                                {r.city}
                              </span>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>

                  </React.Fragment>
                );
              })}

            </div>

          </div>

        </div>

      ))}

    </div>
  );
}