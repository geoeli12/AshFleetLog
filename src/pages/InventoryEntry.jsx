import React, { useMemo, useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash2, Calculator } from 'lucide-react';
// NOTE: Keep this page extremely defensive.
// The app has a global ErrorBoundary; any uncaught error will hard-crash the UI.

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

const palletFields = [
  { key: 'pallet_48x40_1', label: '48x40 #1', color: 'bg-yellow-100' },
  { key: 'pallet_48x40_2', label: '48x40 #2', color: 'bg-yellow-100' },
  { key: 'large_odd', label: 'Large Odd', color: 'bg-white' },
  { key: 'small_odd', label: 'Small Odd', color: 'bg-white' },
  { key: 'chep_peco', label: 'CHEP/PECO', color: 'bg-white' },
  { key: 'scrap_pull', label: 'Scrap Pull', color: 'bg-white' },
  { key: 'trash_pallets', label: 'Trash', color: 'bg-white' },
  { key: 'euro_pallets', label: 'Euro', color: 'bg-white' },
  { key: 'block_pallets', label: 'Block', color: 'bg-white' },
  { key: 'stringer_pallets', label: '4 Stringer', color: 'bg-white' },
  { key: 'plastic_pallets', label: 'Plastic', color: 'bg-green-100' },
  { key: 'bailed_cardboard', label: 'Bailed Cardboard', color: 'bg-white' },
  { key: 'occ', label: 'OCC', color: 'bg-white' },
  { key: 'boxes_of_plastic', label: 'Boxes of Plastic', color: 'bg-white' },
  { key: 'bailed_plastic', label: 'Bailed Plastic', color: 'bg-white' },
  { key: 'gaylords', label: 'Gaylords', color: 'bg-white' },
  { key: 'boxes', label: 'Boxes', color: 'bg-white' },
  { key: 'tops', label: 'Tops', color: 'bg-white' },
  { key: 'ibc_crates', label: 'IBC Crates', color: 'bg-white' },
  { key: 'totes', label: 'Totes', color: 'bg-white' },
];

function makeDefaultEntry() {
  return {
  customer_name: '',
  notes: '',
  counted_by: '',
  date: todayYmd(),
  date_count_received: '',
  ash_pallet_ref: '',
  trailer_number: '',
  customer_ref: '',
  pallet_48x40_1: 0,
  pallet_48x40_2: 0,
  large_odd: 0,
  chep_peco: 0,
  scrap_pull: 0,
  small_odd: 0,
  trash_pallets: 0,
  euro_pallets: 0,
  block_pallets: 0,
  stringer_pallets: 0,
  plastic_pallets: 0,
  bailed_cardboard: 0,
  occ: 0,
  boxes_of_plastic: 0,
  bailed_plastic: 0,
  gaylords: 0,
  boxes: 0,
  tops: 0,
  ibc_crates: 0,
  totes: 0,
  };
}

