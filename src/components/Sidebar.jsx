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
    <div className="lg:w-52 w-full shrink-0 h-screen overflow-hidden">
      <div
        className="relative p-2 backdrop-blur-xl ring-1 shadow-md h-full"
        style={{
          backgroundColor: "var(--dash-tile-bg)",
          borderColor: "var(--dash-tile-ring)",
        }}
      >
        <div className="space-y-0.5">
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
                  "w-full flex items-center gap-2 px-2 py-1.5 text-left transition-all",
                  isActive
                    ? "bg-amber-400 text-black"
                    : "text-black hover:bg-black/5",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />

                <span className="text-xs font-medium truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}