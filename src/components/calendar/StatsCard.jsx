import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100",
            "transition-all duration-300 hover:shadow-md hover:border-slate-200",
            className
        )}>
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-slate-500">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className="p-3 rounded-xl bg-slate-50">
                        <Icon className="w-6 h-6 text-slate-600" />
                    </div>
                )}
            </div>
        </div>
    );
}