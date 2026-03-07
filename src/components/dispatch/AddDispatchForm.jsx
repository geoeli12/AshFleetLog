import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Table } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

import { api } from "@/api/apiClient";

const unwrapListResult = (list) => {
  if (Array.isArray(list)) return list;
  if (!list) return [];
  if (Array.isArray(list.data)) return list.data;
  if (Array.isArray(list.rows)) return list.rows;
  return [];
};

const getInitialForm = (dateValue, regionValue) => ({
  date: dateValue || format(new Date(), 'yyyy-MM-dd'),
  region: (regionValue || '').toString().trim().toUpperCase(),
  company: '',
  trailer_number: '',
  notes: '',
  dock_hours: '',
  eta: '',
  bol: '',
  item: '',
  delivered_by: ''
});

// One example row (shows in the grid until the user clicks into any column)
const exampleRow = {
  company: 'Uline - U6',
  trailer_number: '1256',
  notes: 'Leave at dock 3',
  dock_hours: '660',
  eta: '28 min',
  bol: '6592',
  item: '96x48',
  delivered_by: 'Yes'
};

const normalizeLines = (text) => {
  const raw = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = raw.split('\n').map(l => (l ?? '').toString().trim());
  // Trim trailing empty lines (common when pasting)
  let end = parts.length;
  while (end > 0 && !parts[end - 1]) end--;
  return parts.slice(0, end);
};

