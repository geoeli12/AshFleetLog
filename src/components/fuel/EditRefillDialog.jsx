import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EditRefillDialog({ refill, onSave, isSaving }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    gallons_added: refill.gallons_added || "",
    date: refill.date ? format(new Date(refill.date), "yyyy-MM-dd") : "",
    cost: refill.cost || "",
    invoice_number: refill.invoice_number || "",
    notes: refill.notes || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invoice = String(formData.invoice_number || "").trim();

    if (!invoice) return;

    await onSave(refill.id, {
      gallons_added: parseFloat(formData.gallons_added),
      date: formData.date + "T12:00:00",
      cost: formData.cost ? parseFloat(formData.cost) : null,
      invoice_number: invoice,
      notes: formData.notes,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-emerald-500"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Refill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Gallons Added</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.gallons_added}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gallons_added: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Cost (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invoice #</Label>
            <Input
              type="text"
              placeholder="e.g., INV-10483"
              value={formData.invoice_number}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  invoice_number: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            disabled={isSaving || !String(formData.invoice_number || "").trim()}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
