import { useState } from 'react';
import { format } from 'date-fns';
import { X, Edit2, Trash2, Clock, LogIn, LogOut, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const statusStyles = {
    present: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Present" },
    late: { bg: "bg-amber-50", text: "text-amber-700", label: "Late" },
    absent: { bg: "bg-red-50", text: "text-red-700", label: "Absent" },
    "half-day": { bg: "bg-blue-50", text: "text-blue-700", label: "Half Day" },
    pto: { bg: "bg-violet-50", text: "text-violet-700", label: "PTO" }
};

export default function DayDetailModal({ 
    open, 
    onOpenChange, 
    selectedDate, 
    records, 
    employees,
    onEdit,
    onDelete,
    onMarkAttendance
}) {
    const [selectedEmployee, setSelectedEmployee] = useState('');
    
    if (!selectedDate) return null;

    const groupedRecords = {
        present: records.filter(r => r.status === 'present'),
        pto: records.filter(r => r.status === 'pto'),
        late: records.filter(r => r.status === 'late'),
        "half-day": records.filter(r => r.status === 'half-day'),
        absent: records.filter(r => r.status === 'absent')
    };

    const renderRecordCard = (record) => {
        const style = statusStyles[record.status] || statusStyles.present;
        
        return (
            <div 
                key={record.id}
                className={cn(
                    "p-4 rounded-xl border transition-all",
                    style.bg,
                    "border-transparent"
                )}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center font-semibold text-slate-700">
                            {record.employee_name?.charAt(0)}
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{record.employee_name}</p>
                            <p className="text-xs text-slate-500">{record.department}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onEdit(record)}
                        >
                            <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onDelete(record)}
                        >
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-sm">
                    {record.check_in_time && (
                        <span className="flex items-center gap-1 text-slate-600">
                            <LogIn className="w-3.5 h-3.5" />
                            {record.check_in_time}
                        </span>
                    )}
                    {record.check_out_time && (
                        <span className="flex items-center gap-1 text-slate-600">
                            <LogOut className="w-3.5 h-3.5" />
                            {record.check_out_time}
                        </span>
                    )}
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", style.text, style.bg)}>
                        {style.label}
                    </span>
                </div>
                
                {record.notes && (
                    <p className="mt-2 text-sm text-slate-500 italic">{record.notes}</p>
                )}
            </div>
        );
    };

    const renderSection = (title, items, status) => {
        if (items.length === 0) return null;
        const style = statusStyles[status];
        
        return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full", style.bg.replace('bg-', 'bg-').replace('-50', '-500'))} />
                    <h4 className="font-semibold text-slate-700">{title} ({items.length})</h4>
                </div>
                <div className="space-y-3">
                    {items.map(renderRecordCard)}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </DialogTitle>
                </DialogHeader>
                
                {/* Add Employee Dropdown */}
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Mark attendance for employee
                            </label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.name} - {emp.department}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={() => {
                                const employee = employees?.find(e => e.id === selectedEmployee);
                                if (employee) {
                                    onMarkAttendance?.(employee);
                                    setSelectedEmployee('');
                                }
                            }}
                            disabled={!selectedEmployee}
                            className="bg-slate-900 hover:bg-slate-800"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                        </Button>
                    </div>
                </div>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="py-2">
                        {renderSection("Present", groupedRecords.present, "present")}
                        {renderSection("PTO", groupedRecords.pto, "pto")}
                        {renderSection("Late", groupedRecords.late, "late")}
                        {renderSection("Half Day", groupedRecords["half-day"], "half-day")}
                        {renderSection("Absent", groupedRecords.absent, "absent")}
                        
                        {records.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                No attendance data for this day
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}