import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import seedCustomers from "@/data/customers_pa.json";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Copy, MapPin, ArrowLeft, Pencil, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function stripLeadingNumber(name) {
  return String(name ?? "")
    .replace(/^[\s\u00A0]*\d+[\s\u00A0]*[\.)-]?[\s\u00A0]+/, "")
    .trim();
}

function displayCustomerName(name) {
  const stripped = stripLeadingNumber(name);
  return stripped || String(name ?? "").trim() || "Unknown customer";
}

function displayIdNumber(id) {
  const s = String(id ?? "").trim();
  const m = s.match(/(\d+)/);
  return m ? m[1] : s;
}

function getNextId(customers) {
  const nums = (customers || [])
    .map((c) => {
      const raw = c?.id;
      const s = String(raw ?? "").trim();
      const m = s.match(/(\d+)/);
      const n = m ? parseInt(m[1], 10) : parseInt(s, 10);
      return Number.isFinite(n) ? n : NaN;
    })
    .filter((n) => Number.isFinite(n));

  const max = nums.length ? Math.max(...nums) : 0;
  return max + 1;
}

function joinParts(...parts) {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" • ");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text ?? ""));
    return true;
  } catch {
    return false;
  }
}

function getErrorMessage(err) {
  if (!err) return "Save failed.";
  return err?.data?.error || err?.message || "Save failed.";
}

