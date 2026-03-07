import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Clock, Package, ArrowDown, ArrowUp, TruckIcon, PackageCheck, FileText } from "lucide-react";
import { format } from "date-fns";

function formatTotalTime(arrival, departure) {
    if (!arrival || !departure) return null;

    const a = new Date(arrival);
    const d = new Date(departure);
    if (isNaN(a.getTime()) || isNaN(d.getTime())) return null;

    let diffMs = d.getTime() - a.getTime();
    // If user accidentally enters times that cross midnight without a date change, treat as next day.
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

    const totalMinutes = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hrLabel = hours === 1 ? "hr" : "hrs";

    if (hours > 0 && minutes === 0) return `${hours}${hrLabel}`;
    if (hours > 0) return `${hours}${hrLabel} ${minutes}min`;
    return `${minutes}min`;
}


const defaultLoadTypeColors = {
    scrap: "bg-amber-100 text-amber-800 border-amber-200",
    occ: "bg-blue-100 text-blue-800 border-blue-200",
    mix: "bg-purple-100 text-purple-800 border-purple-200",
    empty: "bg-slate-100 text-zinc-700 border-slate-200"
};

export default function RunCard({ run, index, isCurrentRun, onClick }) {
    const loadTypeColor = defaultLoadTypeColors[run.load_type] || "bg-amber-100 text-amber-800 border-amber-200";

    return (
        <Card 
            className={`border-0 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                isCurrentRun 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-400/50' 
                    : 'bg-white ring-1 ring-black/5'
            }`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            run.run_type === 'pickup' 
                                ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900'
                                : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700'
                        }`}>
                            {run.run_type === 'pickup' ? <PackageCheck className="h-4 w-4" /> : <TruckIcon className="h-4 w-4" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-zinc-900 font-medium">
                                <Building2 className="h-4 w-4 text-amber-300" />
                                {run.customer_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-600 mt-0.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {run.city}
                            </div>
                        </div>
                    </div>
                                        {isCurrentRun && (
                        <Badge className="bg-amber-200 text-amber-800 border-0 text-[10px] px-2 py-0.5">
                            Current
                        </Badge>
                    )}

                    {run.load_type && (
                        <Badge className={`${loadTypeColor} border font-medium`}>
                            <Package className="h-3 w-3 mr-1" />
                            {run.load_type.toUpperCase()}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    {run.trailer_dropped && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                            <ArrowDown className="h-4 w-4 text-red-500" />
                            <span className="text-zinc-700">Dropped: <span className="font-medium text-zinc-900">{run.trailer_dropped}</span></span>
                        </div>
                    )}
                    {run.trailer_picked_up && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg">
                            <ArrowUp className="h-4 w-4 text-amber-300" />
                            <span className="text-zinc-700">Picked: <span className="font-medium text-zinc-900">{run.trailer_picked_up}</span></span>
                        </div>
                    )}
                </div>

                {(run.arrival_time || run.departure_time) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/10 text-sm text-zinc-600">
                        <Clock className="h-4 w-4" />
                        {run.arrival_time && (
                            <span>In: <span className="font-medium text-zinc-900">{format(new Date(run.arrival_time), 'h:mm a')}</span></span>
                        )}
                        {run.departure_time && (
                            <span>Out: <span className="font-medium text-zinc-900">{format(new Date(run.departure_time), 'h:mm a')}</span></span>
                        )}
                    
                        {formatTotalTime(run.arrival_time, run.departure_time) && (
                            <span className="ml-auto text-zinc-600">
                                Total: <span className="font-medium text-zinc-900">{formatTotalTime(run.arrival_time, run.departure_time)}</span>
                            </span>
                        )}
                    </div>
                )}

                {run.notes && (
                    <div className="mt-3 pt-3 border-t border-black/10">
                        <div className="flex items-start gap-2 text-sm text-zinc-700">
                            <FileText className="h-4 w-4 mt-0.5 text-slate-400" />
                            <span className="italic">{run.notes}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
