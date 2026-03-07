import React, { useEffect, useMemo, useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Search, Package, Trash2 } from 'lucide-react';

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

function safeYmd(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export default function InventoryLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({});

  const { data: rawEntries, isLoading } = useQuery({
    queryKey: ['inventoryEntries'],
    queryFn: async () => {
      try {
        const res = await api.entities.InventoryEntry.list('-date');
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const entriesArr = useMemo(() => unwrapListResult(rawEntries), [rawEntries]);

  const numericFields = useMemo(() => ([
    'pallet_48x40_1',
    'pallet_48x40_2',
    'large_odd',
    'small_odd',
    'chep_peco',
    'scrap_pull',
    'trash_pallets',
    'euro_pallets',
    'block_pallets',
    'stringer_pallets',
    'plastic_pallets',
    'bailed_cardboard',
    'occ',
    'boxes_of_plastic',
    'bailed_plastic',
    'gaylords',
    'boxes',
    'tops',
    'ibc_crates',
    'totes',
  ]), []);

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen || !editEntry) return;

    const next = {
      customer_name: editEntry.customer_name ?? '',
      trailer_number: editEntry.trailer_number ?? '',
      counted_by: editEntry.counted_by ?? '',
      date: safeYmd(editEntry.date) ?? '',
      date_count_received: safeYmd(editEntry.date_count_received) ?? '',
      ash_pallet_ref: editEntry.ash_pallet_ref ?? '',
      customer_ref: editEntry.customer_ref ?? '',
      notes: editEntry.notes ?? '',
    };

    numericFields.forEach((k) => {
      const v = editEntry?.[k];
      next[k] = (v === null || v === undefined) ? '' : String(v);
    });

    setForm(next);
  }, [editOpen, editEntry, numericFields]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toNullableInt = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isNaN(n)) return null;
    return Math.trunc(n);
  };

  const saveEdit = async () => {
    if (!editEntry?.id) return;

    const payload = {
      customer_name: String(form.customer_name ?? '').trim() || null,
      trailer_number: String(form.trailer_number ?? '').trim() || null,
      counted_by: String(form.counted_by ?? '').trim() || null,
      date: safeYmd(form.date) || null,
      date_count_received: safeYmd(form.date_count_received) || null,
      ash_pallet_ref: String(form.ash_pallet_ref ?? '').trim() || null,
      customer_ref: String(form.customer_ref ?? '').trim() || null,
      notes: String(form.notes ?? '').trim() || null,
    };

    numericFields.forEach((k) => {
      payload[k] = toNullableInt(form[k]);
    });

    try {
      if (api?.entities?.InventoryEntry?.update) {
        await api.entities.InventoryEntry.update(editEntry.id, payload);
      } else if (api?.entities?.InventoryEntry?.patch) {
        await api.entities.InventoryEntry.patch(editEntry.id, payload);
      } else {
        throw new Error('Update method not found on api.entities.InventoryEntry');
      }

      await qc.invalidateQueries({ queryKey: ['inventoryEntries'] });
      setEditOpen(false);
      setEditEntry(null);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not save changes. ${e?.message ? String(e.message) : ''}`);
    }
  };

  const deleteEntry = async (entry) => {
    if (!entry?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete this entry for "${entry.customer_name || 'Unknown'}"?`);
    if (!ok) return;

    try {
      if (api?.entities?.InventoryEntry?.delete) {
        await api.entities.InventoryEntry.delete(entry.id);
      } else if (api?.entities?.InventoryEntry?.remove) {
        await api.entities.InventoryEntry.remove(entry.id);
      } else if (api?.entities?.InventoryEntry?.destroy) {
        await api.entities.InventoryEntry.destroy(entry.id);
      } else {
        throw new Error('Delete method not found on api.entities.InventoryEntry');
      }

      await qc.invalidateQueries({ queryKey: ['inventoryEntries'] });
      if (editEntry?.id === entry.id) {
        setEditOpen(false);
        setEditEntry(null);
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not delete entry. ${e?.message ? String(e.message) : ''}`);
    }
  };

  const calculate48x40Total = (entry) => {
    return (entry.pallet_48x40_1 || 0) + (entry.pallet_48x40_2 || 0);
  };

  const calculateGrandTotal = (entry) => {
    const total48x40 = calculate48x40Total(entry);
    return total48x40 + 
      (entry.large_odd || 0) +
      (entry.chep_peco || 0) +
      (entry.scrap_pull || 0) +
      (entry.small_odd || 0) +
      (entry.trash_pallets || 0) +
      (entry.euro_pallets || 0) +
      (entry.block_pallets || 0) +
      (entry.stringer_pallets || 0) +
      (entry.plastic_pallets || 0);
  };


  const displayDashIfZero = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string') {
      const s = val.trim();
      if (s === '' || s === '0' || s === '0.0') return '-';
      const n = Number(s);
      if (!Number.isNaN(n)) return n === 0 ? '-' : n;
      return s;
    }
    if (typeof val === 'number') return val === 0 ? '-' : val;
    return val;
  };

  // Group entries by date
  const groupedByDate = entriesArr.reduce((acc, entry) => {
    const date = safeYmd(entry?.date) || 'No Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return new Date(b) - new Date(a);
  });

  // Filter entries
  const filteredDates = sortedDates.filter(date => {
    if (dateFilter && date !== dateFilter) return false;
    if (searchTerm) {
      return groupedByDate[date].some(entry => 
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.trailer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ash_pallet_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.customer_ref?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const filteredGroupedByDate = filteredDates.reduce((acc, date) => {
    if (searchTerm) {
      acc[date] = groupedByDate[date].filter(entry =>
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.trailer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ash_pallet_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.customer_ref?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      acc[date] = groupedByDate[date];
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Inventory Log</h1>
              <p className="text-sm text-slate-500">View entries organized by date</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search customer, notes, refs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            {(searchTerm || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Entries by Date */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Loading entries...
            </CardContent>
          </Card>
        ) : filteredDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              {entriesArr.length === 0 ? 'No entries yet' : 'No entries match your filters'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredDates.map((date) => {
              const dateEntries = filteredGroupedByDate[date];
              const totalForDate = dateEntries.reduce((sum, entry) => sum + calculateGrandTotal(entry), 0);
              
              return (
                <Card key={date} className="shadow-sm border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span>
                          {date === 'No Date'
                            ? 'No Date'
                            : (() => {
                                const d = new Date(date + 'T00:00:00');
                                return Number.isNaN(d.getTime())
                                  ? date
                                  : d.toLocaleDateString(undefined, {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    });
                              })()}
                        </span>
                        <span className="text-sm font-normal text-slate-500">
                          ({dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">Total: {displayDashIfZero(totalForDate)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto pb-2">
                    <Table className="w-full whitespace-nowrap table-auto">
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-[11px] font-semibold py-1 px-2 max-w-[240px]">Customer</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Trailer #</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Counted By</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Received Date</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Ash Pallet Ref</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Customer Ref</TableHead>
                          

                          <TableHead className="text-[11px] font-semibold py-1 px-2 bg-yellow-50 text-center">48x40 #1</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 bg-yellow-50 text-center">48x40 #2</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 bg-yellow-100 text-center">48x40 Total</TableHead>

                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Large Odd</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Small Odd</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">CHEP/PECO</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Scrap Pull</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Trash</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Euro</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Block</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Stringer</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 bg-green-50 text-center">Plastic</TableHead>

                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Bailed Cardboard</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">OCC</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Boxes of Plastic</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Bailed Plastic</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Gaylords</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Boxes</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Tops</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">IBC Crates</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center">Totes</TableHead>

                          <TableHead className="text-[11px] font-semibold py-1 px-2 bg-green-100 text-center">Grand Total</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2">Notes</TableHead>
                          <TableHead className="text-[11px] font-semibold py-1 px-2 text-center"> </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateEntries.map((entry) => (
                          <TableRow
                            key={entry.id}
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => openEdit(entry)}
                          >
                            <TableCell className="font-medium text-xs py-1 px-2 truncate">{entry.customer_name}</TableCell>
                            <TableCell className="text-xs py-1 px-2 truncate">{entry.trailer_number || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2 truncate">{entry.counted_by || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2 truncate">{entry.date_count_received || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2 truncate">{entry.ash_pallet_ref || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2 truncate">{entry.customer_ref || '-'}</TableCell>

                            

                            <TableCell className="text-xs py-1 px-2 bg-yellow-50 text-center">{displayDashIfZero(entry.pallet_48x40_1)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 bg-yellow-50 text-center">{displayDashIfZero(entry.pallet_48x40_2)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 font-semibold bg-yellow-100 text-center">{displayDashIfZero(calculate48x40Total(entry))}</TableCell>

                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.large_odd)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.small_odd)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.chep_peco)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.scrap_pull)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.trash_pallets)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.euro_pallets)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.block_pallets)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.stringer_pallets)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 bg-green-50 text-center">{displayDashIfZero(entry.plastic_pallets)}</TableCell>

                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.bailed_cardboard)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.occ)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.boxes_of_plastic)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.bailed_plastic)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.gaylords)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.boxes)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.tops)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.ibc_crates)}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-center">{displayDashIfZero(entry.totes)}</TableCell>

                            <TableCell className="text-xs py-1 px-2 font-semibold bg-green-100 text-center">{displayDashIfZero(calculateGrandTotal(entry))}</TableCell>
                            <TableCell className="text-xs py-1 px-2 text-slate-500 truncate">{entry.notes || '-'}</TableCell>
                            <TableCell className="py-1 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-red-600"
                                onClick={() => deleteEntry(entry)}
                                aria-label="Delete entry"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
</TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Delete */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditEntry(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Entry</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input value={form.customer_name ?? ''} onChange={(e) => setField('customer_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trailer #</Label>
                <Input value={form.trailer_number ?? ''} onChange={(e) => setField('trailer_number', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Counted By</Label>
                <Input value={form.counted_by ?? ''} onChange={(e) => setField('counted_by', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Received Date</Label>
                <Input type="date" value={safeYmd(form.date_count_received)} onChange={(e) => setField('date_count_received', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Input type="date" value={safeYmd(form.date)} onChange={(e) => setField('date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ash Pallet Ref</Label>
                <Input value={form.ash_pallet_ref ?? ''} onChange={(e) => setField('ash_pallet_ref', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Customer Ref</Label>
                <Input value={form.customer_ref ?? ''} onChange={(e) => setField('customer_ref', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes ?? ''} onChange={(e) => setField('notes', e.target.value)} />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-700 mb-3">Counts</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {numericFields.map((k) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs text-slate-600">{k.replaceAll('_', ' ')}</Label>
                    <Input
                      inputMode="numeric"
                      value={form[k] ?? ''}
                      onChange={(e) => setField(k, e.target.value)}
                      className="h-9"
                      placeholder="-"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteEntry(editEntry)}
              className="sm:mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="button" onClick={saveEdit}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}