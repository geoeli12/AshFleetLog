
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Building2, Package, Clock, ArrowRightLeft, TruckIcon, PackageCheck, FileText } from "lucide-react";

const DEFAULT_LOAD_TYPES = ['scrap', 'occ', 'mix', 'empty'];

export default function EditRunDialog({ run, open, onClose, onSave, isSaving }) {
    const buildInitialData = (r) => ({
        run_type: r?.run_type || 'delivery',
        customer_name: r?.customer_name || '',
        city: r?.city || '',
        trailer_dropped: r?.trailer_dropped || '',
        trailer_picked_up: r?.trailer_picked_up || '',
        load_type: r?.load_type || '',
        arrival_time: r?.arrival_time ? new Date(r.arrival_time).toISOString().slice(0, 16) : '',
        departure_time: r?.departure_time ? new Date(r.departure_time).toISOString().slice(0, 16) : '',
        notes: r?.notes || ''
    });

    const [data, setData] = useState(() => buildInitialData(run));

    useEffect(() => {
        if (open) setData(buildInitialData(run));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, open]);


    const { data: customLoadTypes = [] } = useQuery({
        queryKey: ['customLoadTypes'],
        queryFn: () => api.entities.CustomLoadType.list('name')
    });

    const allLoadTypes = useMemo(() => {
        const list = [
            ...DEFAULT_LOAD_TYPES,
            ...customLoadTypes
                .map(t => String(t.name || '').toLowerCase())
                .filter(n => n && !DEFAULT_LOAD_TYPES.includes(n))
        ];

        const runLoad = run?.load_type ? String(run.load_type).toLowerCase() : '';
        if (runLoad && !list.includes(runLoad)) list.push(runLoad);

        return list;
    }, [customLoadTypes, run]);


    const handleSave = () => {
        onSave({
            ...data,
            arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
            departure_time: data.departure_time ? new Date(data.departure_time).toISOString() : null
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <DialogHeader>
                    <DialogTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">Edit Run</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Run Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setData({...data, run_type: 'delivery'})}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                    data.run_type === 'delivery' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}>
                                <TruckIcon className="h-4 w-4" /> Delivery
                            </button>
                            <button type="button" onClick={() => setData({...data, run_type: 'pickup'})}
                                className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                    data.run_type === 'pickup' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-slate-200 bg-black text-white/70'
                                }`}>
                                <PackageCheck className="h-4 w-4" /> Pickup
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5" /> Customer Name
                            </Label>
                            <Input
                                placeholder="Enter customer"
                                value={data.customer_name}
                                onChange={(e) => setData({ ...data, customer_name: e.target.value })}
                                className="h-11 border-slate-200 rounded-xl bg-white text-slate-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> City
                            </Label>
                            <Input
                                placeholder="Enter city"
                                value={data.city}
                                onChange={(e) => setData({ ...data, city: e.target.value })}
                                className="h-11 border-slate-200 rounded-xl bg-white text-slate-900"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Dropped</Label>
                            <Input placeholder="Trailer # dropped" value={data.trailer_dropped} onChange={(e) => setData({ ...data, trailer_dropped: e.target.value })} className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Picked Up</Label>
                            <Input placeholder="Trailer # picked up" value={data.trailer_picked_up} onChange={(e) => setData({ ...data, trailer_picked_up: e.target.value })} className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Load Type</Label>
                        <Select value={data.load_type} onValueChange={(value) => setData({...data, load_type: value})}>
                            <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white text-slate-900"><SelectValue placeholder="Select load type" /></SelectTrigger>
                            <SelectContent>
                                {allLoadTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Arrival Time</Label>
                            <Input type="datetime-local" value={data.arrival_time} onChange={(e) => setData({...data, arrival_time: e.target.value})} className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                        </div>
                        <div className="space-y-2">
                            <Label>Departure Time</Label>
                            <Input type="datetime-local" value={data.departure_time} onChange={(e) => setData({...data, departure_time: e.target.value})} className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={data.notes} onChange={(e) => setData({...data, notes: e.target.value})} className="rounded-xl resize-none" rows={2} />
                    </div>
                </div>
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => onClose(false)} className="flex-1 h-11 rounded-xl border-slate-200">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

