import React, { useMemo, useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, DollarSign, Save } from 'lucide-react';

const priceFields = [
  { key: 'price_48x40_1', label: '48x40 #1' },
  { key: 'price_48x40_2', label: '48x40 #2' },
  { key: 'price_large_odd', label: 'Large Odd' },
  { key: 'price_small_odd', label: 'Small Odd' },
  { key: 'price_trash', label: 'Trash' },
  { key: 'price_chep_peco', label: 'CHEP/PECO' },
  { key: 'price_expendable', label: 'Expendable' },
  { key: 'price_scrap_full_truck', label: 'Scrap - full truck' },
  { key: 'price_bailed_cardboard', label: 'Bailed Cardboard' },
];

const defaultCustomer = {
  customer_name: '',
  pay_mixed: false,
  flat_rate_per_load: 0,
  price_48x40_1: 0,
  price_48x40_2: 0,
  price_large_odd: 0,
  price_small_odd: 0,
  price_trash: 0,
  price_chep_peco: 0,
  price_expendable: 0,
  price_scrap_full_truck: 0,
  price_bailed_cardboard: 0,
  misc: '',
  freight: '',
  notes: '',
};

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

export default function CustomerPricesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState(defaultCustomer);
  const queryClient = useQueryClient();

  const { data: rawCustomers, isLoading } = useQuery({
    queryKey: ['customerPrices'],
    queryFn: async () => {
      try {
        const res = await api.entities.CustomerPrice.list('customer_name');
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const customersArr = useMemo(() => unwrapListResult(rawCustomers), [rawCustomers]);
const createMutation = useMutation({
    mutationFn: (data) => api.entities.CustomerPrice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerPrices'] });
      setIsDialogOpen(false);
      setFormData(defaultCustomer);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.CustomerPrice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerPrices'] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      setFormData(defaultCustomer);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.CustomerPrice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customerPrices'] }),
  });

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.customer_name) return;
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: priceFields.some(f => f.key === field) || field === 'flat_rate_per_load' 
        ? (parseFloat(value) || 0) 
        : value
    }));
  };

  const formatPrice = (value) => {
    if (!value || value === 0) return '$0.00';
    return `$${parseFloat(value).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Customer Prices</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCustomer(null);
              setFormData(defaultCustomer);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name*</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => handleInputChange('customer_name', e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.pay_mixed}
                        onCheckedChange={(checked) => handleInputChange('pay_mixed', checked)}
                      />
                      <Label>Pay Mixed?</Label>
                    </div>
                    <div className="flex-1">
                      <Label>Flat Rate/Load</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.flat_rate_per_load || ''}
                        onChange={(e) => handleInputChange('flat_rate_per_load', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {priceFields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-sm">{field.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Misc.</Label>
                    <Input
                      value={formData.misc}
                      onChange={(e) => handleInputChange('misc', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Freight</Label>
                    <Input
                      value={formData.freight}
                      onChange={(e) => handleInputChange('freight', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.customer_name}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingCustomer ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prices Table */}
        <Card className="shadow-sm border-slate-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-50">
                  <TableHead className="text-xs font-semibold sticky left-0 bg-yellow-50 z-10">#</TableHead>
                  <TableHead className="text-xs font-semibold sticky left-8 bg-yellow-50 z-10 min-w-[150px]">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Pay Mixed?</TableHead>
                  <TableHead className="text-xs font-semibold">Flat Rate</TableHead>
                  <TableHead className="text-xs font-semibold bg-yellow-100">48x40 #1</TableHead>
                  <TableHead className="text-xs font-semibold bg-yellow-100">48x40 #2</TableHead>
                  <TableHead className="text-xs font-semibold">Large Odd</TableHead>
                  <TableHead className="text-xs font-semibold">Small Odd</TableHead>
                  <TableHead className="text-xs font-semibold">Trash</TableHead>
                  <TableHead className="text-xs font-semibold">CHEP/PECO</TableHead>
                  <TableHead className="text-xs font-semibold">Expendable</TableHead>
                  <TableHead className="text-xs font-semibold">Scrap - full truck</TableHead>
                  <TableHead className="text-xs font-semibold">Bailed Cardboard</TableHead>
                  <TableHead className="text-xs font-semibold">Misc.</TableHead>
                  <TableHead className="text-xs font-semibold">Freight</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[200px]">Notes</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-slate-500">Loading...</TableCell>
                  </TableRow>
                ) : customersArr.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-slate-500">No customers yet. Add your first customer above.</TableCell>
                  </TableRow>
                ) : (
                  customersArr.map((customer, index) => (
                    <TableRow key={customer.id} className="hover:bg-slate-50">
                      <TableCell className="text-sm font-medium sticky left-0 bg-white">{index + 1}</TableCell>
                      <TableCell className="text-sm font-medium sticky left-8 bg-white">{customer.customer_name}</TableCell>
                      <TableCell className="text-center">
                        {customer.pay_mixed && <span className="text-green-600 font-semibold">Y</span>}
                      </TableCell>
                      <TableCell className="text-sm">{customer.flat_rate_per_load ? formatPrice(customer.flat_rate_per_load) : ''}</TableCell>
                      <TableCell className="text-sm bg-yellow-50">{formatPrice(customer.price_48x40_1)}</TableCell>
                      <TableCell className="text-sm bg-yellow-50">{formatPrice(customer.price_48x40_2)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_large_odd)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_small_odd)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_trash)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_chep_peco)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_expendable)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_scrap_full_truck)}</TableCell>
                      <TableCell className="text-sm">{formatPrice(customer.price_bailed_cardboard)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{customer.misc}</TableCell>
                      <TableCell className="text-sm text-slate-600">{customer.freight}</TableCell>
                      <TableCell className="text-sm text-slate-500">{customer.notes}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500 hover:text-blue-700"
                            onClick={() => handleEdit(customer)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => deleteMutation.mutate(customer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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