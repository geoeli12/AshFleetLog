import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Check, X, Copy, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

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
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

// ✅ STATUS LOGIC (MATCH DISPATCH)
const getRowStatus = (log) => {
  const driver = String(log.driver ?? "").trim().toLowerCase();

  if (driver === "no") return "not_picked";
  if (driver) return "picked"; // 🔥 RED
  return "pending";
};

const getStatusStyles = (status) => {
  switch (status) {
    case "picked":
      return "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500";
    case "not_picked":
      return "bg-gradient-to-r from-sky-50 to-sky-100 border-l-4 border-l-sky-500";
    default:
      return "bg-white border-l-4 border-l-slate-200";
  }
};

export default function PickupTable({
  viewDate,
  logs,
  onUpdate,
  onDelete,
  onCopy,
  onMoveRow
}) {

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [localLogs, setLocalLogs] = useState([]);

  useEffect(() => {
    setLocalLogs(Array.isArray(logs) ? logs : []);
  }, [logs]);

  // AUTO FOCUS
  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        const el = document.querySelector(".pickup-row input");
        el?.focus();
      }, 0);
    }
  }, [editingId]);

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

    const driver = (next.driver ?? "").trim();
    const viewYmd = normalizeYMD(viewDate);

    if (driver) {
      next.driver = driver;
      next.date_picked_up = viewYmd;
    } else {
      next.driver = "";
      next.date_picked_up = null;
    }

    await onUpdate(editingId, next);

    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // KEYBOARD NAV
  const handleKeyNav = (e) => {
    const row = e.target.closest(".pickup-row");
    if (!row) return;

    const inputs = Array.from(row.querySelectorAll("input"));
    const i = inputs.indexOf(e.target);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      inputs[i + 1]?.focus();
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      inputs[i - 1]?.focus();
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const next = inputs[i + (e.shiftKey ? -1 : 1)];
      next?.focus();
    }

    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    }
  };

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

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newOrder = reorder(
      localLogs,
      result.source.index,
      result.destination.index
    );

    setLocalLogs(newOrder);
    onMoveRow?.(newOrder);
  };

  const dragDisabled = Boolean(editingId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">

      {/* HEADER */}
      <div className="bg-slate-800 text-white">
        <div className="flex items-center px-4 py-3 gap-2 w-full">
          {columns.map((col) => (
            <div key={col.key} className={cn("text-xs font-semibold uppercase truncate", col.width)}>
              {col.label}
            </div>
          ))}
          <div className="w-[10%] text-xs font-semibold uppercase text-center">
            Actions
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="pickup-table">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-slate-100">

              {localLogs.length === 0 ? (
                <div className="px-4 py-12 text-center text-slate-400">
                  No pick ups yet. Add your first entry above.
                </div>
              ) : (
                localLogs.map((log, index) => {
                  const isEditing = editingId === log.id;
                  const status = getRowStatus(log);

                  return (
                    <Draggable
                      key={log.id}
                      draggableId={String(log.id)}
                      index={index}
                      isDragDisabled={dragDisabled}
                    >
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            "pickup-row flex items-center px-4 py-3 gap-2 transition-all cursor-pointer",
                            getStatusStyles(status),
                            snapshot.isDragging && "shadow-lg ring-2 ring-slate-300"
                          )}
                          onClick={() => !isEditing && startEdit(log)}
                        >

                          {columns.map((col) => {

                            if (col.key === "drag") {
                              return (
                                <div
                                  key={col.key}
                                  {...(dragDisabled ? {} : dragProvided.dragHandleProps)}
                                  className={col.width}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-4 w-4 text-slate-400" />
                                </div>
                              );
                            }

                            if (col.key === "days_open") {
                              const days = daysBetween(
                                log.date_called_out,
                                normalizeYMD(viewDate)
                              );
                              return <div key={col.key} className={col.width}>{days || "-"}</div>;
                            }

                            return (
                              <div key={col.key} className={col.width}>
                                {isEditing ? (
                                  <Input
                                    value={editData[col.key] || ""}
                                    onChange={(e) => handleChange(col.key, e.target.value)}
                                    onKeyDown={handleKeyNav}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8"
                                  />
                                ) : (
                                  <div className="truncate">{log[col.key] || "-"}</div>
                                )}
                              </div>
                            );
                          })}

                          <div className="w-[10%] flex gap-1 justify-center">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); startEdit(log); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onCopy?.(log); }}>
                                  <Copy className="h-4 w-4 text-sky-600" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(log.id); }}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>

                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

    </div>
  );
}