function CustomerEditorDialog({ open, onOpenChange, title, initial, onSave, isSaving }) {
  const [form, setForm] = useState(() => ({ ...initial }));

  useEffect(() => {
    setForm({ ...initial });
  }, [initial, open]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const normalizeEmail = (v) => String(v ?? "").trim();
  const normalizePhone = (v) => String(v ?? "").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Customer</Label>
            <Input value={form.customer || ""} onChange={set("customer")} className="rounded-xl" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea value={form.address || ""} onChange={set("address")} className="min-h-[70px] rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Receiving Hours</Label>
            <Input value={form.receivingHours || ""} onChange={set("receivingHours")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Weekend Hours</Label>
            <Input value={form.weekendHours || ""} onChange={set("weekendHours")} className="rounded-xl" placeholder="Sat/Sun hours" />
          </div>

          <div className="space-y-2">
            <Label>Coordinates</Label>
            <Input value={form.coordinates || ""} onChange={set("coordinates")} className="rounded-xl" placeholder="lat, lng" />
          </div>

          <div className="space-y-2">
            <Label>Dis</Label>
            <Input value={form.dis || ""} onChange={set("dis")} className="rounded-xl" placeholder="e.g., 18 mi" />
          </div>

          <div className="space-y-2">
            <Label>ETA</Label>
            <Input value={form.eta || ""} onChange={set("eta")} className="rounded-xl" placeholder="e.g., 28 min" />
          </div>

          <div className="space-y-2">
            <Label>Contact</Label>
            <Input value={form.contact || ""} onChange={set("contact")} className="rounded-xl" placeholder="Contact name / info" />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.contactPhone || ""}
              onChange={(e) => setForm((p) => ({ ...p, contactPhone: normalizePhone(e.target.value) }))}
              className="rounded-xl"
              placeholder="(###) ###-####"
            />
          </div>

          <div className="space-y-2">
            <Label>E-Mail</Label>
            <Input
              value={form.contactEmail || ""}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: normalizeEmail(e.target.value) }))}
              className="rounded-xl"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Receiving Notes</Label>
            <Textarea value={form.receivingNotes || ""} onChange={set("receivingNotes")} className="min-h-[70px] rounded-xl" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={set("notes")} className="min-h-[70px] rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Distance</Label>
            <Input value={form.distance || ""} onChange={set("distance")} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label>Drop Trailers</Label>
            <Input value={form.dropTrailers || ""} onChange={set("dropTrailers")} className="rounded-xl" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(form)}
            className="rounded-xl bg-amber-500 text-black hover:bg-amber-500/90"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerCard({ row, onEdit, onDelete, onCopy }) {
  const name = displayCustomerName(row?.customer);
  const idBadge = displayIdNumber(row?.id);

  const hasAddress = !!String(row?.address || "").trim();
  const hasReceiving = !!String(row?.receivingHours || "").trim();
  const hasWeekend = !!String(row?.weekendHours || "").trim();
  const hasNotes = !!String(row?.notes || "").trim();
  const hasRecvNotes = !!String(row?.receivingNotes || "").trim();
  const hasContact = !!String(row?.contact || "").trim();
  const hasContactPhone = !!String(row?.contactPhone || "").trim();
  const hasContactEmail = !!String(row?.contactEmail || "").trim();
  const hasDistance = !!String(row?.distance || "").trim();
  const hasDrop = !!String(row?.dropTrailers || "").trim();
  const hasCoords = !!String(row?.coordinates || "").trim();
  const hasDis = !!String(row?.dis || "").trim();
  const hasEta = !!String(row?.eta || "").trim();

  const mapsUrl = hasAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}` : null;

  const copyLine = async () => {
    const txt = joinParts(
      name,
      row?.address,
      row?.receivingHours ? `Hours: ${row.receivingHours}` : "",
      row?.weekendHours ? `Weekend: ${row.weekendHours}` : "",
      row?.contact ? `Contact: ${row.contact}` : "",
      row?.contactPhone ? `Phone: ${row.contactPhone}` : "",
      row?.contactEmail ? `Email: ${row.contactEmail}` : "",
      row?.dis ? `Dis: ${row.dis}` : "",
      row?.eta ? `ETA: ${row.eta}` : ""
    );

    const ok = await copyText(txt);
    if (onCopy) onCopy(ok);
  };

  return (
    <Card className="rounded-2xl border-black/10 bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg font-semibold leading-tight flex items-center gap-2">
              <Badge className="rounded-full bg-black text-amber-400 hover:bg-black" title="Customer ID">
                {idBadge}
              </Badge>
              <span className="truncate">{name}</span>
            </CardTitle>
            {hasAddress ? (
              <div className="mt-1 text-sm text-muted-foreground flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-none" />
                <span className="line-clamp-2">{row.address}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" className="rounded-xl" onClick={copyLine} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>

            <Button variant="secondary" size="icon" className="rounded-xl" onClick={() => onEdit(row)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-xl" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <b>{name}</b> from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-600/90" onClick={() => onDelete(row)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {(hasReceiving || hasWeekend || hasDistance || hasDis || hasEta) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {hasReceiving ? (
                <div>
                  <span className="text-muted-foreground">Hours:</span> {row.receivingHours}
                </div>
              ) : null}

              {hasWeekend ? (
                <div>
                  <span className="text-muted-foreground">Weekend:</span> {row.weekendHours}
                </div>
              ) : null}

              {hasDistance ? (
                <div>
                  <span className="text-muted-foreground">Distance:</span> {row.distance}
                </div>
              ) : null}

              {hasDis ? (
                <div>
                  <span className="text-muted-foreground">Dis:</span> {row.dis}
                </div>
              ) : null}

              {hasEta ? (
                <div>
                  <span className="text-muted-foreground">ETA:</span> {row.eta}
                </div>
              ) : null}
            </div>
          ) : null}

          {(hasContact || hasContactPhone || hasContactEmail) ? (
            <>
              <Separator className="bg-black/10" />
              <div className="space-y-1 text-sm">
                {hasContact ? (
                  <div>
                    <span className="text-muted-foreground">Contact:</span> {row.contact}
                  </div>
                ) : null}
                {hasContactPhone ? (
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {row.contactPhone}
                  </div>
                ) : null}
                {hasContactEmail ? (
                  <div>
                    <span className="text-muted-foreground">E-Mail:</span> {row.contactEmail}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {hasRecvNotes ? (
            <>
              <Separator className="bg-black/10" />
              <div className="text-sm">
                <div className="text-muted-foreground">Receiving Notes</div>
                <div className="whitespace-pre-wrap">{row.receivingNotes}</div>
              </div>
            </>
          ) : null}

          {hasNotes ? (
            <>
              <Separator className="bg-black/10" />
              <div className="text-sm">
                <div className="text-muted-foreground">Notes</div>
                <div className="whitespace-pre-wrap">{row.notes}</div>
              </div>
            </>
          ) : null}

          {(hasDrop || hasCoords) ? (
            <>
              <Separator className="bg-black/10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {hasDrop ? (
                  <div>
                    <span className="text-muted-foreground">Drop Trailers:</span> {row.dropTrailers}
                  </div>
                ) : null}
                {hasCoords ? (
                  <div>
                    <span className="text-muted-foreground">Coords:</span> {row.coordinates}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-800"
              title="Open in Google Maps"
            >
              Open map
              <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomersPA() {
  const [q, setQ] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState("edit");
  const [activeRow, setActiveRow] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["customers_pa"],
    queryFn: () => api.entities.CustomerPA.list("customer"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.CustomerPA.create(data),
    onError: (err) => setSaveError(getErrorMessage(err)),
    onSuccess: () => {
      setSaveError("");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers_pa"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.CustomerPA.update(id, data),
    onError: (err) => setSaveError(getErrorMessage(err)),
    onSuccess: () => {
      setSaveError("");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers_pa"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.CustomerPA.delete(id),
    onError: (err) => setSaveError(getErrorMessage(err)),
    onSuccess: () => {
      setSaveError("");
      queryClient.invalidateQueries({ queryKey: ["customers_pa"] });
    },
  });

  const bulkSeedMutation = useMutation({
    mutationFn: () => api.custom.customersPA.bulkUpsert(Array.isArray(seedCustomers) ? seedCustomers : []),
    onError: (err) => setSaveError(getErrorMessage(err)),
    onSuccess: () => {
      setSaveError("");
      queryClient.invalidateQueries({ queryKey: ["customers_pa"] });
    },
  });

  const rows = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const qq = norm(q);

    const filtered = !qq
      ? list
      : list.filter((r) => {
          const hay = [
            r?.id,
            r?.customer,
            stripLeadingNumber(r?.customer),
            r?.address,
            r?.receivingHours,
            r?.receivingNotes,
            r?.contact,
            r?.contactPhone,
            r?.contactEmail,
            r?.notes,
            r?.dropTrailers,
            r?.coordinates,
            r?.dis,
            r?.eta,
            r?.weekendHours,
          ]
            .map(norm)
            .join(" | ");
          return hay.includes(qq);
        });

    return filtered.slice().sort((a, b) =>
      displayCustomerName(a?.customer).localeCompare(displayCustomerName(b?.customer), undefined, { sensitivity: "base" })
    );
  }, [q, customers]);

  const openEdit = (row) => {
    setSaveError("");
    setEditMode("edit");
    setActiveRow(row);
    setEditOpen(true);
  };

  const openNew = () => {
    setSaveError("");
    setEditMode("new");
    setActiveRow({
      id: null,
      customer: "",
      address: "",
      receivingHours: "",
      receivingNotes: "",
      contact: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      distance: "",
      dropTrailers: "",
      weekendHours: "",
      coordinates: "",
      dis: "",
      eta: "",
    });
    setEditOpen(true);
  };

  const saveRow = (draft) => {
    const cleaned = {
      ...(draft || {}),
      customer: displayCustomerName(draft?.customer),
      address: String(draft?.address ?? "").trim(),
      receivingHours: String(draft?.receivingHours ?? "").trim(),
      receivingNotes: String(draft?.receivingNotes ?? "").trim(),
      weekendHours: String(draft?.weekendHours ?? "").trim(),
      distance: String(draft?.distance ?? "").trim(),
      contact: String(draft?.contact ?? "").trim(),
      contactPhone: String(draft?.contactPhone ?? "").trim(),
      contactEmail: String(draft?.contactEmail ?? "").trim(),
      notes: String(draft?.notes ?? "").trim(),
      dropTrailers: String(draft?.dropTrailers ?? "").trim(),
      coordinates: String(draft?.coordinates ?? "").trim(),
      dis: String(draft?.dis ?? "").trim(),
      eta: String(draft?.eta ?? "").trim(),
    };

    if (!cleaned.customer) return;

    if (editMode === "new") {
      if (cleaned.id === null || cleaned.id === undefined || cleaned.id === "") {
        cleaned.id = getNextId(customers);
      }
      createMutation.mutate(cleaned);
      return;
    }

    const id = activeRow?.id;
    if (id === undefined || id === null || id === "") return;

    updateMutation.mutate({ id, data: cleaned });
  };

  const deleteRow = (row) => {
    const id = row?.id;
    if (id === undefined || id === null || id === "") return;
    deleteMutation.mutate(id);
  };

  const onCopy = (ok) => {
    setToastMsg(ok ? "Copied" : "Copy failed");
    window.setTimeout(() => setToastMsg(""), 900);
  };

  const hasDbCustomers = Array.isArray(customers) && customers.length > 0;
  const seedCount = Array.isArray(seedCustomers) ? seedCustomers.length : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <CustomerEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editMode === "new" ? "Add new customer (PA)" : "Edit customer (PA)"}
        initial={activeRow || {}}
        onSave={saveRow}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-400/90 text-black grid place-items-center shadow-sm ring-1 ring-black/10">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Customers PA</h1>
              <div className="text-sm text-muted-foreground">Saved in Supabase (same as your other pages).</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Link
            to={createPageUrl("Customers")}
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-black/10 bg-white/70 hover:bg-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2 text-muted-foreground" />
            Customers IL
          </Link>

          <Button
            type="button"
            onClick={openNew}
            className="h-10 rounded-xl bg-amber-500 text-black hover:bg-amber-500/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>

          {!hasDbCustomers && seedCount ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => bulkSeedMutation.mutate()}
              className="h-10 rounded-xl"
              disabled={bulkSeedMutation.isPending}
              title="Push the built-in Excel list into Supabase"
            >
              {bulkSeedMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initializing…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Initialize from Excel
                </span>
              )}
            </Button>
          ) : null}

          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-black text-amber-400 hover:bg-black">{rows.length}</Badge>
            <span className="text-sm text-muted-foreground">matches</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{saveError}</div>
        ) : null}
        {toastMsg ? (
          <div className="mt-2 text-sm text-muted-foreground">{toastMsg}</div>
        ) : null}
        {error ? (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {getErrorMessage(error)}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by customer, address, contact, hours…"
          className="h-11 rounded-2xl bg-white/70 border-black/10"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customers…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hasDbCustomers ? "Loaded from Supabase" : (seedCount ? "No customers in Supabase yet" : "No customers")}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((r, idx) => (
          <CustomerCard
            key={String(r?.id ?? idx)}
            row={r}
            onEdit={openEdit}
            onDelete={deleteRow}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}
