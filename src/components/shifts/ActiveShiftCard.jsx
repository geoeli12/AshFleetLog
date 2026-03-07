
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Truck, Clock, Gauge, User, Calendar, Sun, Moon, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function ActiveShiftCard({ shift, onCancel, onDriverClick }) {
    const startTime = new Date(shift.start_time);
    const now = new Date();
    const hoursWorked = ((now - startTime) / (1000 * 60 * 60)).toFixed(1);
    const isNight = shift.shift_type === 'night';

    return (
        <Card className={`shadow-sm overflow-hidden relative ${
            isNight
                ? 'border border-rose-200/70 bg-rose-50/80'
                : 'border border-indigo-200/70 bg-indigo-50/80'
        }`}>
<div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-12 -translate-x-12" />
            
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={onDriverClick}
                    >
                        <div className="h-12 w-12 rounded-xl bg-white/60 flex items-center justify-center">
                            <Truck className={`h-6 w-6 ${isNight ? "text-indigo-700" : "text-amber-700"}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 opacity-80" />
                                <span className="text-lg font-semibold">{shift.driver_name}</span>
                            </div>
                            <div className={`text-sm ${isNight ? 'text-indigo-700' : 'text-amber-800'}`}>
                                Unit {shift.unit_number}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-white/70 text-zinc-800 border border-black/5 flex items-center gap-1">
                            {isNight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                            {isNight ? 'Night' : 'Day'}
                        </Badge>
                        {shift.attendance_status === 'late' && (
                            <Badge className="bg-red-600 text-zinc-900 border-0">Late</Badge>
                        )}
                        <Badge className="bg-white/70 text-zinc-800 border border-black/5">Active</Badge>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-900/80 hover:text-zinc-900 hover:bg-black/5">
                                    <XCircle className="h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Shift</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to cancel this shift? All runs will be deleted. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">Keep Shift</AlertDialogCancel>
                                    <AlertDialogAction onClick={onCancel} className="bg-red-600 hover:bg-red-700 rounded-xl">
                                        Cancel Shift
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/60 rounded-xl p-3">
                        <div className={`flex items-center gap-2 text-xs mb-1 ${isNight ? 'text-indigo-700' : 'text-amber-800'}`}>
                            <Clock className="h-3.5 w-3.5" /> Started
                        </div>
                        <div className="font-semibold">{format(startTime, 'h:mm a')}</div>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3">
                        <div className={`flex items-center gap-2 text-xs mb-1 ${isNight ? 'text-indigo-700' : 'text-amber-800'}`}>
                            <Gauge className="h-3.5 w-3.5" /> Start Miles
                        </div>
                        <div className="font-semibold">{shift.starting_odometer?.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3">
                        <div className={`flex items-center gap-2 text-xs mb-1 ${isNight ? 'text-indigo-700' : 'text-amber-800'}`}>
                            <Calendar className="h-3.5 w-3.5" /> Hours
                        </div>
                        <div className="font-semibold">{hoursWorked}h</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

