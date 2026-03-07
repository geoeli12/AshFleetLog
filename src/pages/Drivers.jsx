import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Plus, User, Phone, Loader2, Pencil, Trash2, Users } from "lucide-react";

export default function Drivers() {
    const [isOpen, setIsOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', state: 'IL' });
    const [saveError, setSaveError] = useState('');
    const queryClient = useQueryClient();

    const { data: drivers = [], isLoading } = useQuery({
        queryKey: ['allDrivers'],
        queryFn: () => api.entities.Driver.list('name')
    });

    const createMutation = useMutation({
        // IMPORTANT: use active boolean (not status string)
        mutationFn: (data) => api.entities.Driver.create({ ...data, active: true }),
        onError: (err) => {
            setSaveError(getErrorMessage(err));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            setSaveError('');
            setIsOpen(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.entities.Driver.update(id, data),
        onError: (err) => {
            setSaveError(getErrorMessage(err));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            setSaveError('');
            setIsOpen(false);
            setEditingDriver(null);
            resetForm();
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, active }) => api.entities.Driver.update(id, { active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.entities.Driver.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }
    });

    const resetForm = () => {
        setFormData({ name: '', phone: '', state: 'IL' });
    };

    const getDriverId = (d) => d?.id ?? d?._id ?? d?.objectId ?? d?.uuid;

    const normalizeState = (v) => (v ?? "").toString().trim().toUpperCase();

    const normalizeFormData = (d) => ({
        ...d,
        name: (d?.name ?? "").toString().trim(),
        phone: (d?.phone ?? "").toString().trim(),
        state: normalizeState(d?.state) || "IL",
    });


    const getErrorMessage = (err) => {
        if (!err) return 'Save failed.';
        return (
            err?.response?.data?.message ||
            err?.data?.message ||
            err?.message ||
            'Save failed.'
        );
    };

    const handleEdit = (driver) => {
        const id = getDriverId(driver);
        setSaveError('');
        setEditingDriver({ ...driver, __id: id });
        setFormData({
            name: driver.name,
            phone: driver.phone || '',
            state: String(driver.state || 'IL').trim().toUpperCase()
        });
        setIsOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaveError('');
        if (editingDriver) {
            const driverId = getDriverId(editingDriver);
            if (!driverId) {
                setSaveError('Missing driver id for update.');
                return;
            }
            updateMutation.mutate({ id: driverId, data: normalizeFormData(formData) });
        } else {
            createMutation.mutate(normalizeFormData(formData));
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setSaveError('');
            setEditingDriver(null);
            resetForm();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-black/5 via-background to-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-background to-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-light tracking-tight text-zinc-900">
                            Manage <span className="font-semibold">Drivers</span>
                        </h1>
                        <p className="text-zinc-600 mt-1">{drivers.length} drivers registered</p>
                    </div>

                    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-amber-500/100 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-zinc-900 rounded-xl shadow-lg shadow-amber-500/20">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Driver
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-amber-700" />
                                    {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Driver Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="rounded-xl"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        placeholder="e.g. (555) 123-4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, state: 'IL' })}
                                            className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all font-medium ${
                                                formData.state === 'IL'
                                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-black text-white hover:border-slate-300'
                                            }`}
                                        >
                                            IL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, state: 'PA' })}
                                            className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all font-medium ${
                                                formData.state === 'PA'
                                                    ? 'border-amber-400 bg-amber-500/10 text-amber-200'
                                                    : 'border-slate-200 bg-black text-white hover:border-slate-300'
                                            }`}
                                        >
                                            PA
                                        </button>
                                    </div>
                                </div>

                                {saveError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {saveError}
                                    </div>
                                )}

                                <DialogFooter className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="bg-amber-600 hover:bg-amber-700 rounded-xl"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending)
                                            ? 'Saving...'
                                            : editingDriver
                                                ? 'Update Driver'
                                                : 'Add Driver'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {drivers.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-zinc-600 font-medium text-lg">No drivers yet</p>
                        <p className="text-slate-400 mt-1">Add your first driver to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drivers.map((driver) => (
                            <Card key={getDriverId(driver) ?? driver.name} className="border-0 shadow-md bg-white ring-1 ring-black/5 backdrop-blur-sm hover:shadow-lg transition-all">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/15 to-amber-600/15 flex items-center justify-center">
                                                <User className="h-5 w-5 text-amber-700" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-zinc-900">{driver.name}</div>
                                                {driver.state && (
                                                    <div className="text-xs text-zinc-600 font-medium">
                                                        {driver.state}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* TOP-RIGHT ACTIVE TOGGLE (replaces the old gray badge spot) */}
                                        <button
                                            type="button"
                                            onClick={() => toggleActiveMutation.mutate({ id: getDriverId(driver), active: !Boolean(driver.active) })}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 transition ${
                                                driver.active ? 'bg-amber-200 text-amber-900 ring-1 ring-amber-300' : 'bg-zinc-200 text-zinc-800 ring-1 ring-zinc-300'
                                            }`}
                                            title="Toggle Active"
                                        >
                                            {driver.active ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>

                                    {driver.phone && (
                                        <div className="flex items-center gap-2 mt-3 text-sm text-zinc-600">
                                            <Phone className="h-4 w-4" />
                                            {driver.phone}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(driver)}
                                            className="flex-1 rounded-lg"
                                        >
                                            <Pencil className="h-3.5 w-3.5 mr-1" />
                                            Edit
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>

                                            <AlertDialogContent className="rounded-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete {driver.name}? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteMutation.mutate(getDriverId(driver))}
                                                        className="bg-red-600 hover:bg-red-700 rounded-xl"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