export default function AddDispatchForm({ onAdd, defaultDate, region }) {
  const [form, setForm] = useState(() => getInitialForm(defaultDate, region));
  const [isExpanded, setIsExpanded] = useState(false);

  // Company suggestions (same behavior as AddRunForm customer picker)
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const ignoreCompanyBlurRef = useRef(false);

  // Customers from Supabase (via server entity routes)
  const [customersIL, setCustomersIL] = useState([]);
  const [customersPA, setCustomersPA] = useState([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [il, pa] = await Promise.all([
          api.entities.CustomerIL.list('customer').catch(() => []),
          api.entities.CustomerPA.list('customer').catch(() => [])
        ]);

        if (!alive) return;
        setCustomersIL(unwrapListResult(il));
        setCustomersPA(unwrapListResult(pa));
      } catch {
        // ignore
      }
    };

    load();
    return () => { alive = false; };
  }, []);

  const customerDirectory = useMemo(() => {
    const normalize = (v) => (v ?? '').toString().trim();

    const withMeta = (rows, region) =>
      (rows || []).map((r, idx) => ({
        _key: `${region}-${r?.id ?? idx}`,
        region,
        customer: normalize(r?.customer),
        address: normalize(r?.address),
        receivingHours: normalize(r?.receivingHours),
        receivingNotes: normalize(r?.receivingNotes),
        eta: normalize(r?.eta),
      }));

    return [...withMeta(customersIL, 'IL'), ...withMeta(customersPA, 'PA')].filter(r => r.customer);
  }, [customersIL, customersPA]);

  const normalizeCompanyKey = (v) =>
    (v ?? '')
      .toString()
      .trim()
      .toLowerCase()
      // Strip leading numeric IDs like "12 " from customer names
      .replace(/^\d+\s+/, '')
      .replace(/^[-–—\s]+/, '')
      .trim();

  const findCompanyMatch = (companyName) => {
    const q = normalizeCompanyKey(companyName);
    if (!q) return null;

    return (
      customerDirectory.find(r => normalizeCompanyKey(r.customer) === q) ||
      customerDirectory.find(r => normalizeCompanyKey(r.customer).startsWith(q)) ||
      customerDirectory.find(r => normalizeCompanyKey(r.customer).includes(q)) ||
      null
    );
  };

  const getDockHoursForCompany = (companyName) => {
    const match = findCompanyMatch(companyName);
    if (!match) return '';
    return (match.receivingHours || match.receivingNotes || '').trim();
  };

  const getEtaForCompany = (companyName) => {
    const match = findCompanyMatch(companyName);
    if (!match) return '';
    return (match.eta || '').trim();
  };

  const applyCompanyPick = (row) => {
    const dock = (row?.receivingHours || row?.receivingNotes || '').trim();
    setForm(prev => ({
      ...prev,
      company: row.customer,
      dock_hours: dock || prev.dock_hours,
      eta: (row?.eta || '').trim() || prev.eta,
    }));
  };

  const tryAutoFillDockHoursFromCompany = () => {
    const dock = getDockHoursForCompany(form.company);
    if (!dock) return;
    setForm(prev => ({ ...prev, dock_hours: prev.dock_hours || dock }));
  };

  const tryAutoFillEtaFromCompany = () => {
    const eta = getEtaForCompany(form.company);
    if (!eta) return;
    setForm(prev => ({ ...prev, eta: prev.eta || eta }));
  };

  const companyMatches = useMemo(() => {
    const q = (form.company || '').trim().toLowerCase();
    if (!q) return [];

    // If a region toggle is selected, prefer that region first, but still allow cross-region matches.
    const activeRegion = (region || form.region || '').toString().trim().toUpperCase();

    const matches = customerDirectory.filter(r => r.customer.toLowerCase().includes(q));
    matches.sort((a, b) => {
      const aPri = (a.region === activeRegion) ? 0 : 1;
      const bPri = (b.region === activeRegion) ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      return a.customer.localeCompare(b.customer, undefined, { sensitivity: 'base' });
    });

    return matches.slice(0, 10);
  }, [form.company, customerDirectory, region, form.region]);

  // Bulk Paste (column-based)
  const [bulkCols, setBulkCols] = useState({ ...exampleRow });
  const [exampleActiveCols, setExampleActiveCols] = useState(() => ({
    company: true,
    trailer_number: true,
    notes: true,
    dock_hours: true,
    eta: true,
    bol: true,
    item: true,
    delivered_by: true,
  }));
  const shouldRefocus = useRef({ field: null });

  useEffect(() => {
    if (defaultDate) {
      setForm(prev => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate]);

  useEffect(() => {
    // Keep region in sync with the IL/PA toggle (outside this form)
    const r = (region || '').toString().trim().toUpperCase();
    setForm(prev => ({ ...prev, region: r }));
  }, [region]);

  const resetFormAndBulk = (opts = { keepExpanded: false }) => {
    // Single-entry form
    setForm(getInitialForm(defaultDate, region));
    setIsCompanyFocused(false);
    ignoreCompanyBlurRef.current = false;

    // Bulk paste example (so it shows the hint again next time)
    setBulkCols({ ...exampleRow });
    setExampleActiveCols({
      company: true,
      trailer_number: true,
      notes: true,
      dock_hours: true,
      eta: true,
      bol: true,
      item: true,
      delivered_by: true,
    });

    if (!opts.keepExpanded) setIsExpanded(false);
  };

  const isExampleActive = useMemo(() => Object.values(exampleActiveCols).some(Boolean), [exampleActiveCols]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    await onAdd({ ...form, region: (region || form.region || '').toString().trim().toUpperCase() });
    setForm(getInitialForm(form.date, region));
    setIsExpanded(false);
  };

  const clearBulk = () => {
    setBulkCols({
      company: '',
      trailer_number: '',
      notes: '',
      dock_hours: '',
      eta: '',
      bol: '',
      item: '',
      delivered_by: ''
    });
    setExampleActiveCols({
      company: false,
      trailer_number: false,
      notes: false,
      dock_hours: false,
      eta: false,
      bol: false,
      item: false,
      delivered_by: false,
    });
  };

  const bulkArrays = useMemo(() => {
    const a = {
      company: normalizeLines(bulkCols.company),
      trailer_number: normalizeLines(bulkCols.trailer_number),
      notes: normalizeLines(bulkCols.notes),
      dock_hours: normalizeLines(bulkCols.dock_hours),
      eta: normalizeLines(bulkCols.eta),
      bol: normalizeLines(bulkCols.bol),
      item: normalizeLines(bulkCols.item),
      delivered_by: normalizeLines(bulkCols.delivered_by),
    };
    const maxLen = Math.max(
      a.company.length,
      a.trailer_number.length,
      a.notes.length,
      a.dock_hours.length,
      a.eta.length,
      a.bol.length,
      a.item.length,
      a.delivered_by.length
    );
    return { a, maxLen };
  }, [bulkCols]);

  const bulkEntryCount = useMemo(() => {
    // While example is showing, treat it as 0 entries (so you don't accidentally import the sample)
    if (isExampleActive) return 0;

    const { a, maxLen } = bulkArrays;
    let count = 0;
    for (let i = 0; i < maxLen; i++) {
      const company = (a.company[i] || '').trim();
      if (company) count++;
    }
    return count;
  }, [bulkArrays, isExampleActive]);

  const handleBulkSubmit = async (e) => {
    e.preventDefault();

    if (isExampleActive) return;

    const { a, maxLen } = bulkArrays;
    if (maxLen === 0) return;

    const entries = [];
    for (let i = 0; i < maxLen; i++) {
      const company = (a.company[i] || '').trim();
      if (!company) continue;

      entries.push({
        date: form.date,
        region: (region || form.region || '').toString().trim().toUpperCase(),
        company,
        trailer_number: (a.trailer_number[i] || '').trim(),
        notes: (a.notes[i] || '').trim(),
        dock_hours: (a.dock_hours[i] || '').trim(),
        eta: (a.eta[i] || '').trim(),
        bol: (a.bol[i] || '').trim(),
        item: (a.item[i] || '').trim(),
        delivered_by: (a.delivered_by[i] || '').trim()
      });
    }

    for (const entry of entries) {
      await onAdd(entry);
    }

    clearBulk();
    setIsExpanded(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkColChange = (field, value) => {
    // If the column is still showing the example value, clear just that column first
    if (exampleActiveCols[field]) {
      setExampleActiveCols(prev => ({ ...prev, [field]: false }));
      setBulkCols(prev => ({ ...prev, [field]: "" }));
      // Let the change apply after the clear
      setTimeout(() => {
        setBulkCols(prev => {
          const next = { ...prev, [field]: value };
          if (field === 'company') {
            const compLines = normalizeLines(value);
            const existingDockLines = normalizeLines(next.dock_hours);
            const existingEtaLines = normalizeLines(next.eta);
            const maxLen = Math.max(compLines.length, existingDockLines.length, existingEtaLines.length);
            const dockOut = [];
            const etaOut = [];
            let didFillDock = false;
            let didFillEta = false;

            for (let i = 0; i < maxLen; i++) {
              const c = (compLines[i] || '').trim();
              const d = (existingDockLines[i] || '').trim();
              const e = (existingEtaLines[i] || '').trim();

              // Dock Hours
              if (d) {
                dockOut.push(d);
              } else if (!c) {
                dockOut.push('');
              } else {
                const dock = getDockHoursForCompany(c);
                if (dock) {
                  dockOut.push(dock);
                  didFillDock = true;
                } else {
                  dockOut.push('');
                }
              }

              // ETA
              if (e) {
                etaOut.push(e);
              } else if (!c) {
                etaOut.push('');
              } else {
                const eta = getEtaForCompany(c);
                if (eta) {
                  etaOut.push(eta);
                  didFillEta = true;
                } else {
                  etaOut.push('');
                }
              }
            }

            if (didFillDock) {
              next.dock_hours = dockOut.join('\n');
              setExampleActiveCols(prevEx => ({ ...prevEx, dock_hours: false }));
            }
            if (didFillEta) {
              next.eta = etaOut.join('\n');
              setExampleActiveCols(prevEx => ({ ...prevEx, eta: false }));
            }
          }
          return next;
        });
      }, 0);
      return;
    }

    setBulkCols(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'company') {
        const compLines = normalizeLines(value);
        const existingDockLines = normalizeLines(next.dock_hours);
        const existingEtaLines = normalizeLines(next.eta);
        const maxLen = Math.max(compLines.length, existingDockLines.length, existingEtaLines.length);
        const dockOut = [];
        const etaOut = [];
        let didFillDock = false;
        let didFillEta = false;

        for (let i = 0; i < maxLen; i++) {
          const c = (compLines[i] || '').trim();
          const d = (existingDockLines[i] || '').trim();
          const e = (existingEtaLines[i] || '').trim();

          // Dock Hours
          if (d) {
            dockOut.push(d);
          } else if (!c) {
            dockOut.push('');
          } else {
            const dock = getDockHoursForCompany(c);
            if (dock) {
              dockOut.push(dock);
              didFillDock = true;
            } else {
              dockOut.push('');
            }
          }

          // ETA
          if (e) {
            etaOut.push(e);
          } else if (!c) {
            etaOut.push('');
          } else {
            const eta = getEtaForCompany(c);
            if (eta) {
              etaOut.push(eta);
              didFillEta = true;
            } else {
              etaOut.push('');
            }
          }
        }

        if (didFillDock) {
          next.dock_hours = dockOut.join('\n');
          if (exampleActiveCols.dock_hours) {
            setExampleActiveCols(prevEx => ({ ...prevEx, dock_hours: false }));
          }
        }
        if (didFillEta) {
          next.eta = etaOut.join('\n');
          if (exampleActiveCols.eta) {
            setExampleActiveCols(prevEx => ({ ...prevEx, eta: false }));
          }
        }
      }
      return next;
    });
  };

  const handleBulkFocus = (field) => {
    // Clicking into a column should clear ONLY that column's example value
    if (exampleActiveCols[field]) {
      shouldRefocus.current.field = field;
      setExampleActiveCols(prev => ({ ...prev, [field]: false }));
      setBulkCols(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Try to keep cursor in the clicked textarea after clearing example
  useEffect(() => {
    if (shouldRefocus.current.field) {
      const id = `bulk-${shouldRefocus.current.field}`;
      const el = document.getElementById(id);
      if (el && typeof el.focus === "function") el.focus();
      shouldRefocus.current.field = null;
    }
  }, [exampleActiveCols]);

  if (!isExpanded) {
    return (
      <Button
        onClick={() => {
          // Always open with a clean form (Cancel should not leave stale data)
          setForm(getInitialForm(defaultDate, region));
          setIsCompanyFocused(false);
          ignoreCompanyBlurRef.current = false;

          // Reset example each time the form opens (matches "show one example")
          setBulkCols({ ...exampleRow });
          setExampleActiveCols({
            company: true,
            trailer_number: true,
            notes: true,
            dock_hours: true,
            eta: true,
            bol: true,
            item: true,
            delivered_by: true,
          });

          setIsExpanded(true);
        }}
        className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-12 px-6 shadow-lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add New Entry
      </Button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Add Dispatch Entry</h3>
        <Badge
          className={`rounded-full px-3 py-1 text-xs font-semibold border-0 ${
            (region || form.region || '').toString().trim().toUpperCase() === 'PA'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
          variant="secondary"
        >
          {(region || form.region || '').toString().trim().toUpperCase() || 'IL'}
        </Badge>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Paste</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Company *</label>
                <div className="relative">
                  <Input
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    onFocus={() => setIsCompanyFocused(true)}
                    onBlur={() => {
                      if (ignoreCompanyBlurRef.current) return;
                      tryAutoFillDockHoursFromCompany();
                      tryAutoFillEtaFromCompany();
                      setIsCompanyFocused(false);
                    }}
                    placeholder="Company name"
                    className="h-10"
                    required
                    autoComplete="off"
                  />

                  {isCompanyFocused && companyMatches.length > 0 ? (
                    <div
                      className="absolute left-0 top-full z-[1000] mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl"
                      role="listbox"
                    >
                      <div className="max-h-72 overflow-y-auto p-1">
                        {companyMatches.map((row) => (
                          <button
                            key={row._key}
                            type="button"
                            onMouseDown={() => { ignoreCompanyBlurRef.current = true; }}
                            onMouseUp={() => { ignoreCompanyBlurRef.current = false; }}
                            onClick={() => {
                              applyCompanyPick(row);
                              setIsCompanyFocused(false);
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">{row.customer}</div>
                                <div className="truncate text-xs text-slate-600">{row.address}</div>
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
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Trailer #</label>
                <Input
                  value={form.trailer_number}
                  onChange={(e) => handleChange('trailer_number', e.target.value)}
                  placeholder="e.g. 1256"
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">BOL</label>
                <Input
                  value={form.bol}
                  onChange={(e) => handleChange('bol', e.target.value)}
                  placeholder="e.g. 138411"
                  className="h-10"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                <Input
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes"
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Dock Hours</label>
                <Input
                  value={form.dock_hours}
                  onChange={(e) => handleChange('dock_hours', e.target.value)}
                  placeholder="e.g. 6am - 4am"
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">ETA</label>
                <Input
                  value={form.eta}
                  onChange={(e) => handleChange('eta', e.target.value)}
                  placeholder="e.g. 28 min"
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Item</label>
                <Input
                  value={form.item}
                  onChange={(e) => handleChange('item', e.target.value)}
                  placeholder="e.g. 96x48"
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => resetFormAndBulk()}
                className="text-slate-500"
              >
                Cancel
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="bulk">
          <form onSubmit={handleBulkSubmit}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Paste values into any column below. Each line is one order.
                  {isExampleActive ? <span className="text-slate-400"> (click any column to start)</span> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    clearBulk();
                    setExampleActiveCols({
                      company: false,
                      trailer_number: false,
                      notes: false,
                      dock_hours: false,
                      eta: false,
                      bol: false,
                      item: false,
                      delivered_by: false,
                    });
                  }}
                  className="text-slate-500"
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-8 gap-0 border-b border-slate-200 bg-slate-50">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Company</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Trailer #</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Notes</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Dock Hrs</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">ETA</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">BOL</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-r border-slate-200">Item</div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-700">Delivered</div>
                  </div>

                  <div className="grid grid-cols-8 gap-0">
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-company"
                        value={bulkCols.company}
                        onFocus={() => handleBulkFocus('company')}
                        onChange={(e) => handleBulkColChange('company', e.target.value)}
                        placeholder="Company"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.company ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-trailer_number"
                        value={bulkCols.trailer_number}
                        onFocus={() => handleBulkFocus('trailer_number')}
                        onChange={(e) => handleBulkColChange('trailer_number', e.target.value)}
                        placeholder="Trailer #"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.trailer_number ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-notes"
                        value={bulkCols.notes}
                        onFocus={() => handleBulkFocus('notes')}
                        onChange={(e) => handleBulkColChange('notes', e.target.value)}
                        placeholder="Notes"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.notes ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-dock_hours"
                        value={bulkCols.dock_hours}
                        onFocus={() => handleBulkFocus('dock_hours')}
                        onChange={(e) => handleBulkColChange('dock_hours', e.target.value)}
                        placeholder="Dock Hrs"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.dock_hours ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-eta"
                        value={bulkCols.eta}
                        onFocus={() => handleBulkFocus('eta')}
                        onChange={(e) => handleBulkColChange('eta', e.target.value)}
                        placeholder="ETA"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.eta ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-bol"
                        value={bulkCols.bol}
                        onFocus={() => handleBulkFocus('bol')}
                        onChange={(e) => handleBulkColChange('bol', e.target.value)}
                        placeholder="BOL"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.bol ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <Textarea
                        id="bulk-item"
                        value={bulkCols.item}
                        onFocus={() => handleBulkFocus('item')}
                        onChange={(e) => handleBulkColChange('item', e.target.value)}
                        placeholder="Item"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.item ? "text-slate-400" : ""}`}
                      />
                    </div>
                    <div className="p-2">
                      <Textarea
                        id="bulk-delivered_by"
                        value={bulkCols.delivered_by}
                        onFocus={() => handleBulkFocus('delivered_by')}
                        onChange={(e) => handleBulkColChange('delivered_by', e.target.value)}
                        placeholder="Delivered"
                        className={`h-56 font-mono text-sm resize-none ${exampleActiveCols.delivered_by ? "text-slate-400" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Tip: Paste a vertical selection from Excel into any column. The importer matches lines by row number.
              </p>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  disabled={bulkEntryCount === 0}
                >
                  <Table className="h-4 w-4 mr-2" />
                  Import {bulkEntryCount} {bulkEntryCount === 1 ? 'Entry' : 'Entries'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => resetFormAndBulk()}
                  className="text-slate-500"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
