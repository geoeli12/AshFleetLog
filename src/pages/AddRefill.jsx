import { useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/fuel-ui/button";
import { Input } from "@/components/fuel-ui/input";
import { Label } from "@/components/fuel-ui/label";
import { Textarea } from "@/components/fuel-ui/textarea";
import TankGauge from "@/components/fuel/TankGauge";

export default function AddRefill() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    gallons_added: "",
    date: format(new Date(), "yyyy-MM-dd"),
    cost: "",
    invoice_number: "",
    notes: ""
  });

  const { data: readings = [] } = useQuery({
    queryKey: ["readings"],
    queryFn: () => api.entities.FuelReading.list()
  });

  const { data: refills = [] } = useQuery({
    queryKey: ["refills"],
    queryFn: () => api.entities.FuelRefill.list()
  });

  // Calculate current tank level from refills minus usage
  const currentGallons =
    refills.reduce((sum, r) => sum + (r.gallons_added || 0), 0) -
    readings.reduce((sum, r) => sum + (r.gallons_used || 0), 0);

  const createRefillMutation = useMutation({
    mutationFn: async (data) => {
      const gallonsAdded = parseFloat(data.gallons_added);
      const invoice = String(data.invoice_number || "").trim();

      if (!invoice) {
        // UI should prevent this, but keep a hard guard so we never create a refill without an invoice.
        throw new Error("Invoice # is required");
      }

      // Create refill record only - tank level is calculated from refills minus usage
      await api.entities.FuelRefill.create({
        gallons_added: gallonsAdded,
        date: data.date + "T12:00:00",
        cost: data.cost ? parseFloat(data.cost) : null,
        invoice_number: invoice,
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refills"] });
      navigate(createPageUrl("FuelDashboard"));
    }
  });

  const projectedTotal = formData.gallons_added
    ? currentGallons + parseFloat(formData.gallons_added || 0)
    : currentGallons;

  const handleSubmit = (e) => {
    e.preventDefault();
    createRefillMutation.mutate(formData);
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
            <h1 className="text-2xl font-bold text-slate-900">Add Refill</h1>
            <p className="text-slate-500">Record a tank refill</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 space-y-6"
          >
            {/* Gallons Added */}
            <div className="space-y-2">
              <Label>Gallons Added</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 840"
                value={formData.gallons_added}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gallons_added: e.target.value }))
                }
                className="text-xl h-14"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <Label>Cost (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Invoice # */}
            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input
                type="text"
                placeholder="e.g., INV-10483"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, invoice_number: e.target.value }))
                }
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Calculation Preview */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Current Level</span>
                  <span className="font-medium text-emerald-800">
                    {currentGallons.toLocaleString()} gal
                  </span>
                </div>
                {formData.gallons_added && (
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Adding</span>
                    <span className="font-medium text-emerald-600">
                      +{parseFloat(formData.gallons_added).toLocaleString()} gal
                    </span>
                  </div>
                )}
                <div className="h-px bg-emerald-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-medium">New Total</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {projectedTotal.toLocaleString()} gal
                  </span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={
                !formData.gallons_added ||
                !String(formData.invoice_number || "").trim() ||
                createRefillMutation.isPending
              }
              className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 text-base"
            >
              {createRefillMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Refill
                </>
              )}
            </Button>
          </motion.form>

          {/* Tank Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col items-center justify-center"
          >
            <h3 className="text-sm font-medium text-slate-500 mb-4">Tank Preview</h3>
            <TankGauge currentGallons={projectedTotal} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
