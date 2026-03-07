import { useState } from "react";
import { format } from "date-fns";
import { toDateOrNull } from "@/utils/date";
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

export default function EditReadingDialog({ reading, onSave, isSaving }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    before_reading: reading.before_reading || "",
    after_reading: reading.after_reading || "",
    date: reading.date ? format(toDateOrNull(reading.date) || new Date(0), "yyyy-MM-dd") : "",
    time: reading.time || "",
    notes: reading.notes || ""
  });

  const gallonsUsed = formData.before_reading && formData.after_reading
    ? Math.abs(parseFloat(formData.before_reading) - parseFloat(formData.after_reading))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const before = parseFloat(formData.before_reading);
    const after = parseFloat(formData.after_reading);
    const gallons_used = Math.round(Math.abs(before - after) * 10) / 10;
    
    await onSave(reading.id, {
      before_reading: before,
      after_reading: after,
      gallons_used,
      date: formData.date + "T12:00:00",
      time: formData.time,
      notes: formData.notes
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-500">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Usage Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Before Reading</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.before_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, before_reading: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>After Reading</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.after_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, after_reading: e.target.value }))}
              />
            </div>
          </div>

          {gallonsUsed > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <span className="text-amber-700 font-medium">Gallons Used: {gallonsUsed.toFixed(1)}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}