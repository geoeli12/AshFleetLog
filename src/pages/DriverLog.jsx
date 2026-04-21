import React, { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Plus, Route, Loader2, User, Truck, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { useLocation } from "react-router-dom";
import StartShiftForm from '@/components/shifts/StartShiftForm';
import AddRunForm from '@/components/shifts/AddRunForm';
import RunCard from '@/components/shifts/RunCard';
import EndShiftForm from '@/components/shifts/EndShiftForm';
import ActiveShiftCard from '@/components/shifts/ActiveShiftCard';
import EditRunDialog from '@/components/shifts/EditRunDialog';

function computeAttendanceStatus(shiftType, startTime) {
    const start = new Date(startTime);
    const hour = start.getHours();
    const minute = start.getMinutes();
    const totalMinutes = hour * 60 + minute;

    if (shiftType === 'day') {
        // Day shift starts at 6:00 AM (360 min). Late if after 6:00 AM
        return totalMinutes > 360 ? 'late' : 'present';
    } else if (shiftType === 'night') {
        // Night shift starts at 6:00 PM (1080 min). Late if after 6:00 PM
        return totalMinutes > 1080 ? 'late' : 'present';
    }
    return 'present';
}

export default function DriverLog() {
    const [showAddRun, setShowAddRun] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [editingRun, setEditingRun] = useState(null);
    const [initialPtoOpen, setInitialPtoOpen] = useState(false);
    const [initialPtoDates, setInitialPtoDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const queryClient = useQueryClient();
    const location = useLocation();


    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const driver = sp.get('driver');
        const mode = sp.get('mode');
        const dates = sp.get('dates');
        if (driver) setSelectedDriver(driver);
        if (mode === 'pto') {
            setInitialPtoOpen(true);
            const arr = (dates || '').split(',').map(s => s.trim()).filter(Boolean);
            setInitialPtoDates(arr);
        } else {
            setInitialPtoOpen(false);
            setInitialPtoDates([]);
        }
    }, [location.search]);

    const { data: drivers = [], isLoading: driversLoading } = useQuery({
        queryKey: ['drivers'],
        queryFn: () => api.entities.Driver.filter({ active: true }, 'name')
    });

    const { data: allActiveShifts = [], isLoading: shiftsLoading } = useQuery({
        queryKey: ['activeShifts'],
        queryFn: () => api.entities.Shift.filter({ status: 'active' }, '-created_date', 100)
    });

    const { data: shiftsByDate = [], isLoading: shiftsByDateLoading } = useQuery({
        queryKey: ['shiftsByDate', format(selectedDate, 'yyyy-MM-dd')],
        queryFn: () => api.entities.Shift.filter(
            { shift_date: format(selectedDate, 'yyyy-MM-dd') },
            '-created_date',
            100
        )
    });

    const filteredShifts = shiftsByDate;

    const selectedShift = selectedDriver
      ? allActiveShifts.find(s => s.driver_name === selectedDriver) 
        || filteredShifts.find(s => s.driver_name === selectedDriver)
      : null;

    const activeShift = selectedDriver 
        ? allActiveShifts.find(shift => shift.driver_name === selectedDriver)
        : null;

    const { data: driverOrders = [], isLoading: runsLoading } = useQuery({
        queryKey: ['driverOrders', selectedDriver, selectedDate],
        queryFn: async () => {

            if (!selectedShift) return [];

            const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

            // 🔵 DISPATCH ORDERS (DELIVERY)
            const dispatch = await api.entities.DispatchOrder.filter({
                delivered_by: selectedShift.driver_name,
                //date: selectedDateStr
            });

            // 🟢 PICKUP ORDERS
            const pickups = await api.entities.PickupOrder.filter({
                driver: selectedShift.driver_name,
                //date_called_out: selectedDateStr
            });

            const dispatchArr = Array.isArray(dispatch) ? dispatch : dispatch?.data || [];
            const pickupArr = Array.isArray(pickups) ? pickups : pickups?.data || [];

            const dispatchFiltered = dispatchArr.filter(d =>
                String(d.date).startsWith(selectedDateStr)
            );

            const pickupFiltered = pickupArr.filter(p =>
                String(p.date_called_out).startsWith(selectedDateStr)
            );

            // 🔥 NORMALIZE (MATCH YOUR REAL COLUMNS)
            const normalizedDispatch = dispatchFiltered.map(d => ({
                id: `d-${d.id}`,
                type: "delivery",

                customer: d.customer || d.company || "",
                trailer_number: d.trailer_number || "",   // ✅ CORRECT
                notes: d.notes || "",

                date: d.date,
                raw: d
            }));

            const normalizedPickup = pickupFiltered.map(p => ({
                id: `p-${p.id}`,
                type: "pickup",

                customer: p.company || p.customer || "",
                trailer_number: p.dk_trl || p.trailer_number || "",   // ✅ CORRECT (IMPORTANT FIX)
                notes: p.notes || "",

                date: p.date_called_out,
                raw: p
            }));

            return [...normalizedDispatch, ...normalizedPickup];
        },
        enabled: !!selectedDriver
    });

    const startShiftMutation = useMutation({
        mutationFn: (data) => {
            const attendanceStatus = computeAttendanceStatus(data.shift_type, data.start_time);

            const payload = {
                driver_name: data.driver_name,
                unit_number: data.unit_number,
                shift_type: data.shift_type,
                shift_date: data.shift_date,

                start_time: data.start_time,

                // ✅ USE ONLY ONE FIELD (MATCH YOUR TABLE)
                start_odometer: parseInt(data.start_odometer),

                attendance_status: attendanceStatus,
                status: "active",

                // ✅ LOCATION DATA (THIS IS WHAT YOU CARE ABOUT)
                start_lat: data.start_lat,
                start_lng: data.start_lng,
                start_address: data.start_address,
                outside_location: data.outside_location,
                outside_reason: data.outside_reason
            };

            return api.entities.Shift.create(payload);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activeShifts'] })
    });

    const ptoMutation = useMutation({
        mutationFn: async (data) => {
            const driver_name = data.driver_name;
            const pto_dates = Array.isArray(data.pto_dates) ? data.pto_dates : [];

            // Create one completed PTO shift row per selected date
            await Promise.all(
                pto_dates.map((d) =>
                    api.entities.Shift.create({
                        shift_date: d,
                        shift_type: 'pto',
                        status: 'completed',
                        attendance_status: 'pto',
                        driver_name,
                        start_time: new Date().toISOString(),
                    })
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            // PTO is not "active", so reset back to the start state for clarity
            setSelectedDriver("");
        }
    });

    const cancelShiftMutation = useMutation({
        mutationFn: async (shiftId) => {

            // 🔥 GET RUNS FOR THIS SHIFT (safe way, not relying on local state)
            const shiftRuns = await api.entities.Run.filter({ shift_id: shiftId });

            const runsArray = Array.isArray(shiftRuns)
                ? shiftRuns
                : shiftRuns?.data || [];

            // 🔥 DELETE RUNS
            for (const run of runsArray) {
                //await api.entities.Run.delete(run.id);
            }

            // 🔥 DELETE SHIFT
            await api.entities.Shift.delete(shiftId);

            return shiftId; // 👈 IMPORTANT (we use this in onSuccess)
        },

        onSuccess: async (deletedShiftId) => {

            // 🚀 INSTANT UI UPDATE
            queryClient.setQueryData(
                ['shiftsByDate', format(selectedDate, 'yyyy-MM-dd')],
                (old) => old?.filter(s => s.id !== deletedShiftId) || []
            );

            // 🔄 REFRESH EVERYTHING
            await queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            await queryClient.invalidateQueries({ queryKey: ['runs'] });

            await queryClient.invalidateQueries({
                queryKey: ['shiftsByDate', format(selectedDate, 'yyyy-MM-dd')]
            });
        }
    });

    // const addRunMutation = useMutation({
    //    mutationFn: (data) => api.entities.Run.create(data),
    //    onSuccess: () => {
    //        queryClient.invalidateQueries({ queryKey: ['runs'] });
    //        setShowAddRun(false);
    //    }
    // });

    // const updateRunMutation = useMutation({
    //    mutationFn: ({ id, data }) => api.entities.Run.update(id, data),
    //    onSuccess: () => {
    //        queryClient.invalidateQueries({ queryKey: ['runs'] });
    //        setEditingRun(null);
    //    }
    // });

    const endShiftMutation = useMutation({
        mutationFn: (data) => api.entities.Shift.update(activeShift.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
            queryClient.invalidateQueries({ queryKey: ['runs'] });
        }
    });

    if (shiftsLoading || driversLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-2xl mx-auto px-4 py-8">


                <div className="mb-8">
                    <h1 className="text-3xl font-light tracking-tight text-zinc-900">
                        Driver's <span className="font-semibold">Log</span>
                    </h1>
                    <p className="text-zinc-600 mt-1">Track your shifts and runs</p>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">

                    <Button
                        variant="outline"
                        onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                        className="rounded-xl"
                    >
                        ←
                    </Button>

                    {/* ✅ DATE PICKER */}
                    <div className="flex flex-col items-center">
                        
                        <input
                            type="date"
                            value={format(selectedDate, "yyyy-MM-dd")}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="border rounded-lg px-3 py-1 text-sm"
                        />

                        <div className="text-lg font-semibold text-zinc-800 mt-1">
                            {format(selectedDate, "EEEE, MMM d yyyy")}
                        </div>

                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                        className="rounded-xl"
                    >
                        →
                    </Button>

                </div>

                {/* Driver Selection */}
                <Card className="border-0 shadow-md bg-black/60 backdrop-blur-sm mb-6">
                    <CardContent className="p-4">
                        <Label className="text-sm font-medium text-white/90 mb-2 block flex items-center gap-2">
                            <User className="h-4 w-4" /> Select Driver
                        </Label>
                        <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                            <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white text-slate-800">
                                <SelectValue
                                    placeholder="Select your name to begin"
                                    className="text-slate-500"
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.name}>
                                        {driver.name}
                                        {allActiveShifts.find(s => s.driver_name === driver.name) && (
                                            <span className="ml-2 text-xs text-amber-700">● Active</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {!selectedDriver ? (
                    <>
                        <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-amber-200/70 mb-6">
                            <User className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                            <p className="text-zinc-600 font-medium">Select your name to get started</p>
                        </div>

                        {filteredShifts.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-amber-700" />
                                    Shifts
                                    <span className="text-sm font-normal text-zinc-500">({filteredShifts.length})</span>
                                </h2>
                                <div className="grid gap-3">
                                    {filteredShifts.map((shift) => {
                                        const isNight = shift.shift_type === 'night';
                                        return (
                                            <Card key={shift.id} className={`border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                                                isNight ? 'bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200/60' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60'
                                            }`}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1" onClick={() => setSelectedDriver(shift.driver_name)}>
                                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                                                isNight ? 'bg-gradient-to-br from-rose-100 to-rose-200/70' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                                                            }`}>
                                                                <User className={`h-5 w-5 ${isNight ? 'text-rose-600' : 'text-indigo-600'}`} />
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-zinc-900">{shift.driver_name}</div>
                                                                <div className="text-sm text-zinc-600">Unit {shift.unit_number} • Started {format(new Date(shift.start_time), 'h:mm a')}</div>
                                                            </div>
                                                            <Badge className={`ml-auto ${isNight ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'} border-0`}>
                                                                {isNight ? 'Night' : 'Day'}
                                                            </Badge>
                                                        </div>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                                                                    onClick={(e) => e.stopPropagation()}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Cancel Shift</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to cancel {shift.driver_name}'s shift? All runs will be deleted.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl">Keep Shift</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={async () => {

                                                                            // 🔥 DELETE RUNS FIRST
                                                                            const shiftRuns = await api.entities.Run.filter({ shift_id: shift.id });

                                                                            const runsArray = Array.isArray(shiftRuns)
                                                                                ? shiftRuns
                                                                                : shiftRuns?.data || [];

                                                                            for (const run of runsArray) {
                                                                                // await api.entities.Run.delete(run.id);
                                                                            }

                                                                            // 🔥 DELETE SHIFT
                                                                            await api.entities.Shift.delete(shift.id);

                                                                            // 🚀 INSTANT UI UPDATE (no page refresh needed)
                                                                            queryClient.setQueryData(['shiftsByDate', format(selectedDate, 'yyyy-MM-dd')], (old) =>
                                                                                old?.filter(s => s.id !== shift.id) || []
                                                                            );

                                                                            // 🔄 FORCE REFRESH ALL RELATED DATA
                                                                            await queryClient.invalidateQueries({ queryKey: ['activeShifts'] });
                                                                            await queryClient.invalidateQueries({ queryKey: ['runs'] });

                                                                            await queryClient.invalidateQueries({
                                                                                queryKey: ['shiftsByDate', format(selectedDate, 'yyyy-MM-dd')]
                                                                            });
                                                                        }}
                                                                        className="bg-red-600 hover:bg-red-700 rounded-xl"
                                                                    >
                                                                        Cancel Shift
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <AnimatePresence mode="wait">
                        {!selectedShift ? (
                            <motion.div key="start-shift" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                <StartShiftForm 
                                    onSubmit={(data) => startShiftMutation.mutate({...data, driver_name: selectedDriver})}
                                    onPTO={(data) => ptoMutation.mutate({...data, driver_name: selectedDriver})}
                                    onCancel={() => setSelectedDriver("")}   // ✅ ADD THIS
                                    isLoading={startShiftMutation.isPending || ptoMutation.isPending}
                                    drivers={drivers}
                                    initialIsPTO={initialPtoOpen}
                                    initialPtoDates={initialPtoDates}
                                />
                            </motion.div>
                        ) : (
                            <motion.div key="active-shift" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                                <ActiveShiftCard 
                                    shift={selectedShift} 
                                    onCancel={() => cancelShiftMutation.mutate(selectedShift.id)}
                                    onDriverClick={() => setSelectedDriver('')}
                                />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                                            <Route className="h-5 w-5 text-amber-700" />
                                            Orders
                                            <span className="text-sm font-normal text-zinc-500">({driverOrders.length})</span>
                                        </h2>
                                        {!showAddRun && (
                                            <Button onClick={() => setShowAddRun(true)}
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                                                <Plus className="h-4 w-4 mr-2" /> Add Run
                                            </Button>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {showAddRun && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <AddRunForm
                                                    shiftId={selectedShift.id}
                                                    driverName={selectedShift.driver_name}
                                                    //onSubmit={(data) => addRunMutation.mutate(data)}
                                                    onSubmit={(data) => {
                                                        console.log("TEMP RUN SUBMIT:", data);
                                                    }}
                                                    isLoading={false}
                                                    onCancel={() => setShowAddRun(false)}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {runsLoading ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                        </div>
                                    ) : driverOrders.length === 0 ? (
                                        <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-amber-200/70">
                                            <Route className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                                            <p className="text-zinc-600 font-medium">No orders assigned yet</p>
                                            <p className="text-zinc-500 text-sm mt-1">Assign orders from Dispatch or Pick Ups</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {driverOrders.map((run, index) => (
                                                <motion.div key={run.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                                                    <RunCard
                                                        run={{
                                                            ...run,
                                                            run_type: run.type, // 🔥 THIS IS THE FIX
                                                            trailer_dropped: run.trailer_number,
                                                            customer_name: run.customer
                                                        }}
                                                        index={index}
                                                        isCurrentRun={index === 0}
                                                        onClick={() => setEditingRun(run)}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <EndShiftForm shift={selectedShift} onSubmit={(data) => endShiftMutation.mutate(data)} isLoading={endShiftMutation.isPending} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {editingRun && (
                <EditRunDialog
                    run={editingRun}
                    open={!!editingRun}
                    onClose={() => setEditingRun(null)}
                    // onSave={(data) => updateRunMutation.mutate({ id: editingRun.id, data })}
                    onSave={(data) => {
                        console.log("TEMP EDIT RUN:", data);
                    }}
                    isSaving={false}
                />
            )}
        </div>
    );
}