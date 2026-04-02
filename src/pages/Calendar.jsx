import React, { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { api } from "@/api/apiClient";

import AttendanceCalendar from "@/components/calendar/AttendanceCalendar";
import DayDetailModal from "@/components/calendar/DayDetailModal";
import EditAttendanceModal from "@/components/calendar/EditAttendanceModal";

function normalizeStatus(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "pto") return "pto";
  if (s === "absent" || s === "a") return "absent";
  if (s === "late" || s === "l") return "late";
  if (s === "present" || s === "p" || !s) return "present";
  return s;
}

function pickHigherPriority(existing, next) {
  const rank = { pto: 4, absent: 3, late: 2, present: 1 };
  return (rank[next] || 0) >= (rank[existing] || 0) ? next : existing;
}

function safeISODate(value) {
  if (!value) return "";
  const s = String(value);
  const iso = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(s);
  if (isValid(d)) return format(d, "yyyy-MM-dd");
  return "";
}

export default function Calendar() {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const queryClient = useQueryClient();

  // 🔹 Drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.entities.Driver.filter({ active: true }, "name"),
  });

  // 🔹 Shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ["allShifts"],
    queryFn: () => api.entities.Shift.list("-created_date"),
  });

  const employees = useMemo(() => {
    return (Array.isArray(drivers) ? drivers : [])
      .filter((d) => d?.name)
      .map((d) => ({
        id: String(d.id ?? d.employee_id ?? d.name),
        name: String(d.name),
        department: d.state ? String(d.state) : "",
      }));
  }, [drivers]);

  const completedShifts = useMemo(() => {
    return (Array.isArray(shifts) ? shifts : []).filter(
      (s) => (s?.status || "").toLowerCase() === "completed"
    );
  }, [shifts]);

  // 🔥 CALENDAR DOTS (unchanged logic)
  const attendance = useMemo(() => {
    const byDate = new Map();

    for (const s of completedShifts) {
      const driverName = String(s?.driver_name || "").trim();
      if (!driverName) continue;

      const matched = employees.find((e) => e.name === driverName);
      const key = matched ? matched.id : driverName;

      const isPto = !!(s?.is_pto || s?.shift_type === "pto");
      const status = isPto ? "pto" : normalizeStatus(s?.attendance_status);

      const baseDate = safeISODate(s?.date || s?.shift_date);
      const dates = Array.isArray(s?.pto_dates) && s.pto_dates.length
        ? s.pto_dates.map((d) => safeISODate(d))
        : [baseDate];

      for (const dateStr of dates) {
        if (!dateStr) continue;

        if (!byDate.has(dateStr)) byDate.set(dateStr, new Map());

        const map = byDate.get(dateStr);
        const existing = map.get(key);

        const finalStatus = existing
          ? pickHigherPriority(existing.status, status)
          : status;

        map.set(key, {
          status: finalStatus,
          employee_name: matched?.name || driverName,
        });
      }
    }

    const result = [];

    for (const [dateStr, map] of byDate.entries()) {
      for (const [key, val] of map.entries()) {
        result.push({
          id: `${dateStr}::${key}`,
          date: dateStr,
          status: val.status,
          employee_name: val.employee_name,
        });
      }
    }

    return result;
  }, [completedShifts, employees]);

  // 🔥 DAY RECORDS (FIXED — NO STATE)
  const dayRecords = useMemo(() => {
    if (!selectedDay) return [];

    const dateStr = format(selectedDay, "yyyy-MM-dd");

    return completedShifts
      .filter((s) => {
        const baseDate = safeISODate(s?.date || s?.shift_date);
        const dates = Array.isArray(s?.pto_dates) && s.pto_dates.length
          ? s.pto_dates.map((d) => safeISODate(d))
          : [baseDate];

        return dates.includes(dateStr);
      })
      .map((s) => {
        const matched = employees.find((e) => e.name === s.driver_name);

        const status = s.is_pto
          ? "pto"
          : normalizeStatus(s.attendance_status);

        return {
          id: String(s.id),
          _shiftId: String(s.id),
          date: dateStr,
          status,
          employee_name: matched?.name || s.driver_name,
          department: matched?.department || "",
          start_time: s.start_time || "",
          end_time: s.end_time || "",
          notes: s.attendance_notes || "",
        };
      });
  }, [selectedDay, completedShifts, employees]);

  // 🔹 MUTATIONS
  const createShift = useMutation({
    mutationFn: (payload) => api.entities.Shift.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allShifts"] }),
  });

  const updateShift = useMutation({
    mutationFn: ({ id, payload }) => api.entities.Shift.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allShifts"] }),
  });

  const deleteShift = useMutation({
    mutationFn: (id) => api.entities.Shift.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allShifts"] }),
  });

  // 🔥 CLICK DAY
  const handleDayClick = useCallback((day) => {
    setSelectedDay(day);
    setDayModalOpen(true);
  }, []);

  // 🔹 NEW ATTENDANCE
  const openNewAttendance = useCallback((employee) => {
    if (!selectedDay) return;

    setEditingRecord({
      isNew: true,
      date: format(selectedDay, "yyyy-MM-dd"),
      employee_id: employee.id,
      employee_name: employee.name,
      attendance_status: "present",
      start_time: "",
      end_time: "",
      notes: "",
    });

    setEditOpen(true);
  }, [selectedDay]);

  // 🔹 EDIT
  const openEditAttendance = useCallback((record) => {
    setEditingRecord({ ...record, isNew: false });
    setEditOpen(true);
  }, []);

  // 🔹 DELETE
  const handleDelete = useCallback(async (record) => {
    if (!record?._shiftId) return;
    await deleteShift.mutateAsync(record._shiftId);
  }, [deleteShift]);

  // 🔥 SAVE (clean + instant UI update)
  const handleSave = useCallback(async (form) => {
    const status = normalizeStatus(form.attendance_status);

    const payload = {
      driver_name: form.employee_name,
      date: form.date,
      status: "completed",
      attendance_status: status,
      is_pto: status === "pto",
      shift_type: status === "pto" ? "pto" : "day",
      pto_dates: status === "pto" ? [form.date] : [],
      start_time: form.start_time || "",
      end_time: form.end_time || "",
      attendance_notes: form.notes || "",
    };

    const existing = shifts.find(s =>
      String(s.driver_name).trim() === form.employee_name &&
      safeISODate(s.date || s.shift_date) === form.date
    );

    if (existing) {
      await updateShift.mutateAsync({ id: existing.id, payload });
    } else {
      await createShift.mutateAsync(payload);
    }

    setEditOpen(false);
    setEditingRecord(null);
  }, [shifts, createShift, updateShift]);

  return (
    <div className="w-full">
      <div className="px-6 py-8">
        <AttendanceCalendar
          attendance={attendance}
          employees={employees}
          onDayClick={handleDayClick}
        />

        <DayDetailModal
          open={dayModalOpen}
          onOpenChange={setDayModalOpen}
          selectedDate={selectedDay}
          records={dayRecords} // 🔥 always fresh now
          employees={employees}
          onMarkAttendance={openNewAttendance}
          onEdit={openEditAttendance}
          onDelete={handleDelete}
        />

        <EditAttendanceModal
          open={editOpen}
          onOpenChange={setEditOpen}
          employees={employees}
          record={editingRecord}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}