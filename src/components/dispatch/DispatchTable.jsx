import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
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

export default function DispatchTable({
  logs,
  onUpdate,
  onDelete,
  onReorder,
  showDate = false,
  reorderEnabled = true,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [localLogs, setLocalLogs] = useState(() => (Array.isArray(logs) ? logs : []));

  useEffect(() => {
    setLocalLogs(Array.isArray(logs) ? logs : []);
  }, [logs]);

  const getRowStatus = (log) => {
    const deliveredVal = String(log.delivered_by ?? "").trim().toLowerCase();

    if (deliveredVal === "no") return "not_delivered";
    if (deliveredVal) return "dispatched";
    if (log.trailer_number && String(log.trailer_number).trim()) return "loaded";
    return "pending";
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "dispatched":
        return "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500";
      case "not_delivered":
        // Light blue fill when Delivered = No
        return "bg-gradient-to-r from-sky-50 to-sky-100 border-l-4 border-l-sky-500";
      case "loaded":
        return "bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-l-emerald-500";
      default:
        return "bg-white border-l-4 border-l-slate-200";
    }
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    setEditData({ ...log });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    await onUpdate(editingId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const baseColumns = useMemo(
    () => [
      { key: "__move__", label: "", width: "w-10" },
      { key: "company", label: "Company", width: "w-40" },
      { key: "trailer_number", label: "Trailer #", width: "w-28" },
      { key: "notes", label: "Notes", width: "flex-1" },
      { key: "dock_hours", label: "Dock Hrs", width: "w-28" },
      { key: "eta", label: "ETA", width: "w-32" },
      { key: "bol", label: "BOL", width: "w-28" },
      { key: "item", label: "Item", width: "w-24" },
      { key: "delivered_by", label: "Delivered", width: "w-28" },
    ],
    []
  );

  const columns = showDate
    ? [{ key: "date", label: "Date", width: "w-28" }, ...baseColumns]
    : baseColumns;

  const handleDragEnd = (result) => {
    if (!result?.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;

    setLocalLogs((prev) => {
      const next = reorder(prev, src, dst);
      if (typeof onReorder === "function") {
        onReorder(next);
      }
      return next;
    });
  };

  const dragDisabled = !reorderEnabled || Boolean(editingId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white">
        <div className="flex items-center px-4 py-3 gap-2">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                col.width,
                col.key === "__move__" && "text-slate-300 select-none"
              )}
            >
              {col.label}
            </div>
          ))}
          <div className="w-28 text-right">Actions</div>
        </div>
      </div>

      {/* Body */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dispatch-table">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {localLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No entries found. Add your first entry above.
                </div>
              ) : (
                localLogs.map((log, index) => {
                  const status = getRowStatus(log);
                  const isEditing = editingId === log.id;

                  return (
                    <Draggable
                      key={String(log.id)}
                      draggableId={String(log.id)}
                      index={index}
                      isDragDisabled={dragDisabled}
                    >
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          onClick={() => !isEditing && startEdit(log)}
                          className={cn(
                            "flex items-center px-4 py-3 gap-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                            getStatusStyles(status),
                            isEditing && "cursor-default",
                            snapshot.isDragging && "shadow-lg ring-2 ring-slate-300"
                          )}
                        >
                          {columns.map((col) => {
                            if (col.key === "__move__") {
                              return (
                                <div key={col.key} className={cn(col.width)}>
                                  <button
                                    type="button"
                                    title={
                                      reorderEnabled
                                        ? editingId
                                          ? "Finish editing to reorder"
                                          : "Drag to reorder"
                                        : "Reordering disabled"
                                    }
                                    className={cn(
                                      "h-8 w-8 inline-flex items-center justify-center rounded-md",
                                      reorderEnabled && !editingId
                                        ? "text-slate-500 hover:bg-slate-100"
                                        : "text-slate-300 cursor-not-allowed"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div key={col.key} className={cn(col.width)}>
                                {isEditing ? (
                                  col.key === "date" ? (
                                    <div className="text-sm text-slate-600">
                                      {log.date ? format(new Date(log.date), "MM/dd") : "-"}
                                    </div>
                                  ) : (
                                    <Input
                                      value={editData[col.key] || ""}
                                      onChange={(e) => handleChange(col.key, e.target.value)}
                                      className="h-9"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )
                                ) : col.key === "date" ? (
                                  <div className="text-sm text-slate-600">
                                    {log.date ? format(new Date(log.date), "MM/dd") : "-"}
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-700 truncate">
                                    {log[col.key] || "-"}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Actions */}
                          <div className="w-28 flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEdit();
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEdit();
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(log);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(log.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
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

      {!reorderEnabled ? (
        <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">
          Reordering is disabled while searching. Clear the search box to drag rows.
        </div>
      ) : null}
    </div>
  );
}
