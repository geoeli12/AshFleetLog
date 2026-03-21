import React from "react";
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

  return (
    <div className="fixed top-0 left-0 h-screen w-56">
      <div
        className="h-full p-3 ring-1 shadow-md flex flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--dash-tile-bg)",
          borderColor: "var(--dash-tile-ring)",
        }}
      >
        {/* AUTO SCALE CONTAINER */}
        <div className="flex-1 overflow-hidden">
          <div
            className="origin-top-left"
            style={{
              transform: "scale(calc(min(1, 100vh / 900)))",
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
    </div>
  );
}