
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { api } from "@/api/apiClient";

const unwrapListResult = (list) => {
  if (Array.isArray(list)) return list;
  if (!list) return [];
  if (Array.isArray(list.data)) return list.data;
  if (Array.isArray(list.rows)) return list.rows;
  return [];
};

const getInitialForm = (calledOutDate, regionValue) => ({
  region: (regionValue || "").toString().trim().toUpperCase(),
  date_called_out: calledOutDate || format(new Date(), "yyyy-MM-dd"),
  company: "",
  dk_trl: "",
  location: "",
  eta: "",
  type: "",
  notes: "",
  date_picked_up: "",
  driver: "",
});

export default function AddPickupForm({ onAdd, defaultCalledOutDate, region }) {

  const [form, setForm] = useState(() =>
    getInitialForm(defaultCalledOutDate, region)
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const ignoreCompanyBlurRef = useRef(false);

  const [customersIL, setCustomersIL] = useState([]);
  const [customersPA, setCustomersPA] = useState([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [il, pa] = await Promise.all([
          api.entities.CustomerIL.list("customer").catch(() => []),
          api.entities.CustomerPA.list("customer").catch(() => []),
        ]);

        if (!alive) return;

        setCustomersIL(unwrapListResult(il));
        setCustomersPA(unwrapListResult(pa));
      } catch {}
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  const customerDirectory = useMemo(() => {

    const normalize = (v) => (v ?? "").toString().trim();

    const withMeta = (rows, rgn) =>
      (rows || []).map((r, idx) => ({
        _key: `${rgn}-${r?.id ?? idx}`,
        region: rgn,
        customer: normalize(r?.customer),
        address: normalize(r?.address),
        eta: normalize(r?.eta),
      }));

    return [
      ...withMeta(customersIL, "IL"),
      ...withMeta(customersPA, "PA"),
    ].filter((r) => r.customer);

  }, [customersIL, customersPA]);

  const normalizeCompanyKey = (v) =>
    (v ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^\\d+\\s+/, "")
      .replace(/^[-–—\\s]+/, "")
      .trim();

  const findCustomer = (companyValue) => {

    const key = normalizeCompanyKey(companyValue);
    if (!key) return null;

    const regionUpper = (region || "").toString().trim().toUpperCase();

    const candidates = customerDirectory.filter(
      (r) => normalizeCompanyKey(r.customer) === key
    );

    if (!candidates.length) return null;

    const preferred = candidates.find((c) => c.region === regionUpper);

    return preferred || candidates[0];

  };

  const companyMatches = useMemo(() => {

    const q = (form.company || "").trim().toLowerCase();
    if (!q) return [];

    const regionUpper = (region || "").toString().trim().toUpperCase();

    return customerDirectory
      .filter((r) => r.customer.toLowerCase().includes(q))
      .sort((a, b) => {
        const aPref = a.region === regionUpper ? 0 : 1;
        const bPref = b.region === regionUpper ? 0 : 1;
        return aPref - bPref;
      })
      .slice(0, 10);

  }, [form.company, customerDirectory, region]);

  const applyCompanyPick = (row) => {

    setForm((prev) => ({
      ...prev,
      company: row.customer,
      location: row.address || prev.location,
      eta: row.eta || prev.eta,
    }));

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!form.company.trim()) return;

    const picked = findCustomer(form.company);

    await onAdd({
      ...form,
      region: (region || form.region || "").toString().trim().toUpperCase(),
      location: (form.location || "").trim() || picked?.address || "",
      eta: form.eta || picked?.eta || "",
      date_picked_up: "",
      driver: "",
    });

    setForm(getInitialForm(form.date_called_out, region));
    setIsExpanded(false);

  };

  if (!isExpanded) {
    return (
      <Button onClick={() => setIsExpanded(true)} className="rounded-xl h-12 px-5">
        <Plus className="h-4 w-4 mr-2" />
        New Pick Up
      </Button>
    );
  }

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full md:w-[740px]">

      <div className="flex items-start justify-between gap-3">

        <div>
          <div className="text-lg font-bold text-slate-800">New Pick Up</div>
          <div className="text-sm text-slate-500">
            Company suggestions now pull from Supabase
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-xl">
            {(region || "").toString().trim().toUpperCase() || "IL"}
          </Badge>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setIsExpanded(false)}
          >
            Close
          </Button>
        </div>

      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          <div className="md:col-span-2 relative">

            <label className="text-xs font-semibold text-slate-600">
              Company
            </label>

            <Input
              value={form.company}
              onChange={(e) =>
                setForm((p) => ({ ...p, company: e.target.value }))
              }
              placeholder="Start typing customer..."
              className="h-11 rounded-xl"
              onFocus={() => setIsCompanyFocused(true)}
              onBlur={() => {

                if (ignoreCompanyBlurRef.current) return;

                const picked = findCustomer(form.company);

                if (picked) {
                  setForm((p) => ({
                    ...p,
                    location: p.location || picked.address,
                    eta: p.eta || picked.eta,
                  }));
                }

                setIsCompanyFocused(false);

              }}
            />

            {isCompanyFocused && companyMatches.length > 0 && (

              <div
                className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                onMouseDown={() => {
                  ignoreCompanyBlurRef.current = true;
                }}
              >

                {companyMatches.map((r) => (
                  <button
                    key={r._key}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    onMouseDown={(e) => {

                      e.preventDefault();

                      applyCompanyPick(r);
                      setIsCompanyFocused(false);

                      setTimeout(() => {
                        ignoreCompanyBlurRef.current = false;
                      }, 0);

                    }}
                  >

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-slate-800 truncate">
                        {r.customer}
                      </div>
                      <Badge variant="secondary" className="rounded-xl">
                        {r.region}
                      </Badge>
                    </div>

                    {r.address && (
                      <div className="text-xs text-slate-500 truncate">
                        {r.address}
                      </div>
                    )}

                  </button>
                ))}

              </div>

            )}

          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Dk/TRL#
            </label>

            <Input
              value={form.dk_trl}
              onChange={(e) =>
                setForm((p) => ({ ...p, dk_trl: e.target.value }))
              }
              placeholder="31489"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Type
            </label>

            <Input
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({ ...p, type: e.target.value }))
              }
              className="h-11 rounded-xl"
            />
          </div>

          <div className="md:col-span-4">

            <label className="text-xs font-semibold text-slate-600">
              Location
            </label>

            <Input
              value={form.location}
              onChange={(e) =>
                setForm((p) => ({ ...p, location: e.target.value }))
              }
              className="h-11 rounded-xl"
            />

          </div>

          <div>

            <label className="text-xs font-semibold text-slate-600">
              ETA
            </label>

            <Input
              value={form.eta}
              onChange={(e) =>
                setForm((p) => ({ ...p, eta: e.target.value }))
              }
              className="h-11 rounded-xl"
            />

          </div>

        </div>

        <div>

          <label className="text-xs font-semibold text-slate-600">
            Notes
          </label>

          <Textarea
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, notes: e.target.value }))
            }
            className="min-h-[90px] rounded-xl"
          />

        </div>

        <div className="flex items-center justify-end gap-2 pt-1">

          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setIsExpanded(false)}
          >
            Cancel
          </Button>

          <Button type="submit" className="rounded-xl">
            Save
          </Button>

        </div>

      </form>

    </div>

  );

}

