import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  const primary = [
    { name: "Driver Logs", to: createPageUrl("DriverLog"), icon: ClipboardList },
    { name: "Shift History", to: createPageUrl("ShiftHistory"), icon: History },
    { name: "Dispatch Log", to: createPageUrl("DispatchLog"), icon: Truck },
    { name: "Daily Orders", to: createPageUrl("DailyOrders"), icon: ClipboardCheck },
    { name: "Load History", to: createPageUrl("LoadHistory"), icon: History },
    { name: "Pick Ups", to: createPageUrl("PickUps"), icon: Package },
    { name: "Pick Up History", to: createPageUrl("PickupHistory"), icon: History },
    { name: "Create a Schedule", to: createPageUrl("Schedule"), icon: Gauge },
    { name: "Fuel", to: createPageUrl("FuelDashboard"), icon: Fuel },
    { name: "Fuel History", to: createPageUrl("FuelHistory"), icon: Droplets },
    { name: "Attd Calendar", to: createPageUrl("Calendar"), icon: CalendarDays },
    { name: "Drivers", to: createPageUrl("Drivers"), icon: Users },
    { name: "Customers", to: createPageUrl("Customers"), icon: Users },
    { name: "Customers PA", to: createPageUrl("CustomersPA"), icon: Truck },
    { name: "Inventory Entry", to: createPageUrl("InventoryEntry"), icon: Package },
    { name: "Inventory Log", to: createPageUrl("InventoryLog"), icon: Package },
    { name: "Invoice", to: createPageUrl("Invoice"), icon: FileText },
  ];

  // 🔥 REAL AUTO FIT LOGIC
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !contentRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const contentHeight = contentRef.current.scrollHeight;

      const newScale = Math.min(1, containerHeight / contentHeight);
      setScale(newScale);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="fixed top-[72px] left-0 h-[calc(100vh-72px)] w-56">
      <div
        ref={containerRef}
        className="h-full p-3 ring-1 shadow-md overflow-hidden"
        style={{
          backgroundColor: "var(--dash-tile-bg)",
          borderColor: "var(--dash-tile-ring)",
        }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: scale < 1 ? `${100 / scale}%` : "100%",
          }}
        >
          <div className="space-y-1">
            {primary.map((item) => {
              const Icon = item.icon;

              const isActive =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to + "/");

              return (
                <Link
                  key={item.name}
                  to={item.to}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2 transition-all",
                    isActive
                      ? "bg-amber-400 text-black"
                      : "text-black hover:bg-black/5",
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
    </div>
  );
}