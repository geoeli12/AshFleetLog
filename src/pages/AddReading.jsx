import { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Fuel, Save, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUpload from "@/components/fuel/ImageUpload";

export default function AddReading() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    driver_id: "",
    driver_name: "",
    before_image: "",
    after_image: "",
    before_reading: "",
    after_reading: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    notes: ""
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.entities.Driver.list('name')
  });



  
  const activeDrivers = (Array.isArray(drivers) ? drivers : []).filter(d => d && d.active !== false);
  const paDrivers = activeDrivers.filter(d => String(d?.state || '').trim().toUpperCase() === 'PA');
const createReadingMutation = useMutation({
    mutationFn: async (data) => {
      const before = parseFloat(data.before_reading);
      const after = parseFloat(data.after_reading);
      // Always store positive gallons_used (absolute difference), rounded to 1 decimal
      const gallons_used = Math.round(Math.abs(before - after) * 10) / 10;
      
      // Create the reading (tank level is calculated, not stored)
      await api.entities.FuelReading.create({
        ...data,
        before_reading: before,
        after_reading: after,
        gallons_used,
        date: data.date + "T12:00:00"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readings'] });
      navigate(createPageUrl("FuelDashboard"));
    }
  });

  const handleDriverChange = (driverId) => {
    const driver = paDrivers.find(d => d.id === driverId);
    setFormData(prev => ({
      ...prev,
      driver_id: driverId,
      driver_name: driver?.name || ""
    }));
  };

  const gallonsUsed = formData.before_reading && formData.after_reading
    ? Math.abs(parseFloat(formData.before_reading) - parseFloat(formData.after_reading))
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    createReadingMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("FuelDashboard")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Log Fuel Usage</h1>
            <p className="text-slate-500">Record a driver's fuel consumption</p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-6"
        >
          {/* Driver Selection */}
          <div className="space-y-2">
            <Label>Driver</Label>
            {paDrivers.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500 mb-3">No PA drivers available</p>
                <Link to={createPageUrl("Drivers")}>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Drivers
                  </Button>
                </Link>
              </div>
            ) : (
              <Select value={formData.driver_id} onValueChange={handleDriverChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {paDrivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>

          {/* Image Uploads */}
          <div className="grid sm:grid-cols-2 gap-4">
            <ImageUpload
              label="Before Photo"
              value={formData.before_image}
              onChange={(url) => setFormData(prev => ({ ...prev, before_image: url }))}
            />
            <ImageUpload
              label="After Photo"
              value={formData.after_image}
              onChange={(url) => setFormData(prev => ({ ...prev, after_image: url }))}
            />
          </div>

          {/* Readings */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Before Reading (gallons)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 500"
                value={formData.before_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, before_reading: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>After Reading (gallons)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 450"
                value={formData.after_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, after_reading: e.target.value }))}
              />
            </div>
          </div>

          {/* Usage Display */}
          {gallonsUsed !== 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-700 font-medium">Gallons Used</span>
                <span className="text-2xl font-bold text-amber-600">{gallonsUsed.toFixed(1)} gal</span>
              </div>
            </motion.div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!formData.driver_id || !formData.before_reading || !formData.after_reading || createReadingMutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 h-12 text-base"
          >
            {createReadingMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Reading
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}