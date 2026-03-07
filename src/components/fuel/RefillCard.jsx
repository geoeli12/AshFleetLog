import { format } from "date-fns";
import { Plus, DollarSign, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EditRefillDialog from "./EditRefillDialog";

export default function RefillCard({ refill, onDelete, onEdit, isEditing }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl">
            <Plus className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Tank Refill</span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                {format(new Date(refill.date + "T12:00:00"), "MMM d")}
              </Badge>
            </div>
            {refill.invoice_number && (
              <div className="mt-1 text-xs text-slate-500">
                Invoice: <span className="font-medium text-slate-600">{refill.invoice_number}</span>
              </div>
            )}
            {refill.cost && (
              <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                <DollarSign className="w-3 h-3" />
                <span>${refill.cost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right flex items-start gap-2">
          <div>
            <div className="text-lg font-bold text-emerald-500">
              +{refill.gallons_added?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gal
            </div>

            {onEdit && (
              <EditRefillDialog refill={refill} onSave={onEdit} isSaving={isEditing} />
            )}
            </div>

            {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Refill</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the {refill.gallons_added?.toLocaleString()} gal refill and deduct it from the tank level. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(refill.id)} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      
      {refill.notes && (
        <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
          {refill.notes}
        </p>
      )}
    </div>
  );
}