import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const statusColors = {
    present: "bg-emerald-500",
    late: "bg-amber-500",
    absent: "bg-red-500",
    "half-day": "bg-blue-500",
    pto: "bg-violet-500"
};

export default function AttendanceCalendar({ attendance, employees, onDayClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of the week for the first day (0 = Sunday)
    const startDay = monthStart.getDay();
    const paddingDays = Array(startDay).fill(null);

    const previousMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const getDayData = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = attendance.filter(r => r.date === dateStr);
        
        const present = dayRecords.filter(r => r.status === 'present');
        const late = dayRecords.filter(r => r.status === 'late');
        const absent = dayRecords.filter(r => r.status === 'absent');
        const pto = dayRecords.filter(r => r.status === 'pto');

        return {
            records: dayRecords,
            present,
            late,
            absent,
            pto,
            hasAbsent: absent.length > 0
        };
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Attendance Calendar</h3>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={previousMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-slate-700 min-w-32 text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600">Late</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-slate-600">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    <span className="text-slate-600">PTO</span>
                </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <TooltipProvider>
                <div className="grid grid-cols-7 gap-1">
                    {/* Padding for start of month */}
                    {paddingDays.map((_, index) => (
                        <div key={`padding-${index}`} className="aspect-square" />
                    ))}

                    {/* Actual days */}
                    {days.map(day => {
                        const dayData = getDayData(day);
                        const hasData = dayData.records.length > 0;

                        return (
                            <Tooltip key={day.toISOString()}>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={() => onDayClick?.(day, dayData)}
                                        className={cn(
                                            "aspect-square rounded-lg flex flex-col items-center justify-center p-1 cursor-pointer transition-all",
                                            isToday(day) && "ring-2 ring-slate-900 ring-offset-1",
                                            dayData.hasAbsent && "bg-red-50",
                                            !dayData.hasAbsent && hasData && "bg-emerald-50",
                                            "hover:bg-slate-100"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isToday(day) ? "text-slate-900" : "text-slate-700"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        
                                        {/* Status indicators */}
                                        {hasData && (
                                            <div className="flex gap-0.5 mt-1">
                                                {dayData.present.length > 0 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                )}
                                                {dayData.late.length > 0 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                )}
                                                {dayData.absent.length > 0 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                )}
                                                {dayData.pto.length > 0 && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                    <div className="text-sm">
                                        <p className="font-semibold mb-2">{format(day, 'EEEE, MMM d')}</p>
                                        
                                        {dayData.present.length > 0 && (
                                            <div className="mb-2">
                                                <p className="text-emerald-600 font-medium text-xs">Present ({dayData.present.length})</p>
                                                <p className="text-xs text-slate-500">
                                                    {dayData.present.map(r => r.employee_name).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {dayData.late.length > 0 && (
                                            <div className="mb-2">
                                                <p className="text-amber-600 font-medium text-xs">Late ({dayData.late.length})</p>
                                                <p className="text-xs text-slate-500">
                                                    {dayData.late.map(r => r.employee_name).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {dayData.absent.length > 0 && (
                                            <div className="mb-2">
                                                <p className="text-red-600 font-medium text-xs">Absent ({dayData.absent.length})</p>
                                                <p className="text-xs text-slate-500">
                                                    {dayData.absent.map(r => r.employee_name).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {dayData.pto.length > 0 && (
                                            <div className="mb-2">
                                                <p className="text-violet-600 font-medium text-xs">PTO ({dayData.pto.length})</p>
                                                <p className="text-xs text-slate-500">
                                                    {dayData.pto.map(r => r.employee_name).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {!hasData && (
                                            <p className="text-xs text-slate-400">No attendance marked</p>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>
        </div>
    );
}