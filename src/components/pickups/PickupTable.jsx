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
  } catch {
    // ignore
  }
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

  const columns = useMemo(
    () => [
      { key: "drag", label: "", width: "w-12 shrink-0" },
      { key: "company", label: "Company", width: "w-[18%] min-w-[220px]" },
      { key: "dk_trl", label: "Dk/TRL#", width: "w-[12%] min-w-[140px]" },
      { key: "location", label: "Location", width: "w-[26%] min-w-[260px]" },
      { key: "eta", label: "ETA", width: "w-[10%] min-w-[120px]" },
      { key: "days_open", label: "Days old", width: "w-24 shrink-0 text-center" },
      { key: "shift_code", label: "Type", width: "w-24 shrink-0 text-center" },
      { key: "driver", label: "Driver", width: "w-[12%] min-w-[150px]" },
      { key: "notes", label: "Notes", width: "w-[16%] min-w-[180px]" },
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="w-full overflow-x-auto">
        <div className="w-full min-w-[1360px]">
          <div className="bg-slate-800 text-white">
            <div className="flex items-center px-4 py-3 gap-3">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis truncate",
                    col.width
                  )}
                >
                  {col.label}
                </div>
              ))}
              <div className="w-36 shrink-0 pr-2 text-xs font-semibold uppercase tracking-wider text-center">
                Actions
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-400">No pick ups yet. Add your first entry above.</div>
            ) : (
              logs.map((log) => {
                const isEditing = editingId === log.id;
                const viewDateYmd = normalizeYMD(viewDate || "");
                const pickedYmd = normalizeYMD(log.date_picked_up);
                const endForDays = pickedYmd && viewDateYmd && viewDateYmd >= pickedYmd ? pickedYmd : viewDateYmd;
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
                    onDragOver={(e) => {
                      if (!draggedId || String(draggedId) === String(log.id)) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const activeId = e.dataTransfer.getData("text/plain") || draggedId;
                      if (activeId && onMoveRow) onMoveRow(activeId, log.id);
                      setDraggedId(null);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => !isEditing && startEdit(log)}
                    className={cn(
                      "flex items-center px-4 py-3 gap-3 transition-all duration-200 hover:shadow-md cursor-pointer",
                      getRowStyle(log, viewDateYmd),
                      draggedId && String(draggedId) === String(log.id) && "opacity-60",
                      isEditing && "cursor-default"
                    )}
                  >
                    {columns.map((col) => {
                      if (col.key === "drag") {
                        return (
                          <div key={col.key} className={cn(col.width, "flex items-center justify-center")}>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              onClick={(e) => e.stopPropagation()}
                              title="Drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      }

                      if (col.key === "days_open") {
                        return (
                          <div key={col.key} className={cn(col.width, "text-center")}>
                            <span className="text-sm font-semibold text-slate-700">{days === "" ? "-" : days}</span>
                          </div>
                        );
                      }

                      const value = log[col.key] ?? "";
                      const isCarryOverView = Boolean(pickedYmd && viewDateYmd && viewDateYmd < pickedYmd);
                      const isTypeField = col.key === "shift_code";

                      return (
                        <div key={col.key} className={cn(col.width, "overflow-hidden")}>
                          {isEditing ? (
                            isTypeField ? (
                              <select
                                value={(editData.shift_code || "").toString()}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="h-8 text-sm w-full rounded-md border border-slate-200 bg-white px-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">(blank)</option>
                                {typeOptions.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                                <option value="__ADD_NEW__">Add new…</option>
                              </select>
                            ) : (
                              <Input
                                type="text"
                                value={editData[col.key] || ""}
                                onChange={(e) => handleChange(col.key, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 text-sm w-full"
                                placeholder={col.label}
                              />
                            )
                          ) : (
                            (() => {
                              let displayValue = value;
                              if (isCarryOverView && col.key === "driver") displayValue = "";

                              return (
                                <span
                                  className="text-sm text-slate-700 block truncate whitespace-nowrap overflow-hidden"
                                  title={displayValue || ""}
                                >
                                  {displayValue ? displayValue : "-"}
                                </span>
                              );
                            })()
                          )}
                        </div>
                      );
                    })}

                    <div
                      className="w-36 shrink-0 pr-2 flex items-center justify-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditing ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8 shrink-0">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8 shrink-0">
                            <X className="h-4 w-4 text-slate-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(log)} className="h-8 w-8 shrink-0" title="Edit">
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => onCopy?.(log)} className="h-8 w-8 shrink-0" title="Copy">
                            <Copy className="h-4 w-4 text-sky-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => onDelete(log.id)} className="h-8 w-8 shrink-0" title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
