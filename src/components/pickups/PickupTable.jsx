
import React, { useMemo, useState } from "react";
import { Pencil, Trash2, Check, X, Copy, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function normalizeYMD(v) {
  if (!v) return "";
  if (typeof v === "string") return v.split("T")[0];
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function daysBetween(fromYmd, toYmd) {
  if (!fromYmd) return "";
  const a = new Date(`${fromYmd}T00:00:00`);
  const b = toYmd ? new Date(`${toYmd}T00:00:00`) : new Date();
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  const diff = Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : "";
}

const DEFAULT_TYPE_OPTIONS = ["S", "LL", "BT", "DT"];

function loadTypeOptions() {
  if (typeof window === "undefined") return DEFAULT_TYPE_OPTIONS;
  try {
    const raw = window.localStorage.getItem("pickup_types");
    const parsed = raw ? JSON.parse(raw) : null;
    const list = Array.isArray(parsed) ? parsed : [];
    const cleaned = list
      .map((x) => (x ?? "").toString().trim())
      .filter(Boolean)
      .slice(0, 25);

    const merged = Array.from(new Set([...DEFAULT_TYPE_OPTIONS, ...cleaned]));
    return merged.length ? merged : DEFAULT_TYPE_OPTIONS;
  } catch {
    return DEFAULT_TYPE_OPTIONS;
  }
}

function saveTypeOptions(opts) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("pickup_types", JSON.stringify(opts));
  } catch {}
}

export default function PickupTable({ viewDate, logs, onUpdate, onDelete, onCopy, onMoveRow }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [typeOptions, setTypeOptions] = useState(() => loadTypeOptions());
  const [draggedId, setDraggedId] = useState(null);

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditData({ ...log });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    const next = { ...editData };
    const driver = (next.driver ?? "").toString().trim();
    const viewYmd = normalizeYMD(viewDate || "");

    if (driver) {
      next.driver = driver;
      if (viewYmd) next.date_picked_up = viewYmd;
    } else {
      next.driver = "";
      next.date_picked_up = null;
    }

    await onUpdate(editingId, next);
    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (value) => {
    if (value === "__ADD_NEW__") {
      const next = (window.prompt("Add new Type (example: PU)") || "").trim();
      if (!next) return;

      setTypeOptions((prev) => {
        const merged = Array.from(new Set([...(prev || []), next]));
        saveTypeOptions(merged);
        return merged;
      });

      handleChange("shift_code", next);
      return;
    }

    handleChange("shift_code", value);
  };

  // Updated column widths so table fits page without horizontal scroll
  const columns = useMemo(
    () => [
      { key: "drag", label: "", width: "w-[4%]" },
      { key: "company", label: "Company", width: "w-[18%]" },
      { key: "dk_trl", label: "DK/TRL#", width: "w-[12%]" },
      { key: "location", label: "Location", width: "w-[24%]" },
      { key: "eta", label: "ETA", width: "w-[8%]" },
      { key: "days_open", label: "Days Old", width: "w-[8%] text-center" },
      { key: "shift_code", label: "Type", width: "w-[6%] text-center" },
      { key: "driver", label: "Driver", width: "w-[10%]" },
      { key: "notes", label: "Notes", width: "w-[10%]" },
    ],
    []
  );

  const getRowStyle = (log, viewDateYmd) => {
    const pickedYmd = normalizeYMD(log.date_picked_up);
    const endForDays = pickedYmd && viewDateYmd && viewDateYmd >= pickedYmd ? pickedYmd : viewDateYmd;
    const days = Number(daysBetween(log.date_called_out, endForDays));

    if (pickedYmd && viewDateYmd && viewDateYmd >= pickedYmd) {
      return "bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-l-emerald-500";
    }

    if (Number.isFinite(days) && days >= 10) {
      return "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500";
    }

    return "bg-white border-l-4 border-l-slate-200";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">

      {/* Header */}
      <div className="bg-slate-800 text-white">
        <div className="flex items-center px-4 py-3 gap-2 w-full">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "text-xs font-semibold uppercase tracking-wider truncate",
                col.width
              )}
            >
              {col.label}
            </div>
          ))}
          <div className="w-[10%] text-xs font-semibold uppercase text-center">
            Actions
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400">
            No pick ups yet. Add your first entry above.
          </div>
        ) : (
          logs.map((log) => {
            const isEditing = editingId === log.id;
            const viewDateYmd = normalizeYMD(viewDate || "");
            const pickedYmd = normalizeYMD(log.date_picked_up);
            const endForDays =
              pickedYmd && viewDateYmd && viewDateYmd >= pickedYmd ? pickedYmd : viewDateYmd;
            const days = daysBetween(log.date_called_out, endForDays);

            return (
              <div
                key={log.id}
                draggable={!isEditing}
                onDragStart={(e) => {
                  if (isEditing) return;
                  setDraggedId(log.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(log.id));
                }}
                onDragEnd={() => setDraggedId(null)}
                onClick={() => !isEditing && startEdit(log)}
                className={cn(
                  "flex items-center px-4 py-3 gap-2 hover:shadow-sm cursor-pointer",
                  getRowStyle(log, viewDateYmd)
                )}
              >
                {columns.map((col) => {

                  if (col.key === "drag") {
                    return (
                      <div key={col.key} className={col.width}>
                        <GripVertical className="h-4 w-4 text-slate-400" />
                      </div>
                    );
                  }

                  if (col.key === "days_open") {
                    return (
                      <div key={col.key} className={col.width}>
                        {days === "" ? "-" : days}
                      </div>
                    );
                  }

                  const value = log[col.key] ?? "";

                  return (
                    <div key={col.key} className={cn(col.width, "truncate")}>
                      {value ? value : "-"}
                    </div>
                  );
                })}

                <div className="w-[10%] flex gap-1 justify-center">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(log)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onCopy?.(log)}>
                    <Copy className="h-4 w-4 text-sky-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(log.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
