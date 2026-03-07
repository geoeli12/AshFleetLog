import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toDateOrNull } from "@/utils/date";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { motion } from "framer-motion";
import {
  Fuel, Plus, Users, TrendingDown, Calendar,
  ArrowUpRight, Droplets, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TankGauge from "@/components/fuel/TankGauge";
import StatsCard from "@/components/fuel/StatsCard";
import ReadingCard from "@/components/fuel/ReadingCard";
import RefillCard from "@/components/fuel/RefillCard";

export default function FuelDashboard() {
  const queryClient = useQueryClient();

  // Calculate tank level from refills minus usage
  const calculateTankLevel = (refillsList, readingsList) => {
    const totalRefilled = refillsList.reduce((sum, r) => sum + (r.gallons_added || 0), 0);
    const totalUsed = readingsList.reduce((sum, r) => sum + (r.gallons_used || 0), 0);
    return totalRefilled - totalUsed;
  };

  const { data: readings = [] } = useQuery({
    queryKey: ['readings'],
    queryFn: () => api.entities.FuelReading.list('-date', 50)
  });

  const { data: refills = [] } = useQuery({
    queryKey: ['refills'],
    queryFn: () => api.entities.FuelRefill.list('-date', 50)
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

  // Calculate current tank level
  const currentTankLevel = calculateTankLevel(refills, readings);

  // Calculate stats
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());

  const weekReadings = readings.filter(r => {
    const date = toDateOrNull(r.date) || new Date(0);
    return date >= thisWeekStart && date <= thisWeekEnd;
  });

  const weekUsage = weekReadings.reduce((sum, r) => sum + (r.gallons_used || 0), 0);
  const totalUsage = readings.reduce((sum, r) => sum + (r.gallons_used || 0), 0);
  const totalRefills = refills.reduce((sum, r) => sum + (r.gallons_added || 0), 0);

  // ✅ PA-only active drivers (matches your AddReading filter logic)
  const paActiveDriversCount = drivers.filter(d =>
    d &&
    d.active !== false &&
    d.state &&
    d.state.trim().toUpperCase() === "PA"
  ).length;

  // Combine and sort activity feed
  const activityFeed = [
    ...readings.map(r => ({ ...r, type: 'reading', sortDate: r.date })),
    ...refills.map(r => ({ ...r, type: 'refill', sortDate: r.date }))
  ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate)).slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Fuel Tracker</h1>
            <p className="text-slate-500 mt-1">Monitor your fleet's fuel usage</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("AddReading")}>
              <Button className="bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200">
                <Fuel className="w-4 h-4 mr-2" />
                Log Usage
              </Button>
            </Link>
            <Link to={createPageUrl("AddRefill")}>
              <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-2" />
                Add Refill
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Tank Gauge */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-6 text-center">Tank Level</h2>
              <TankGauge currentGallons={currentTankLevel} />

              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link to={createPageUrl("AddRefill")}>
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Refill
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="This Week"
                value={`${weekUsage.toFixed(1)} gal`}
                subtitle="fuel used"
                icon={TrendingDown}
                color="red"
              />
              <StatsCard
                title="Total Used"
                value={`${totalUsage.toLocaleString()} gal`}
                subtitle="all time"
                icon={Droplets}
                color="amber"
              />
              <StatsCard
                title="Total Refilled"
                value={`${totalRefills.toLocaleString()} gal`}
                subtitle="all time"
                icon={Plus}
                color="green"
              />
              <StatsCard
                title="Drivers"
                value={paActiveDriversCount}
                subtitle="active (PA)"
                icon={Users}
                color="blue"
              />
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
                <Link to={createPageUrl("FuelHistory")} className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                  View all <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Fuel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity yet</p>
                    <p className="text-sm">Start by logging fuel usage or a refill</p>
                  </div>
                ) : (
                  activityFeed.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
