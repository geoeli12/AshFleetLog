import { format } from "date-fns";
import { toDateOrNull } from "@/utils/date";
import { Fuel, User, ArrowRight, ImageIcon, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import EditReadingDialog from "./EditReadingDialog";

export default function ReadingCard({ reading, onDelete, onEdit, isEditing }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <Fuel className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{reading.driver_name}</span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                {format(toDateOrNull(reading.date) || new Date(0), "MMM d")}{reading.time && ` • ${(() => {
                  const [hours, minutes] = reading.time.split(':');
                  const h = parseInt(hours);
                  const period = h >= 12 ? 'pm' : 'am';
                  const displayHour = h % 12 || 12;
                  return `${displayHour}:${minutes}${period}`;
                })()}`}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <span>{reading.before_reading?.toLocaleString()} gal</span>
              <ArrowRight className="w-3 h-3" />
              <span className="font-bold">{reading.after_reading?.toLocaleString()} gal</span>
            </div>
          </div>
        </div>
        
        <div className="text-right flex items-start gap-2">
          <div>
            <div className="text-lg font-bold text-red-500">
              -{reading.gallons_used?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gal
            </div>

            {onEdit && (
              <EditReadingDialog reading={reading} onSave={onEdit} isSaving={isEditing} />
            )}

            {(reading.before_image || reading.after_image) && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-1 ml-auto">
                    <ImageIcon className="w-3 h-3" />
                    View photos
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Fuel Gauge Photos</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    {reading.before_image && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Before</p>
                        <img
                          src={reading.before_image}
                          alt="Before"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    {reading.after_image && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">After</p>
                        <img
                          src={reading.after_image}
                          alt="After"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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
                  <AlertDialogTitle>Delete Usage Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the {reading.gallons_used} gal usage entry and add it back to the tank level. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(reading.id)} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      
      {reading.notes && (
        <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
          {reading.notes}
        </p>
      )}
    </div>
  );
}