export default function InventoryEntryPage() {
  const [newEntry, setNewEntry] = useState(() => makeDefaultEntry());
  const queryClient = useQueryClient();

  const {
    data: rawEntries,
    isLoading,
  } = useQuery({
    queryKey: ['inventoryEntries'],
    queryFn: async () => {
      // If the server returns a non-JSON body (e.g., HTML), apiClient may throw.
      // React-Query will capture it, but we still return [] so the page renders.
      try {
        const res = await api.entities.InventoryEntry.list('-created_date');
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const entriesArr = useMemo(() => unwrapListResult(rawEntries), [rawEntries]);
const createMutation = useMutation({
    mutationFn: (data) => api.entities.InventoryEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryEntries'] });
      setNewEntry(makeDefaultEntry());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.InventoryEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventoryEntries'] }),
  });

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

  const evaluateExpression = (expr) => {
    if (!expr) return 0;
    try {
      // Remove spaces and check if it's a valid math expression
      const cleaned = String(expr).replace(/\s/g, '');
      // Only allow numbers, +, -, *, /, (, )
      if (!/^[\d+\-*/().]+$/.test(cleaned)) {
        return parseFloat(expr) || 0;
      }
      // Safely evaluate the expression
      const result = Function('"use strict"; return (' + cleaned + ')')();
      return isNaN(result) ? 0 : result;
    } catch {
      return parseFloat(expr) || 0;
    }
  };

  const handleInputChange = (field, value) => {
    setNewEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberBlur = (field, value) => {
    const evaluated = evaluateExpression(value);
    setNewEntry(prev => ({
      ...prev,
      [field]: evaluated
    }));
  };

  const handleSubmit = () => {
    if (!newEntry.customer_name || !newEntry.date) return;
    createMutation.mutate(newEntry);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Pallet Inventory Entry</h1>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calculator className="w-4 h-4" />
            <span>Totals auto-calculated</span>
          </div>
        </div>

        {/* New Entry Form */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
              <div>
                <Label className="text-xs text-slate-600">Customer Name*</Label>
                <Input
                  value={newEntry.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Customer"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Counted By</Label>
                <Select
                  value={newEntry.counted_by}
                  onValueChange={(value) => handleInputChange('counted_by', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st</SelectItem>
                    <SelectItem value="2nd">2nd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Date*</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Date Received</Label>
                <Input
                  type="date"
                  value={newEntry.date_count_received}
                  onChange={(e) => handleInputChange('date_count_received', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Ash Pallet Ref</Label>
                <Input
                  value={newEntry.ash_pallet_ref}
                  onChange={(e) => handleInputChange('ash_pallet_ref', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Trailer #</Label>
                <Input
                  value={newEntry.trailer_number}
                  onChange={(e) => handleInputChange('trailer_number', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Customer Ref</Label>
                <Input
                  value={newEntry.customer_ref}
                  onChange={(e) => handleInputChange('customer_ref', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Notes</Label>
                <Input
                  value={newEntry.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Pallet Counts Row */}
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 mb-4">
              {palletFields.map((field) => (
                <div key={field.key} className={`${field.color} p-2 rounded border`}>
                  <Label className="text-xs text-slate-600 block mb-1">{field.label}</Label>
                  <Input
                    type="text"
                    value={newEntry[field.key] === 0 ? '' : newEntry[field.key]}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    onBlur={(e) => handleNumberBlur(field.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNumberBlur(field.key, e.target.value);
                        e.target.blur();
                      }
                    }}
                    className="h-7 text-sm text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            {/* Totals Display */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg mb-4">
              <div className="flex gap-6">
                <div className="text-center">
                  <span className="text-xs text-slate-500 block">48x40 Total</span>
                  <span className="text-lg font-bold text-yellow-700">{calculate48x40Total(newEntry)}</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-500 block">Grand Total (to Plastic)</span>
                  <span className="text-lg font-bold text-green-700">{calculateGrandTotal(newEntry)}</span>
                </div>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={!newEntry.customer_name || !newEntry.date || createMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg">Recent Entries</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold bg-yellow-50">48x40 #1</TableHead>
                  <TableHead className="text-xs font-semibold bg-yellow-50">48x40 #2</TableHead>
                  <TableHead className="text-xs font-semibold bg-yellow-100">48x40 Total</TableHead>
                  <TableHead className="text-xs font-semibold">Large Odd</TableHead>
                  <TableHead className="text-xs font-semibold">CHEP/PECO</TableHead>
                  <TableHead className="text-xs font-semibold">Small Odd</TableHead>
                  <TableHead className="text-xs font-semibold">Trash</TableHead>
                  <TableHead className="text-xs font-semibold bg-green-50">Plastic</TableHead>
                  <TableHead className="text-xs font-semibold bg-green-100">Grand Total</TableHead>
                  <TableHead className="text-xs font-semibold">Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">Loading...</TableCell>
                  </TableRow>
                ) : entriesArr.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">No entries yet</TableCell>
                  </TableRow>
                ) : (
                  entriesArr.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-sm">{entry.customer_name}</TableCell>
                      <TableCell className="text-sm">{entry.date}</TableCell>
                      <TableCell className="text-sm bg-yellow-50">{entry.pallet_48x40_1 || 0}</TableCell>
                      <TableCell className="text-sm bg-yellow-50">{entry.pallet_48x40_2 || 0}</TableCell>
                      <TableCell className="text-sm font-semibold bg-yellow-100">{calculate48x40Total(entry)}</TableCell>
                      <TableCell className="text-sm">{entry.large_odd || 0}</TableCell>
                      <TableCell className="text-sm">{entry.chep_peco || 0}</TableCell>
                      <TableCell className="text-sm">{entry.small_odd || 0}</TableCell>
                      <TableCell className="text-sm">{entry.trash_pallets || 0}</TableCell>
                      <TableCell className="text-sm bg-green-50">{entry.plastic_pallets || 0}</TableCell>
                      <TableCell className="text-sm font-semibold bg-green-100">{calculateGrandTotal(entry)}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[150px] truncate">{entry.notes}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}