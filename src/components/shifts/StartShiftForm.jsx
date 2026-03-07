
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, Clock, Gauge, Sun, Moon, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function StartShiftForm({ onSubmit, onPTO, isLoading, drivers = [], initialIsPTO = false, initialPtoDates = [] }) {
    const [formData, setFormData] = useState({
        unit_number: '',
        starting_odometer: '',
        shift_type: 'day'
    });
    const [isPTO, setIsPTO] = useState(false);
    const [ptoDates, setPtoDates] = useState([]);

    useEffect(() => {
        if (initialIsPTO) {
            setIsPTO(true);
            const parsed = (initialPtoDates || [])
                .filter(Boolean)
                .map(d => {
                    try { return parseISO(d); } catch { return null; }
                })
                .filter(Boolean);
            if (parsed.length) setPtoDates(parsed);
        }
    }, [initialIsPTO, initialPtoDates]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isPTO) {
            if (ptoDates.length === 0) return;
            onPTO({
                pto_dates: ptoDates.map(d => format(d, 'yyyy-MM-dd')),
                shift_type: 'pto',
                status: 'completed'
            });
        } else {
            const now = new Date();
            onSubmit({
                ...formData,
                start_odometer: parseFloat(formData.starting_odometer),
                start_time: now.toISOString(),
                shift_date: now.toISOString().split('T')[0],
                status: 'active'
            });
        }
    };

    return (
        <Card className="border-0 shadow-xl bg-white ring-1 ring-black/5 backdrop-blur-sm">
            <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-light tracking-tight text-white flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/100 to-amber-600 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-white" />
                    </div>
                    Start Your Shift
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-white/70">
                            Shift Type
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => { setFormData({...formData, shift_type: 'day'}); setIsPTO(false); }}
                                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                                    formData.shift_type === 'day' && !isPTO
                                        ? 'border-amber-400 bg-amber-50 text-amber-700' 
                                        : 'border-slate-200 bg-black text-white/70 hover:border-slate-300'
                                }`}
                            >
                                <Sun className="h-5 w-5" />
                                Day Shift
                            </button>
                            <button
                                type="button"
                                onClick={() => { setFormData({...formData, shift_type: 'night'}); setIsPTO(false); }}
                                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                                    formData.shift_type === 'night' && !isPTO
                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-200 bg-black text-white/70 hover:border-slate-300'
                                }`}
                            >
                                <Moon className="h-5 w-5" />
                                Night Shift
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsPTO(true); setFormData({...formData, shift_type: 'pto'}); }}
                                className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${
                                    isPTO
                                        ? 'border-violet-400 bg-violet-50 text-violet-700' 
                                        : 'border-slate-200 bg-black text-white/70 hover:border-slate-300'
                                }`}
                            >
                                <CalendarDays className="h-5 w-5" />
                                PTO
                            </button>
                        </div>
                    </div>

                    {isPTO ? (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Select PTO Date(s)
                            </Label>
                            <div className="bg-white rounded-xl border border-slate-200 p-3 flex justify-center">
                                <Calendar
                                    mode="multiple"
                                    selected={ptoDates}
                                    onSelect={setPtoDates}
                                    className="rounded-md"
                                    classNames={{
                                        // Make "today" clearly different from selected days
                                        day_today: "bg-amber-100 text-amber-900 ring-2 ring-amber-400",
                                        // Selected PTO days (multi-select)
                                        day_selected: "bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
                                    }}
                                />
                            </div>
                            {ptoDates.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {ptoDates.map((d, i) => (
                                        <span key={i} className="px-3 py-1 bg-violet-100 text-violet-700 text-sm rounded-full font-medium">
                                            {format(d, 'MMM d, yyyy')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="unit_number" className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Unit Number
                                </Label>
                                <Input
                                    id="unit_number"
                                    placeholder="e.g. TRK-101"
                                    value={formData.unit_number}
                                    onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                                    className="h-12 border-slate-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="starting_odometer" className="text-sm font-medium text-white/70 flex items-center gap-2">
                                    <Gauge className="h-4 w-4" />
                                    Starting Odometer (miles)
                                </Label>
                                <Input
                                    id="starting_odometer"
                                    type="number"
                                    placeholder="e.g. 125000"
                                    value={formData.starting_odometer}
                                    onChange={(e) => setFormData({...formData, starting_odometer: e.target.value})}
                                    className="h-12 border-slate-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <Button 
                        type="submit" 
                        disabled={isLoading || (isPTO && ptoDates.length === 0)}
                        className={`w-full h-12 font-medium rounded-xl shadow-lg transition-all duration-300 ${
                            isPTO 
                                ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-violet-500/25'
                                : 'bg-gradient-to-r from-amber-500/100 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white shadow-amber-500/20'
                        }`}
                    >
                        {isPTO ? (
                            <>
                                <CalendarDays className="h-4 w-4 mr-2" />
                                {isLoading ? 'Submitting...' : 'Submit PTO'}
                            </>
                        ) : (
                            <>
                                <Clock className="h-4 w-4 mr-2" />
                                {isLoading ? 'Starting...' : 'Clock In & Start Shift'}
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

