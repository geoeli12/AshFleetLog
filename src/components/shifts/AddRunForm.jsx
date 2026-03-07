
import React, { useMemo, useRef, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Building2, Package, Clock, Plus, ArrowRightLeft, TruckIcon, PackageCheck, FileText } from "lucide-react";

import customersIL from "@/data/customers_il.json";
import customersPA from "@/data/customers_pa.json";

const DEFAULT_LOAD_TYPES = ['scrap', 'occ', 'mix', 'empty'];

export default function AddRunForm({ shiftId, driverName, onSubmit, isLoading, onCancel }) {
    const [formData, setFormData] = useState({
        run_type: 'delivery',
        city: '',
        customer_name: '',
        trailer_dropped: '',
        trailer_picked_up: '',
        load_type: '',
        arrival_time: '',
        departure_time: '',
        notes: ''
    });
    const [isCustomerFocused, setIsCustomerFocused] = useState(false);
    const ignoreCustomerBlurRef = useRef(false);
    const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const queryClient = useQueryClient();

    const customerDirectory = useMemo(() => {
        const normalize = (v) => (v ?? '').toString().trim();

        const safeParse = (raw) => {
            try { return JSON.parse(raw); } catch { return null; }
        };

        const getRows = (key, fallback) => {
            if (typeof window === 'undefined') return fallback || [];
            const raw = window.localStorage.getItem(key);
            const parsed = raw ? safeParse(raw) : null;
            return Array.isArray(parsed) ? parsed : (fallback || []);
        };

        const ilRows = getRows('customers_il', customersIL);
        const paRows = getRows('customers_pa', customersPA);

        const withMeta = (rows, region) =>
            (rows || []).map((r, idx) => ({
                _key: `${region}-${r.id ?? idx}`,
                region,
                customer: normalize(r.customer),
                address: normalize(r.address),
                contact: normalize(r.contact),
                receivingHours: normalize(r.receivingHours),
                receivingNotes: normalize(r.receivingNotes),
                notes: normalize(r.notes),
                dropTrailers: normalize(r.dropTrailers),
            }));

        return [...withMeta(ilRows, 'IL'), ...withMeta(paRows, 'PA')].filter(r => r.customer);
    }, []);

    // Address formats in your Excel are typically like:
    // "13305 104th street Pleasant Prairie, WI 53158" (no comma between street and city)
    // We extract the city by:
    // 1) taking the portion before the last comma ("... Pleasant Prairie")
    // 2) removing the street portion up to the last known street suffix ("street", "rd", "ave", etc.)
    // 3) returning the remaining trailing text as the city (supports multi-word cities)
    const parseCityFromAddress = (address) => {
        if (!address) return '';

        const raw = String(address).trim();
        if (!raw) return '';

        const parts = raw.split(',').map(s => s.trim()).filter(Boolean);

        // If address already contains comma-separated parts like:
        // "12657 Uline Wy, Kenosha, WI 53144"
        // then city is typically the second-to-last part.
        if (parts.length >= 3) {
            const cityPart = (parts[parts.length - 2] || '').trim();
            if (cityPart) return cityPart;
        }
        const left = (parts.length >= 2 ? parts.slice(0, -1).join(', ') : raw).trim();
        if (!left) return '';

        const suffixes = [
            'street', 'st',
            'road', 'rd',
            'avenue', 'ave',
            'boulevard', 'blvd',
            'drive', 'dr',
            'lane', 'ln',
            'court', 'ct',
            'way',
            'parkway', 'pkwy',
            'highway', 'hwy',
            'circle', 'cir',
            'place', 'pl',
            'terrace', 'ter',
            'trail', 'trl',
            'suite', 'ste',
            'unit', 'apt'
        ];

        const lower = left.toLowerCase();
        let bestIdx = -1;
        let bestSuffixLen = 0;

        // Find the *last* street suffix occurrence to split city from street.
        for (const suf of suffixes) {
            const re = new RegExp(`\\b${suf}\\b`, 'g');
            let m;
            while ((m = re.exec(lower)) !== null) {
                const idx = m.index;
                if (idx >= bestIdx) {
                    bestIdx = idx;
                    bestSuffixLen = suf.length;
                }
            }
        }

        if (bestIdx >= 0) {
            const after = left.slice(bestIdx + bestSuffixLen).trim();
            const cleaned = after.replace(/^[-–—,\s]+/, '').trim();
            if (cleaned) return cleaned;
        }

        // Fallback: take the last 2-3 tokens (helps if suffix not found)
        const tokens = left.split(/\s+/).filter(Boolean);
        if (tokens.length <= 2) return left;
        return tokens.slice(Math.max(0, tokens.length - 3)).join(' ');
    };

    const customerMatches = useMemo(() => {
        const q = (formData.customer_name || '').trim().toLowerCase();
        if (!q) return [];
        return customerDirectory
            .filter(r => r.customer.toLowerCase().includes(q))
            .slice(0, 10);
    }, [formData.customer_name, customerDirectory]);

    const applyCustomerPick = (row) => {
        const city = parseCityFromAddress(row.address);
        setFormData(prev => ({
            ...prev,
            customer_name: row.customer,
            city: city || prev.city,
        }));
    };

    const tryAutoFillCityFromCustomer = () => {
        const q = (formData.customer_name || '').trim().toLowerCase();
        if (!q) return;
        const exact =
            customerDirectory.find(r => r.customer.toLowerCase() === q) ||
            customerDirectory.find(r => r.customer.toLowerCase().startsWith(q));
        if (!exact) return;
        const city = parseCityFromAddress(exact.address);
        if (!city) return;
        setFormData(prev => ({ ...prev, city }));
    };

    const { data: customLoadTypes = [] } = useQuery({
        queryKey: ['customLoadTypes'],
        queryFn: () => api.entities.CustomLoadType.list('name')
    });

    const createCustomTypeMutation = useMutation({
        mutationFn: (data) => api.entities.CustomLoadType.create(data),
        onSuccess: (newType) => {
            queryClient.invalidateQueries({ queryKey: ['customLoadTypes'] });
            setFormData({...formData, load_type: newTypeName.toLowerCase()});
            setNewTypeName('');
            setShowNewTypeDialog(false);
        }
    });

    const allLoadTypes = [
        ...DEFAULT_LOAD_TYPES,
        ...customLoadTypes.map(t => t.name.toLowerCase()).filter(n => !DEFAULT_LOAD_TYPES.includes(n))
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const now = new Date();
        onSubmit({
            ...formData,
            shift_id: shiftId,
            driver_name: driverName,
            arrival_time: formData.arrival_time ? new Date(formData.arrival_time).toISOString() : null,
            departure_time: formData.departure_time ? new Date(formData.departure_time).toISOString() : null,
            date: now.toISOString().split('T')[0]
        });
        setFormData({
            run_type: 'delivery',
            city: '',
            customer_name: '',
            trailer_dropped: '',
            trailer_picked_up: '',
            load_type: '',
            arrival_time: '',
            departure_time: '',
            notes: ''
        });
    };

    const handleLoadTypeChange = (value) => {
        if (value === '__add_new__') {
            setShowNewTypeDialog(true);
        } else {
            setFormData({...formData, load_type: value});
        }
    };

    return (
        <>
            <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-white" />
                        </div>
                        Add New Run
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Run Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, run_type: 'delivery'})}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                        formData.run_type === 'delivery' 
                                            ? 'border-blue-400 bg-blue-50 text-blue-700' 
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <TruckIcon className="h-4 w-4" />
                                    Delivery
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, run_type: 'pickup'})}
                                    className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all ${
                                        formData.run_type === 'pickup' 
                                            ? 'border-amber-400 bg-amber-50 text-amber-700' 
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <PackageCheck className="h-4 w-4" />
                                    Pickup
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Customer Name
                                </Label>
                                <div className="relative">
                                    <Input
                                        placeholder="Enter customer"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        onFocus={() => setIsCustomerFocused(true)}
                                        onBlur={() => {
                                            if (ignoreCustomerBlurRef.current) return;
                                            setIsCustomerFocused(false);
                                            tryAutoFillCityFromCustomer();
                                        }}
                                        className="h-11 border-slate-200 rounded-xl bg-white text-slate-900"
                                        required
                                        autoComplete="off"
                                    />

                                    {isCustomerFocused && customerMatches.length > 0 ? (
                                        <div
                                            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                                            role="listbox"
                                        >
                                            <div className="max-h-64 overflow-auto p-1">
                                                {customerMatches.map((row) => {
                                                    const city = parseCityFromAddress(row.address);
                                                    return (
                                                        <button
                                                            key={row._key}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                ignoreCustomerBlurRef.current = true;
                                                            }}
                                                            onMouseUp={() => {
                                                                ignoreCustomerBlurRef.current = false;
                                                            }}
                                                            onClick={() => {
                                                                applyCustomerPick(row);
                                                                setIsCustomerFocused(false);
                                                            }}
                                                            className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-medium text-slate-900">{row.customer}</div>
                                                                    <div className="truncate text-xs text-slate-600">{city ? `${city} · ` : ''}{row.address}</div>
                                                                </div>
                                                                <span
                                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                        row.region === 'PA'
                                                                            ? 'bg-emerald-100 text-emerald-700'
                                                                            : 'bg-amber-100 text-amber-700'
                                                                    }`}
                                                                >
                                                                    {row.region}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" /> City
                                </Label>
                                <Input
                                    placeholder="Enter city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="h-11 border-slate-200 rounded-xl bg-white text-slate-900"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Dropped
                                </Label>
                                <Input placeholder="Trailer # dropped" value={formData.trailer_dropped}
                                    onChange={(e) => setFormData({...formData, trailer_dropped: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5" /> Trailer Picked Up
                                </Label>
                                <Input placeholder="Trailer # picked up" value={formData.trailer_picked_up}
                                    onChange={(e) => setFormData({...formData, trailer_picked_up: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Package className="h-3.5 w-3.5" /> Load Type
                            </Label>
                            <Select value={formData.load_type} onValueChange={handleLoadTypeChange}>
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-white text-slate-900">
                                    <SelectValue placeholder="Select load type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allLoadTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                                    ))}
                                    <SelectItem value="__add_new__">
                                        <span className="flex items-center gap-2 text-blue-600">
                                            <Plus className="h-3.5 w-3.5" /> Add new type...
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" /> Arrival Time
                                </Label>
                                <Input type="datetime-local" value={formData.arrival_time}
                                    onChange={(e) => setFormData({...formData, arrival_time: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" /> Departure Time
                                </Label>
                                <Input type="datetime-local" value={formData.departure_time}
                                    onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                                    className="h-11 border-slate-200 rounded-xl bg-white text-slate-900" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Notes
                            </Label>
                            <Textarea placeholder="Add any additional notes..." value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                className="border-slate-200 rounded-xl resize-none bg-white text-slate-900" rows={2} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onCancel}
                                className="flex-1 h-11 rounded-xl border-slate-200">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}
                                className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                                {isLoading ? 'Adding...' : 'Add Run'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Load Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Enter load type name"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewTypeDialog(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createCustomTypeMutation.mutate({ name: newTypeName })}
                            disabled={!newTypeName.trim() || createCustomTypeMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            {createCustomTypeMutation.isPending ? 'Adding...' : 'Add Type'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

