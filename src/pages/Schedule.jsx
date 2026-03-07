import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Download, Trash2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";

function normalizeState(v) {
  return (v ?? "").toString().trim().toUpperCase();
}

function regionFromTab(tab) {
  return String(tab || "").toLowerCase().includes("pa") ? "PA" : "IL";
}

function shiftTypeFromTab(tab) {
  const t = String(tab || "");
  if (t === "day" || t === "dayPA") return "day";
  if (t === "night" || t === "nightPA") return "night";
  return "day";
}

function makeEntryId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return `e_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}


const RUN_OPTIONS = ["1st Run", "2nd Run", "3rd Run", "Add new…"];

function runOrderFromLabel(label) {
  const v = String(label || "").toLowerCase();
  if (v.includes("1st")) return 1;
  if (v.includes("2nd")) return 2;
  if (v.includes("3rd")) return 3;
  return 99;
}

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

export default function Schedule() {
  const [scheduleDate, setScheduleDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("day");
  const queryClient = useQueryClient();

  const region = regionFromTab(activeTab);
  const shiftType = shiftTypeFromTab(activeTab);

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const all = await api.entities.Driver.list("name");
      const list = all || [];
      // Treat missing `active` as active for backwards compatibility.
      return list.filter((d) => d.active !== false);
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", region],
    queryFn: async () => {
      const list =
        region === "PA"
          ? await api.entities.CustomerPA.list("customer")
          : await api.entities.CustomerIL.list("customer");
      return list || [];
    },
  });

  // schedules table stores one row per date:
  // - schedule_date: yyyy-mm-dd
  // - data: { entries: [...] }
  const { data: scheduleRow } = useQuery({
    queryKey: ["scheduleRow", scheduleDate],
    queryFn: async () => {
      const rows = await api.entities.Schedule.filter({ schedule_date: scheduleDate });
      return (rows && rows[0]) ? rows[0] : null;
    },
  });

  const schedules = useMemo(() => {
    const entries = scheduleRow?.data?.entries;
    return Array.isArray(entries) ? entries : [];
  }, [scheduleRow]);

  const upsertScheduleRowMutation = useMutation({
    mutationFn: async ({ schedule_date, updater }) => {
      const rows = await api.entities.Schedule.filter({ schedule_date });
      const existing = (rows && rows[0]) ? rows[0] : null;

      const currentData = (existing && existing.data && typeof existing.data === "object") ? existing.data : {};
      const nextData = updater ? updater(currentData) : currentData;

      if (existing?.id) {
        return api.entities.Schedule.update(existing.id, { schedule_date, data: nextData });
      }
      return api.entities.Schedule.create({ schedule_date, data: nextData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleRow"] });
      queryClient.invalidateQueries({ queryKey: ["scheduleRow", scheduleDate] });
      toast.success("Schedule updated");
    },
    onError: (e) => {
      toast.error(e?.message || "Could not update schedule");
    },
  });

  const [formData, setFormData] = useState({
    run_label: "1st Run",
    custom_run_label: "",
    driver_name: "",
    unit_number: "",
    trailer: "",
    pu_trailer: "",
    customer: "",
    address: "",
    show_address: true,
    notes: "",
  });

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestOpen, setCustomerSuggestOpen] = useState(false);
  const customerSuggestions = useMemo(() => {
    const q = norm(customerQuery);
    if (!q) return [];
    const hits = (customers || []).filter((c) => norm(c.customer).includes(q));
    return hits.slice(0, 8);
  }, [customers, customerQuery]);

  const handlePickCustomer = (cust) => {
    const name = String(cust?.customer ?? "").trim();
    const addr = String(cust?.address ?? "").trim();
    setFormData((p) => ({
      ...p,
      customer: name,
      address: addr || p.address,
    }));
    setCustomerQuery("");
    setCustomerSuggestOpen(false);
  };

  const handleAddDriver = async () => {
    const selectedRun = formData.run_label || "1st Run";
    const isCustomRun = selectedRun === "Add new…" || selectedRun === "Add new...";
    const run_label = (isCustomRun ? formData.custom_run_label : selectedRun) || "1st Run";

    if (!formData.driver_name) {
      toast.error("Please select a driver");
      return;
    }

    const entry = {
      entry_id: makeEntryId(),
      run_label,
      run_order: runOrderFromLabel(run_label),
      driver_name: formData.driver_name,
      unit_number: formData.unit_number || "",
      trailer: formData.trailer || "",
      pu_trailer: formData.pu_trailer || "",
      customer: formData.customer || "",
      address: formData.address || "",
      show_address: !!formData.show_address,
      notes: formData.notes || "",
      // keep these so filtering/display/export stays simple
      shift_type: shiftType,
      state: region,
      created_at: new Date().toISOString(),
    };

    upsertScheduleRowMutation.mutate({
      schedule_date: scheduleDate,
      updater: (data) => {
        const next = { ...(data || {}) };
        const arr = Array.isArray(next.entries) ? [...next.entries] : [];
        const sameIdx = arr
          .map((e, idx) => ({ e, idx }))
          .filter((x) => String(x.e?.driver_name || "") === String(entry.driver_name || ""))
          .map((x) => x.idx);
        const insertAt = sameIdx.length ? Math.max(...sameIdx) + 1 : arr.length;
        arr.splice(insertAt, 0, entry);

        // keep each driver's runs in order (1st, 2nd, 3rd, custom) within their block
        const grouped = [];
        const seen = new Set();
        for (const e of arr) {
          const key = String(e?.driver_name || "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const block = arr.filter((x) => String(x?.driver_name || "") === key);
          block.sort((a, b) => (a?.run_order ?? 99) - (b?.run_order ?? 99));
          grouped.push(...block);
        }
        const leftovers = arr.filter((e) => !String(e?.driver_name || ""));
        next.entries = [...grouped, ...leftovers];
        return next;
      },
    });

    setFormData({
      run_label: "1st Run",
      custom_run_label: "",
      driver_name: "",
      unit_number: "",
      trailer: "",
      pu_trailer: "",
      customer: "",
      address: "",
      show_address: true,
      notes: "",
    });
    setCustomerQuery("");
    setCustomerSuggestOpen(false);
  };

  const handleDeleteEntry = (entryId) => {
    upsertScheduleRowMutation.mutate({
      schedule_date: scheduleDate,
      updater: (data) => {
        const next = { ...(data || {}) };
        const arr = Array.isArray(next.entries) ? next.entries : [];
        next.entries = arr.filter((e) => String(e?.entry_id) !== String(entryId));
        return next;
      },
    });
  };

  const handleExportExcel = () => {
    const shiftSchedules = schedules.filter(
      (s) => String(s.shift_type) === String(shiftType) && normalizeState(s.state) === region
    );

    if (shiftSchedules.length === 0) {
      toast.error("No schedules to export");
      return;
    }

    const headers = ["Driver", "Unit", "Customer", "Address", "Notes", "State"];
    const rows = shiftSchedules.map((s) => [
      s.driver_name || "",
      s.unit_number || "",
      s.customer || "",
      s.show_address ? (s.address || "") : "",
      s.notes || "",
      s.state || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Schedule_${region}_${shiftType}_${scheduleDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV file downloaded");
  };

  const filteredSchedules = schedules.filter(
    (s) => String(s.shift_type) === String(shiftType) && normalizeState(s.state) === region
  );

  const ilDrivers = drivers.filter((d) => normalizeState(d.state) === "IL");
  const paDrivers = drivers.filter((d) => normalizeState(d.state) === "PA");
  const driverOptions = region === "PA" ? paDrivers : ilDrivers;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/5 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-tight text-zinc-900">
            Schedule <span className="font-semibold">Planning</span>
          </h1>
          <p className="text-zinc-700 mt-2">Plan your drivers by day, shift, and region.</p>
        </div>

        <Card className="bg-black/20 border-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Schedule Date
              </CardTitle>
              <p className="text-white/85 text-sm mt-1">Pick a date to view / edit the schedule.</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-40 bg-black/30 border-white/10 text-white"
              />
              <Button onClick={handleExportExcel} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 bg-black/30 border border-white/10">
                <TabsTrigger value="day" className="data-[state=active]:bg-white/10">IL Day</TabsTrigger>
                <TabsTrigger value="night" className="data-[state=active]:bg-white/10">IL Night</TabsTrigger>
                <TabsTrigger value="dayPA" className="data-[state=active]:bg-white/10">PA Day</TabsTrigger>
                <TabsTrigger value="nightPA" className="data-[state=active]:bg-white/10">PA Night</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Add Planned Runs Card */}
                  <Card className="bg-black/30 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Plus className="h-5 w-5 text-yellow-400" /> Add Planned Runs
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-white/80">Run</Label>
                        <Select
                          value={formData.run_label}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              run_label: value,
                              custom_run_label: value === "Add new…" || value === "Add new..." ? prev.custom_run_label : "",
                            }))
                          }
                        >
                          <SelectTrigger className="bg-black/20 border-white/10 text-white">
                            <SelectValue placeholder="Select run" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/10 text-white">
                            {RUN_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {formData.run_label === "Add new…" || formData.run_label === "Add new..." ? (
                          <div className="mt-2 space-y-2">
                            <Label className="text-white/80">Custom Run Label</Label>
                            <Input
                              value={formData.custom_run_label}
                              onChange={(e) => setFormData((prev) => ({ ...prev, custom_run_label: e.target.value }))}
                              placeholder='e.g., "Extra Run"'
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/50"
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/80">Driver</Label>
                        <Select
                          value={formData.driver_name}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, driver_name: value }))}
                        >
                          <SelectTrigger className="bg-black/20 border-white/10 text-white">
                            <SelectValue placeholder="Select driver" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/10 text-white">
                            {(driverOptions || []).map((d) => (
                              <SelectItem key={d.id} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/80">Unit Number</Label>
                        <Input
                          value={formData.unit_number}
                          onChange={(e) => setFormData((prev) => ({ ...prev, unit_number: e.target.value }))}
                          placeholder="e.g. 101"
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                        />
                      </div>

                      <div className="space-y-2 relative">
                        <Label className="text-white/80">Customer</Label>
                        <Input
                          value={formData.customer}
                          onFocus={() => {
                            if ((customerQuery || "").trim().length > 0) setCustomerSuggestOpen(true);
                          }}
                          onBlur={() => {
                            // Delay closing so clicks on suggestions still register
                            setTimeout(() => setCustomerSuggestOpen(false), 120);
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, customer: val }));
                            setCustomerQuery(val);
                            setCustomerSuggestOpen(val.trim().length > 0);
                          }}
                          placeholder="Customer name"
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                        />

                        {customerSuggestOpen && customerSuggestions.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden">
                            {customerSuggestions.map((c) => (
                              <button
                                type="button"
                                key={String(c.id)}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handlePickCustomer(c);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                              >
                                <div className="font-medium">{c.customer}</div>
                                {c.address ? <div className="text-white/80 text-xs line-clamp-1">{c.address}</div> : null}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-white/80">Address</Label>
                          <label className="flex items-center gap-2 text-white/70 text-sm select-none">
                            <input
                              type="checkbox"
                              checked={!!formData.show_address}
                              onChange={(e) => setFormData((prev) => ({ ...prev, show_address: e.target.checked }))}
                              className="h-4 w-4 accent-yellow-400"
                            />
                            Show
                          </label>
                        </div>

                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                          placeholder="e.g. 123 Main St, Chicago, IL"
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                        />
                      </div>


                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/80">Trailer</Label>
                          <Input
                            value={formData.trailer}
                            onChange={(e) => setFormData((prev) => ({ ...prev, trailer: e.target.value }))}
                            placeholder="e.g. 12345"
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white/80">P/U Trailer</Label>
                          <Input
                            value={formData.pu_trailer}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pu_trailer: e.target.value }))}
                            placeholder="e.g. 67890"
                            className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white/80">Notes</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional notes"
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/85"
                        />
                      </div>

                      <Button
                        onClick={handleAddDriver}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold rounded-xl"
                        disabled={upsertScheduleRowMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add to Schedule
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Schedule List */}
                  <Card className="bg-black/30 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">
                        {region} {shiftType === "day" ? "Day" : "Night"} Schedule
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      {filteredSchedules.length === 0 ? (
                        <div className="text-white/85 text-sm">No drivers scheduled for this shift.</div>
                      ) : (
                        <div className="space-y-3">
                          {filteredSchedules.map((s) => (
                            <div
                              key={s.entry_id || `${s.driver_name}_${s.unit_number}_${s.created_at}`}
                              className="flex items-start justify-between gap-4 p-3 rounded-xl bg-black/20 border border-white/10"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-white font-medium">{s.driver_name}</div>
                                  {s.run_label ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-200 border border-yellow-400/30">
                                      {s.run_label}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-white/85 text-sm">
                                  Unit: {s.unit_number || "—"} • Trailer: {s.trailer || "—"} • P/U Trailer: {s.pu_trailer || "—"} • Customer: {s.customer || "—"}
                                </div>
                                {s.show_address ? (
                                  <div className="text-white/85 text-sm mt-1">
                                    Address: {s.address || "—"}
                                  </div>
                                ) : null}
                                {s.notes ? <div className="text-white/80 text-sm mt-1">Notes: {s.notes}</div> : null}
                              </div>

                              <Button
                                variant="ghost"
                                onClick={() => handleDeleteEntry(s.entry_id)}
                                className="text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
