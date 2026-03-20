import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  History,
  CalendarDays,
  Users,
  Truck,
  ClipboardCheck,
  Fuel,
  Droplets,
  Gauge,
  Package,
  
  FileText,
  ArrowRight,
} from "lucide-react";
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
    {/* glow / sheen */}
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

        {/* IMPORTANT: no line-clamp, allow wrapping so nothing gets cut off */}
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

export default function Dashboard() {
  const primary = [
    {
      name: "Driver Logs",
      to: createPageUrl("DriverLog"),
      icon: ClipboardList,
      description: "Clock in/out, manage active shifts, and add runs as you go.",
    },
    {
      name: "Shift History",
      to: createPageUrl("ShiftHistory"),
      icon: History,
      description: "Review completed shifts, edit entries, and check totals.",
    },
    {
      name: "Dispatch Log",
      to: createPageUrl("DispatchLog"),
      icon: Truck,
      description: "Track dispatch info and operational notes in one place.",
    },
    {
      name: "Daily Orders",
      to: createPageUrl("DailyOrders"),
      icon: ClipboardCheck,
      description: "Enter and review daily customer orders in a spreadsheet-style table.",
    },
    {
      name: "Load History",
      to: createPageUrl("LoadHistory"),
      icon: History,
      description: "Browse all dispatch records across dates.",
    },
    {
      name: "Pick Ups",
      to: createPageUrl("PickUps"),
      icon: Package,
      description: "Track trailer doors/call-outs and picked up dates.",
    },
    {
      name: "Pick Up History",
      to: createPageUrl("PickupHistory"),
      icon: History,
      description: "Browse all pick up records across dates.",
    },
    {
      name: "Create a Schedule",
      to: createPageUrl("Schedule"),
      icon: Gauge,
      description: "Plan the day/night schedule and keep coverage balanced.",
    },
    {
      name: "Fuel",
      to: createPageUrl("FuelDashboard"),
      icon: Fuel,
      description: "Enter fuel usage, and main tank refills.",
    },
    {
      name: "Fuel History",
      to: createPageUrl("FuelHistory"),
      icon: Droplets,
      description: "Browse all fuel usage logged history.",
    },
    {
      name: "Attd Calendar",
      to: createPageUrl("Calendar"),
      icon: CalendarDays,
      description: "See attendance, PTO, absences, and lateness at a glance.",
    },
    {
      name: "Drivers",
      to: createPageUrl("Drivers"),
      icon: Users,
      description: "Add new drivers, and manage driver profiles.",
    },
    {
      name: "Customers",
      to: createPageUrl("Customers"),
      icon: Users,
      description: "Lookup customer addresses, receiving hours, and notes (IL list).",
    },
    {
      name: "Customers PA",
      to: createPageUrl("CustomersPA"),
      icon: Truck,
      description: "Lookup customer addresses, hours, ETA, and contacts (PA list).",
    },
    {
      name: "Inventory Entry",
      to: createPageUrl("InventoryEntry"),
      icon: Package,
      description: "Enter pallet inventory counts for a customer and trailer.",
    },
    {
      name: "Inventory Log",
      to: createPageUrl("InventoryLog"),
      icon: Package,
      description: "Search and filter all pallet inventory entries.",
    },
    
    {
      name: "Invoice",
      to: createPageUrl("Invoice"),
      icon: FileText,
      description: "Print-ready invoice entry (matches the Excel layout).",
    },
  ];

  const location = useLocation();

  const dispatchQuery = useQuery({
    queryKey: ["dispatchOrders"],
    queryFn: async () => {
      const list = await api.entities.DispatchOrder.list("-date");
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
        backgroundColor: "#F3EFE7",
        // These variables control the tile/stat pill colors ONLY on this page
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

              {/* LEFT SIDEBAR (NARROWER) */}
              <div className="lg:w-56 w-full">
                <div
                  className="rounded-2xl p-3 backdrop-blur-xl ring-1 shadow-md"
                  style={{
                    backgroundColor: "var(--dash-tile-bg)",
                    borderColor: "var(--dash-tile-ring)",
                  }}
                >
                  <div className="space-y-1">
                    {primary.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          to={item.to}
                          className={[
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all",
                            location.pathname === item.to
                              ? "bg-amber-400 text-black"
                              : "text-white/80 hover:bg-white/10",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT CONTENT */}
              <div className="flex-1">

                {/* STAT PILLS */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                  <StatPill label="Today" value={counts.todayCount} />
                  <StatPill label="Remaining (no driver)" value={counts.remainNoDriver} />
                  <StatPill label="This week" value={counts.weekCount} />
                  <StatPill label="Remaining (week)" value={counts.weekRemainingNoDriver} />
                  <StatPill label="This month" value={counts.monthCount} />
                </div>

              </div>

            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}