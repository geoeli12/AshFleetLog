import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
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
  Palette,
} from "lucide-react";
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const Section = ({ title, subtitle, children }) => (
  <section className="space-y-4">
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
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

const THEME_STORAGE_KEY = "apm_dashboard_theme_v1";
const COLOR_STORAGE_KEY = "apm_dashboard_colors_v1";

const PRESET_THEMES = [
  {
    id: "warm",
    name: "Warm",
    bg: "#F3EFE7",
    tileBg: "rgba(2, 6, 23, 0.78)", // slate-950-ish
    tileRing: "rgba(255,255,255,0.10)",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "#061328",
    tileBg: "rgba(255,255,255,0.07)",
    tileRing: "rgba(255,255,255,0.12)",
  },
  {
    id: "slate",
    name: "Slate",
    bg: "#0B1220",
    tileBg: "rgba(2, 6, 23, 0.72)",
    tileRing: "rgba(255,255,255,0.10)",
  },
];

function getPresetById(id) {
  return PRESET_THEMES.find((t) => t.id === id) || PRESET_THEMES[0];
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
      if (inWeek) weekCount += 1;
      if (inMonth) monthCount += 1;
    }

    return { todayCount, remainNoDriver, weekCount, monthCount };
  }, [dispatchQuery.data]);

  // Theme controls (so you don't have to edit code)
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved || "warm";
    } catch {
      return "warm";
    }
  });

  // Optional custom colors (color pickers)
  const [custom, setCustom] = useState(() => {
    try {
      const raw = localStorage.getItem(COLOR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const theme = useMemo(() => getPresetById(themeId), [themeId]);

  const effective = useMemo(() => {
    if (!custom) return theme;
    return {
      ...theme,
      bg: custom.bg || theme.bg,
      tileBg: custom.tileBg || theme.tileBg,
      tileRing: custom.tileRing || theme.tileRing,
    };
  }, [theme, custom]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {}
  }, [themeId]);

  useEffect(() => {
    try {
      if (custom) localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(custom));
      else localStorage.removeItem(COLOR_STORAGE_KEY);
    } catch {}
  }, [custom]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: effective.bg,
        // These variables control the tile/stat pill colors ONLY on this page
        ["--dash-tile-bg"]: effective.tileBg,
        ["--dash-tile-ring"]: effective.tileRing,
      }}
    >
      {/* Background effects (kept subtle so tiles stay readable) */}
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

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-12 w-12 shrink-0 rounded-2xl bg-black/75 backdrop-blur-xl ring-1 ring-black/15 grid place-items-center shadow-[0_18px_60px_-30px_rgba(0,0,0,0.45)]">
            <LayoutGrid className="h-6 w-6 text-amber-300" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                  Transport Dash
                </h1>
                <p className="mt-1 text-sm text-slate-700">
                  Pick where you want to go — everything is one click away.
                </p>
              </div>

              {/* Theme controls (local only, saved in browser) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl bg-white/70 backdrop-blur ring-1 ring-black/10 px-3 py-2 shadow-sm">
                  <Palette className="h-4 w-4 text-slate-700" />
                  <label className="text-xs font-medium text-slate-700">Theme</label>
                  <select
                    value={themeId}
                    onChange={(e) => {
                      setThemeId(e.target.value);
                      // switching presets keeps your custom overrides if you set them; if you want presets to fully override, clear custom here.
                    }}
                    className="ml-1 rounded-lg bg-white/80 px-2 py-1 text-xs text-slate-800 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  >
                    {PRESET_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <details className="group">
                  <summary className="cursor-pointer list-none rounded-2xl bg-white/70 backdrop-blur ring-1 ring-black/10 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-white/80">
                    Colors
                  </summary>
                  <div className="mt-2 grid gap-2 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/10 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-700">Background</div>
                      <input
                        type="color"
                        value={(custom?.bg || effective.bg) ?? "#ffffff"}
                        onChange={(e) => setCustom((p) => ({ ...(p || {}), bg: e.target.value }))}
                        className="h-7 w-10 rounded-md border border-black/10 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-700">Tile</div>
                      <input
                        type="color"
                        value={(custom?.tileBg || effective.tileBg) ?? "#000000"}
                        onChange={(e) =>
                          setCustom((p) => ({ ...(p || {}), tileBg: e.target.value }))
                        }
                        className="h-7 w-10 rounded-md border border-black/10 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-700">Tile ring</div>
                      <input
                        type="color"
                        value={(custom?.tileRing || effective.tileRing) ?? "#ffffff"}
                        onChange={(e) =>
                          setCustom((p) => ({ ...(p || {}), tileRing: e.target.value }))
                        }
                        className="h-7 w-10 rounded-md border border-black/10 bg-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCustom(null)}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <StatPill label="Today" value={counts.todayCount} className="md:col-span-1" />
              <StatPill
                label="Remaining (no driver)"
                value={counts.remainNoDriver}
                className="md:col-span-1"
              />
              <StatPill label="This week" value={counts.weekCount} className="md:col-span-1" />
              <StatPill label="This month" value={counts.monthCount} className="md:col-span-1" />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <Section
            title="Main Pages"
            subtitle="Your daily workflow — shift log, schedule, dispatch, and fuel."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {primary.map((x) => (
                <Tile
                  key={x.name}
                  to={x.to}
                  icon={x.icon}
                  title={x.name}
                  description={x.description}
                  pill={x.pill}
                />
              ))}
            </div>
          </Section>

          <div className="pb-6 text-xs text-slate-600">
            Tip: this is your home base — use the Back buttons to return here fast.
          </div>
        </div>
      </div>
    </div>
  );
}