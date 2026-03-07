import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer, X } from "lucide-react";

function unwrapListResult(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.data)) return list.data;
  if (Array.isArray(list?.items)) return list.items;
  return [];
}

const money = (n) => {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
};

const blankRow = () => ({
  date: "",
  ashRef: "",
  trailer: "",
  custRef: "",
  qty48x40_1: "",
  qty48x40_2: "",
  largeOdd: "",
  smallOdd: "",
  baledOcc: "",
});

function coerceInt(v) {
  if (v === "" || v === null || typeof v === "undefined") return 0;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function Invoice() {
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  });
  const [dtValue, setDtValue] = useState("0");

  const [customerNo, setCustomerNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress1, setCustomerAddress1] = useState("");
const [customerFocused, setCustomerFocused] = useState(false);
  const ignoreCustomerBlurRef = useRef(false);

  const [rows, setRows] = useState(() => Array.from({ length: 26 }, blankRow));

  const printStyleId = "invoice-print-style";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(printStyleId)) return;
    const style = document.createElement("style");
    style.id = printStyleId;
    style.textContent = `
      @media print {
        header { display: none !important; }
        main { padding: 0 !important; }
        body { background: #fff !important; }
        .no-print { display: none !important; }
        .print-sheet { box-shadow: none !important; border: none !important; }
        .print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        /* Fit the whole invoice on a single letter page */
        @page { margin: 0.25in; }
        .print-compact-header { padding: 0 !important; }
        .print-compact-content { padding: 0 !important; }
        .print-title { font-size: 26px !important; line-height: 1.05 !important; }
        .print-subtitle { font-size: 11px !important; }
        .print-meta { font-size: 11px !important; }
        .print-sheet table { font-size: 9px !important; }
        .print-sheet th { padding: 2px !important; }
        .print-sheet td { padding: 1px !important; }
        .print-sheet input { font-size: 9px !important; }
        .print-sep { margin: 6px 0 !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const { data: rawCustomers } = useQuery({
    queryKey: ["customersIL"],
    queryFn: async () => {
      try {
        // Pull from Supabase customers_il table via the server entity route
        const res = await api.entities.CustomerIL.list("customer");
        return unwrapListResult(res);
      } catch {
        return [];
      }
    },
  });

  const customers = useMemo(() => unwrapListResult(rawCustomers), [rawCustomers]);

  const customerMatches = useMemo(() => {
    const q = (customerName || "").trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => String(c?.customer || "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [customerName, customers]);

  const selectedCustomer = useMemo(() => {
    const q = (customerName || "").trim().toLowerCase();
    if (!q) return null;
    return (
      customers.find((c) => String(c?.customer || "").toLowerCase() === q) ||
      customers.find((c) => String(c?.customer || "").toLowerCase().startsWith(q)) ||
      null
    );
  }, [customerName, customers]);

  const getUnitPrices = () => {
    const c = selectedCustomer || {};
    return {
      p48x40_1: safeNum(c.price48x40_1),
      p48x40_2: safeNum(c.price48x40_2),
      pLargeOdd: safeNum(c.priceLargeOdd),
      pSmallOdd: safeNum(c.priceSmallOdd),
      pBaledOcc: safeNum(c.priceBailedCardboard),
    };
  };

  const calcRow = (r) => {
    const q1 = coerceInt(r.qty48x40_1);
    const q2 = coerceInt(r.qty48x40_2);
    const qLarge = coerceInt(r.largeOdd);
    const qSmall = coerceInt(r.smallOdd);
    const qOcc = coerceInt(r.baledOcc);
    const { p48x40_1, p48x40_2, pLargeOdd, pSmallOdd, pBaledOcc } = getUnitPrices();
    const totalQty48 = q1 + q2;
    const total =
      q1 * p48x40_1 +
      q2 * p48x40_2 +
      qLarge * pLargeOdd +
      qSmall * pSmallOdd +
      qOcc * pBaledOcc;
    return { totalQty48, total };
  };

  const totals = useMemo(() => {
    let t1 = 0,
      t2 = 0,
      t48 = 0,
      tLarge = 0,
      tSmall = 0,
      tOcc = 0,
      grand = 0;

    for (const r of rows) {
      const q1 = coerceInt(r.qty48x40_1);
      const q2 = coerceInt(r.qty48x40_2);
      const qLarge = coerceInt(r.largeOdd);
      const qSmall = coerceInt(r.smallOdd);
      const qOcc = coerceInt(r.baledOcc);
      const { totalQty48, total } = calcRow(r);

      t1 += q1;
      t2 += q2;
      t48 += totalQty48;
      tLarge += qLarge;
      tSmall += qSmall;
      tOcc += qOcc;
      if (total > 0) grand += total;
    }

    return { t1, t2, t48, tLarge, tSmall, tOcc, grand };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectedCustomer]);

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const clearRow = (idx) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = blankRow();
      return copy;
    });
  };

  const onPickCustomer = (cust) => {
    const name = String(cust?.customer || "");
    const no = cust?.id ?? "";
    const addrRaw = String(cust?.address || "");
    // keep address on one line (no regex literals to avoid build issues)
    const addrOneLine = addrRaw.replaceAll("\r", " ").replaceAll("\n", " ").replaceAll("  ", " ").trim();

    setCustomerNo(String(no));
    setCustomerName(name);
    setCustomerAddress1(addrOneLine);
setCustomerFocused(false);
  };

  const unitPrices = useMemo(() => getUnitPrices(), [selectedCustomer]);

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-900">Invoice</div>
              <div className="text-sm text-neutral-600">Print-ready entry screen</div>
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-neutral-900 hover:bg-neutral-800">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <Card className="print-sheet rounded-2xl border border-black/10 shadow-sm">
          <CardHeader className="pb-3 print-compact-header">
            <CardTitle className="sr-only">Invoice Sheet</CardTitle>

            <div className="text-center space-y-1">
              <div className="print-title text-2xl font-extrabold tracking-wide text-red-600">ASH PALLET MANAGEMENT, INC.</div>
              <div className="print-subtitle italic text-sm text-neutral-700">
                “Where customer service and respect are our highest priorities, second to your bottom line.”
              </div>
              <div className="print-meta text-sm text-neutral-800">61 McMillen Rd., Antioch, IL 60002</div>
              <div className="print-meta text-sm text-neutral-800">
                Office: (847) 473-5700&nbsp;&nbsp; Fax: (847) 473-5600&nbsp;&nbsp; Email: ap@ashpallet.com
              </div>
            </div>

            <Separator className="my-3 print-sep" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label className="w-24">Customer #:</Label>
                  <Input value={customerNo} onChange={(e) => setCustomerNo(e.target.value)} className="h-8" />
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Label className="w-24">Customer:</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onFocus={() => setCustomerFocused(true)}
                      onBlur={() => {
                        if (ignoreCustomerBlurRef.current) {
                          ignoreCustomerBlurRef.current = false;
                          return;
                        }
                        setCustomerFocused(false);
                      }}
                      className="h-8"
                      placeholder="Start typing…"
                    />
                  </div>
                  {customerFocused && customerMatches.length > 0 && (
                    <div
                      className="absolute z-20 mt-1 left-24 right-0 bg-white border border-black/10 rounded-lg shadow-lg overflow-hidden"
                      onMouseDown={() => {
                        ignoreCustomerBlurRef.current = true;
                      }}
                      onMouseUp={() => {
                        ignoreCustomerBlurRef.current = false;
                      }}
                    >
                      {customerMatches.map((c) => (
                        <button
                          type="button"
                          key={c.id ?? c.customer}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                          onClick={() => onPickCustomer(c)}
                        >
                          {c.customer}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-24" />
                  <Input
                    value={customerAddress1}
                    onChange={(e) => setCustomerAddress1(e.target.value)}
                    className="h-9 w-full"
                    placeholder="Address"
                  />
                </div>
</div>

              <div className="space-y-2 md:col-span-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div className="sm:col-span-2 flex items-center gap-2 justify-end">
                    <Label className="whitespace-nowrap">Month</Label>
                    <Input
                      value={invoiceMonth}
                      onChange={(e) => setInvoiceMonth(e.target.value)}
                      className="h-8 max-w-[240px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Label className="whitespace-nowrap">DT -</Label>
                    <Input value={dtValue} onChange={(e) => setDtValue(e.target.value)} className="h-8 w-20" />
                  </div>
                </div>

                <div className="no-print rounded-xl border border-black/10 bg-amber-50/60 p-3 text-xs">
                  <div className="font-semibold text-neutral-800">Pricing loaded from Customer Prices</div>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-5 gap-2 text-neutral-700">
                    <div>
                      48x40 #1: <span className="font-semibold">{money(unitPrices.p48x40_1)}</span>
                    </div>
                    <div>
                      48x40 #2: <span className="font-semibold">{money(unitPrices.p48x40_2)}</span>
                    </div>
                    <div>
                      Large Odd: <span className="font-semibold">{money(unitPrices.pLargeOdd)}</span>
                    </div>
                    <div>
                      Small Odd: <span className="font-semibold">{money(unitPrices.pSmallOdd)}</span>
                    </div>
                    <div>
                      Baled OCC: <span className="font-semibold">{money(unitPrices.pBaledOcc)}</span>
                    </div>
                  </div>
                  {!selectedCustomer ? (
                    <div className="mt-2 text-neutral-600">Pick a customer to auto-calc totals.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 print-compact-content">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-black/40 p-1 font-semibold text-center">Date</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Ash Pallet Ref #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Trailer #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Customer Ref #</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 #1</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 #2</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">48x40 Total</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Large Odd</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Small Odd</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Baled OCC</th>
                    <th className="border border-black/40 p-1 font-semibold text-center">Total ($)</th>
                    <th className="no-print border border-black/40 p-1 font-semibold text-center"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const { totalQty48, total } = calcRow(r);
                    return (
                      <tr key={idx}>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.date}
                            onChange={(e) => updateRow(idx, "date", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.ashRef}
                            onChange={(e) => updateRow(idx, "ashRef", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.trailer}
                            onChange={(e) => updateRow(idx, "trailer", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5">
                          <input
                            className="w-full bg-transparent outline-none"
                            value={r.custRef}
                            onChange={(e) => updateRow(idx, "custRef", e.target.value)}
                          />
                        </td>

                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.qty48x40_1}
                            onChange={(e) => updateRow(idx, "qty48x40_1", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.qty48x40_2}
                            onChange={(e) => updateRow(idx, "qty48x40_2", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right tabular-nums">
                          {totalQty48 ? totalQty48 : ""}
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.largeOdd}
                            onChange={(e) => updateRow(idx, "largeOdd", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.smallOdd}
                            onChange={(e) => updateRow(idx, "smallOdd", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right">
                          <input
                            className="w-full bg-transparent outline-none text-right"
                            value={r.baledOcc}
                            onChange={(e) => updateRow(idx, "baledOcc", e.target.value)}
                          />
                        </td>
                        <td className="border border-black/40 p-0.5 text-right tabular-nums">
                          {total > 0 ? money(total) : ""}
                        </td>
                        <td className="no-print border border-black/40 p-0.5 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-black/10 bg-white/70 px-2 py-1 text-[10px] hover:bg-white"
                            onClick={() => clearRow(idx)}
                            title="Clear row"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  <tr>
                    <td className="border border-black/40 p-0.5" colSpan={4}>
                      <div className="text-right font-semibold pr-2">Totals</div>
                    </td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t1 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t2 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.t48 || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tLarge || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tSmall || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">{totals.tOcc || ""}</td>
                    <td className="border border-black/40 p-0.5 text-right font-semibold">
                      {totals.grand ? money(totals.grand) : ""}
                    </td>
                    <td className="no-print border border-black/40 p-0.5" />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-black/40 pb-1">
                  <div className="text-sm font-semibold">Invoice total</div>
                  <div className="text-sm font-extrabold tabular-nums">{money(totals.grand)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
