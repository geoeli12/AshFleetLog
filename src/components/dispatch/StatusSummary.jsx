import React from 'react';
import { Truck, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function StatusSummary({ logs }) {
  const stats = logs.reduce((acc, log) => {
    const deliveredVal = String(log.delivered_by ?? "").trim().toLowerCase();

    if (deliveredVal === "no") {
      acc.notDelivered++;
    } else if (deliveredVal) {
      acc.dispatched++;
    } else if (log.trailer_number && String(log.trailer_number).trim()) {
      acc.loaded++;
    } else {
      acc.pending++;
    }

    return acc;
  }, { dispatched: 0, loaded: 0, pending: 0, notDelivered: 0 });

  const cards = [
    { label: 'Total Entries', value: logs.length, icon: Package, color: 'bg-slate-100 text-slate-600' },
    { label: 'Loaded & Ready', value: stats.loaded, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'bg-red-100 text-red-600' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Not Delivered', value: stats.notDelivered, icon: XCircle, color: 'bg-sky-100 text-sky-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{card.value}</div>
          <div className="text-sm text-slate-500 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}