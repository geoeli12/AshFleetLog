import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { toast } from "sonner";

function parseYMDToLocalDate(ymd) {
  if (!ymd) return new Date();
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  return new Date(y, m - 1, d);
}

function toYMD(value) {
  if (!value) return "";
  const d = new Date(value);
  return format(d, "yyyy-MM-dd");
}

export default function BrokenTrailerPage() {

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [region, setRegion] = useState("IL");

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["brokenTrailers"],
    queryFn: async () => {
      try {
        const res = await api.entities.brokenTrailers.list("-date");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (e) {
        toast.error("Failed to load trailers");
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.brokenTrailers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokenTrailers"] });
      toast.success("Added");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.brokenTrailers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokenTrailers"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.brokenTrailers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokenTrailers"] });
    }
  });

  const filtered = useMemo(() => {
    return (data || []).filter(r => {
      if (toYMD(r.date) !== selectedDate) return false;
      if (region && r.region !== region) return false;

      if (!searchTerm) return true;

      const s = searchTerm.toLowerCase();

      return (
        r.trailer_number?.toLowerCase().includes(s) ||
        r.issue?.toLowerCase().includes(s) ||
        r.reported_by?.toLowerCase().includes(s) ||
        r.customer?.toLowerCase().includes(s)
      );
    });
  }, [data, selectedDate, searchTerm, region]);

  return (
    <div className="min-h-screen">

      {/* HEADER */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-xl">
            <Truck className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Broken Trailers</h1>
            <p className="text-sm text-slate-500">Track trailer issues</p>
          </div>
        </div>

        <Button onClick={refetch}>
          <RefreshCw className="h-4 w-4" />
        </Button>

      </header>

      {/* MAIN */}
      <main className="p-6 space-y-6">

        {/* CONTROLS */}
        <div className="flex justify-between items-center">

          {/* REGION */}
          <div className="flex gap-2">
            <Button
              variant={region === "IL" ? "default" : "outline"}
              onClick={() => setRegion("IL")}
            >IL</Button>

            <Button
              variant={region === "PA" ? "default" : "outline"}
              onClick={() => setRegion("PA")}
            >PA</Button>
          </div>

          {/* DATE PICKER */}
          <div className="flex items-center gap-2">
            <Button onClick={() => {
              const d = subDays(parseYMDToLocalDate(selectedDate), 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}>
              <ChevronLeft />
            </Button>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <Button onClick={() => {
              const d = addDays(parseYMDToLocalDate(selectedDate), 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}>
              <ChevronRight />
            </Button>
          </div>

          {/* SEARCH */}
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-60"
          />

        </div>

        {/* ADD FORM */}
        <div className="bg-white p-4 rounded-xl border space-y-2">

          <Input placeholder="Trailer #" id="trailer" />
          <Input placeholder="Issue" id="issue" />
          <Input placeholder="Reported By" id="reported" />
          <Input placeholder="Customer" id="customer" />
          <Input placeholder="Status" id="status" />
          <Input type="date" id="fixedDate" />
          <Input placeholder="Notes" id="notes" />

          {/* FILE UPLOAD */}
          <Input type="file" id="fileUpload" multiple />

          <Button
            onClick={async () => {

              const fileInput = document.getElementById("fileUpload");
              const files = fileInput.files;

              const uploadedFiles = [];

              for (let f of files) {
                const res = await api.uploadFile(f);
                uploadedFiles.push(res.url);
              }

              await createMutation.mutateAsync({
                trailer_number: document.getElementById("trailer").value,
                issue: document.getElementById("issue").value,
                reported_by: document.getElementById("reported").value,
                customer: document.getElementById("customer").value,
                status: document.getElementById("status").value,
                fixed_date: document.getElementById("fixedDate").value,
                notes: document.getElementById("notes").value,
                region,
                date: selectedDate,
                attachments: uploadedFiles
              });

            }}
          >
            Add Trailer Issue
          </Button>

        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border">

          {isLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : (
            filtered.map(row => (
              <div key={row.id} className="border-b p-3">

                <div className="font-semibold">
                  {row.trailer_number} - {row.issue}
                </div>

                <div className="text-sm text-slate-500">
                  {row.customer} | {row.reported_by}
                </div>

                <div className="text-xs">
                  Status: {row.status} | Fixed: {row.fixed_date}
                </div>

                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() =>
                    updateMutation.mutate({ id: row.id, data: { status: "fixed" } })
                  }>
                    Mark Fixed
                  </Button>

                  <Button size="sm" onClick={() =>
                    deleteMutation.mutate(row.id)
                  }>
                    Delete
                  </Button>
                </div>

              </div>
            ))
          )}

        </div>

      </main>
    </div>
  );
}