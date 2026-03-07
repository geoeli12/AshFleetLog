import { useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Filter, Calendar, TrendingDown, Plus, 
  Fuel, Download, ChevronDown
} from "lucide-react";
import { Button } from "@/components/fuel-ui/button";
import { Badge } from "@/components/fuel-ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/fuel-ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/fuel-ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/fuel-ui/popover";
import { Calendar as CalendarUI } from "@/components/fuel-ui/calendar";
import ReadingCard from "@/components/fuel/ReadingCard";
import RefillCard from "@/components/fuel/RefillCard";

export default function FuelHistory() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // --- Sorting helpers ------------------------------------------------------
  // Supabase DATE columns commonly arrive as "YYYY-MM-DD" strings.
  // Using `new Date("YYYY-MM-DD")` parses as UTC midnight and can shift the day in CST.
  // We also need correct ordering within the same day by the stored `time` string.
  const parseDateOnlyLocal = (value) => {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value !== "string") return null;

    // Date-only: YYYY-MM-DD
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      // Noon local avoids DST/UTC edge weirdness.
      return new Date(y, mo, d, 12, 0, 0, 0);
    }

    // Anything else (ISO with time, etc.)
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const parseTimeToMinutes = (value) => {
    if (!value || typeof value !== "string") return null;
    const s = value.trim();

    // "05:15 AM" / "5:15pm"
    let m = s.match(/^(\d{1,2})\s*:\s*(\d{2})\s*([AaPp][Mm])$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const mi = parseInt(m[2], 10);
      const ap = m[3].toUpperCase();
      if (ap === "AM") {
        if (h === 12) h = 0;
      } else {
        if (h !== 12) h += 12;
      }
      return h * 60 + mi;
    }

    // "05:15" (24h)
    m = s.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
    if (m) {
      const h = parseInt(m[1], 10);
      const mi = parseInt(m[2], 10);
      if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) return h * 60 + mi;
    }

    return null;
  };

  const getActivitySortTs = (item) => {
    const base = parseDateOnlyLocal(item?.date);
    if (!base) return -Infinity;

    const mins = parseTimeToMinutes(item?.time);
    // If an entry has no time (e.g., refills), treat it as end-of-day so it stays grouped.
    const minutes = mins == null ? (23 * 60 + 59) : mins;

    const dt = new Date(base.getTime());
    dt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return dt.getTime();
  };

  const { data: readings = [] } = useQuery({
    queryKey: ['readings'],
    queryFn: () => api.entities.FuelReading.list('-date')
  });

  const { data: refills = [] } = useQuery({
    queryKey: ['refills'],
    queryFn: () => api.entities.FuelRefill.list('-date')
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.entities.Driver.list()
  });

  const deleteReadingMutation = useMutation({
    mutationFn: (id) => api.entities.FuelReading.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readings'] });
    }
  });

  const deleteRefillMutation = useMutation({
    mutationFn: (id) => api.entities.FuelRefill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refills'] });
    }
  });

  const updateReadingMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FuelReading.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readings'] });
    }
  });

  const updateRefillMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FuelRefill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refills'] });
    }
  });

  const exportToExcel = () => {
    const rows = [];
    rows.push(["Date", "Type", "Driver", "Before", "After", "Gallons Used", "Gallons Added", "Cost", "Invoice #", "Notes"]);
    
    allActivity.forEach(item => {
      const safeDate = parseDateOnlyLocal(item?.date) || new Date();
      if (item.type === 'reading') {
        rows.push([
          format(safeDate, "yyyy-MM-dd"),
          "Usage",
          item.driver_name || "",
          item.before_reading || "",
          item.after_reading || "",
          item.gallons_used || "",
          "",
          "",
          "",
          item.notes || ""
        ]);
      } else {
        rows.push([
          format(safeDate, "yyyy-MM-dd"),
          "Refill",
          "",
          "",
          "",
          "",
          item.gallons_added || "",
          item.cost || "",
          item.invoice_number || "",
          item.notes || ""
        ]);
      }
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fuel-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter data
  const filterByDate = (items) => {
    const arr = Array.isArray(items) ? items : [];
    if (dateRange.preset === "all") return arr;
    return arr.filter(item => {
      const d = parseDateOnlyLocal(item?.date);
      if (!d || isNaN(d.getTime())) return false;
      return d >= dateRange.from && d <= dateRange.to;
    });
  };

  const filterByDriver = (items) => {
    if (selectedDriver === "all") return items;
    return items.filter(item => item.driver_id === selectedDriver);
  };

  const filteredReadings = filterByDriver(filterByDate(readings));
  const filteredRefills = filterByDate(refills);

  // Combine for "all" tab
  const allActivity = [
    ...filteredReadings.map(r => ({ ...r, type: 'reading' })),
    ...filteredRefills.map(r => ({ ...r, type: 'refill' }))
  ].sort((a, b) => getActivitySortTs(b) - getActivitySortTs(a));

  // Stats for current filter
  const totalUsed = filteredReadings.reduce((sum, r) => sum + (r.gallons_used || 0), 0);
  const totalRefilled = filteredRefills.reduce((sum, r) => sum + (r.gallons_added || 0), 0);
  const totalCost = filteredRefills.reduce((sum, r) => sum + (r.cost || 0), 0);



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("FuelDashboard")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fuel History</h1>
            <p className="text-slate-500">View all fuel activity</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Driver Filter */}
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToExcel} className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{totalUsed.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
              <div className="text-xs text-slate-500">gal used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">{totalRefilled.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
              <div className="text-xs text-slate-500">gal refilled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-slate-500">total cost</div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl mb-4">
            <TabsTrigger value="all" className="rounded-lg">All Activity</TabsTrigger>
            <TabsTrigger value="usage" className="rounded-lg">Usage</TabsTrigger>
            <TabsTrigger value="refills" className="rounded-lg">Refills</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            <AnimatePresence>
              {allActivity.length === 0 ? (
                <EmptyState />
              ) : (
                allActivity.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    {item.type === 'reading' ? (
                      <ReadingCard 
                        reading={item} 
                        onDelete={(id) => deleteReadingMutation.mutate(id)}
                        onEdit={(id, data) => updateReadingMutation.mutate({ id, data })}
                        isEditing={updateReadingMutation.isPending}
                      />
                    ) : (
                      <RefillCard 
                        refill={item} 
                        onDelete={(id) => deleteRefillMutation.mutate(id)}
                        onEdit={(id, data) => updateRefillMutation.mutate({ id, data })}
                        isEditing={updateRefillMutation.isPending}
                      />
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="usage" className="space-y-3">
            <AnimatePresence>
              {filteredReadings.length === 0 ? (
                <EmptyState message="No usage records found" />
              ) : (
                filteredReadings.map((reading, index) => (
                  <motion.div
                    key={reading.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ReadingCard 
                      reading={reading} 
                      onDelete={(id) => deleteReadingMutation.mutate(id)}
                      onEdit={(id, data) => updateReadingMutation.mutate({ id, data })}
                      isEditing={updateReadingMutation.isPending}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="refills" className="space-y-3">
            <AnimatePresence>
              {filteredRefills.length === 0 ? (
                <EmptyState message="No refills found" />
              ) : (
                filteredRefills.map((refill, index) => (
                  <motion.div
                    key={refill.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <RefillCard 
                      refill={refill} 
                      onDelete={(id) => deleteRefillMutation.mutate(id)}
                      onEdit={(id, data) => updateRefillMutation.mutate({ id, data })}
                      isEditing={updateRefillMutation.isPending}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ message = "No activity found" }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
      <Fuel className="w-12 h-12 mx-auto text-slate-300 mb-4" />
      <p className="text-slate-500">{message}</p>
      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
    </div>
  );
}