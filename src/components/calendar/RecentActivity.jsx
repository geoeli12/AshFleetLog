import { format } from 'date-fns';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils";

const statusColors = {
    present: "bg-emerald-50 text-emerald-700 border-emerald-200",
    late: "bg-amber-50 text-amber-700 border-amber-200",
    absent: "bg-red-50 text-red-700 border-red-200",
    "half-day": "bg-blue-50 text-blue-700 border-blue-200",
    remote: "bg-violet-50 text-violet-700 border-violet-200"
};

export default function RecentActivity({ records }) {
    if (!records || records.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
                <div className="text-center py-8 text-slate-500">
                    No recent activity
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
                {records.slice(0, 5).map((record, index) => (
                    <div 
                        key={record.id || index}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                            {record.employee_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                                {record.employee_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                {record.check_in_time && (
                                    <span className="flex items-center gap-1">
                                        <LogIn className="w-3 h-3" />
                                        {record.check_in_time}
                                    </span>
                                )}
                                {record.check_out_time && (
                                    <span className="flex items-center gap-1">
                                        <LogOut className="w-3 h-3" />
                                        {record.check_out_time}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border",
                            statusColors[record.status] || statusColors.present
                        )}>
                            {record.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}