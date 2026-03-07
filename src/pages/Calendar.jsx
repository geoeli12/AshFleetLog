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
  // Highest -> lowest: pto, absent, late, present
  const rank = { pto: 4, absent: 3, late: 2, present: 1 };
  const a = rank[existing] || 0;
  const b = rank[next] || 0;
  return b >= a ? next : existing;
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

function noteFromShift(shift) {
  const u = shift?.unit_number;
  if (typeof u === "string" && u.trim().toUpperCase().startsWith("NOTE:")) {
    return u.replace(/^NOTE:\s*/i, "");
  }
  return "";
}

export default function Calendar() {
  const [selectedDay, setSelectedDay] = useState(null); // Date
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayRecords, setDayRecords] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.entities.Driver.filter({ status: "active" }, "name"),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["allShifts"],
    queryFn: () => api.entities.Shift.list("-created_date"),
  });

  const employees = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    return list
      .filter((d) => d && d.name)
      .map((d) => ({
        id: String(d.id ?? d.employee_id ?? d.name),
        name: String(d.name),
        // we don't truly have dept in this app; keep compatibility with the Base44 UI
        department: d.state ? String(d.state) : "",
      }));
  }, [drivers]);

  const completedShifts = useMemo(() => {
    return (Array.isArray(shifts) ? shifts : []).filter(
      (s) => (s?.status || "").toLowerCase() === "completed"
    );
  }, [shifts]);

  // Calendar dots: one per employee per date, highest priority status wins.
  const attendance = useMemo(() => {
    const byDate = new Map(); // date -> employeeKey -> { status, employee_name }

    for (const s of completedShifts) {
      const driverName = String(s?.driver_name || s?.driver || s?.name || "").trim();
      if (!driverName) continue;

      const matched = employees.find((e) => e.name === driverName);
      const employeeKey = matched ? matched.id : driverName;

      const isPto = !!(s?.is_pto || String(s?.shift_type || "").toLowerCase() === "pto");
      const status = isPto ? "pto" : normalizeStatus(s?.attendance_status || "present");

      const baseDate = safeISODate(s?.date || s?.shift_date || s?.shiftDate || s?.shift_dt);
      const dates = Array.isArray(s?.pto_dates) && s.pto_dates.length
        ? s.pto_dates.map((d) => safeISODate(d)).filter(Boolean)
        : [baseDate];

      for (const dateStr of dates) {
        if (!dateStr) continue;
        if (!byDate.has(dateStr)) byDate.set(dateStr, new Map());
        const m = byDate.get(dateStr);
        const existing = m.get(employeeKey);
        const nextStatus = existing ? pickHigherPriority(existing.status, status) : status;
        m.set(employeeKey, {
          status: nextStatus,
          employee_name: matched ? matched.name : driverName,
        });
      }
    }

    const results = [];
    for (const [dateStr, m] of byDate.entries()) {
      const presentKeys = new Set([...m.keys()]);

      // Absent only makes sense if we have at least one record for that day.
      for (const e of employees) {
        if (!presentKeys.has(e.id)) {
          m.set(e.id, { status: "absent", employee_name: e.name });
        }
      }

      for (const [employeeKey, info] of m.entries()) {
        results.push({
          id: `${dateStr}::${employeeKey}`,
          date: dateStr,
          status: info.status,
          employee_name: info.employee_name,
        });
      }
    }

    return results;
  }, [completedShifts, employees]);

  const createShift = useMutation({
    mutationFn: async (payload) => api.entities.Shift.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["allShifts"] });
    },
  });

  const updateShift = useMutation({
    mutationFn: async ({ id, payload }) => api.entities.Shift.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["allShifts"] });
    },
  });

  const deleteShift = useMutation({
    mutationFn: async (id) => api.entities.Shift.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["allShifts"] });
    },
  });

  const handleDayClick = useCallback(
    (day) => {
      const dateStr = format(day, "yyyy-MM-dd");

      const recs = [];
      for (const s of completedShifts) {
        const driverName = String(s?.driver_name || "").trim();
        if (!driverName) continue;

        const isPto = !!(s?.is_pto || String(s?.shift_type || "").toLowerCase() === "pto");
        const status = isPto ? "pto" : normalizeStatus(s?.attendance_status || "present");

        const baseDate = safeISODate(s?.date || s?.shift_date || s?.shiftDate || s?.shift_dt);
        const dates = Array.isArray(s?.pto_dates) && s.pto_dates.length
          ? s.pto_dates.map((d) => safeISODate(d)).filter(Boolean)
          : [baseDate];

        if (!dates.includes(dateStr)) continue;

        const matched = employees.find((e) => e.name === driverName);

        recs.push({
          id: Array.isArray(s?.pto_dates) && s.pto_dates.length ? `${s.id}::${dateStr}` : String(s.id),
          _shiftId: String(s.id),
          _virtualDate: dateStr,
          _isPtoMulti: Array.isArray(s?.pto_dates) && s.pto_dates.length > 1,
          _ptoDates: Array.isArray(s?.pto_dates) ? s.pto_dates : null,

          date: dateStr,
          status,
          attendance_status: status,
          employee_id: matched ? matched.id : driverName,
          employee_name: matched ? matched.name : driverName,
          department: matched?.department || "",

          start_time: s?.start_time || "",
          end_time: s?.end_time || "",
          notes: noteFromShift(s),
        });
      }

      // Mark absent for everyone else only if the day has any records
      const hasAny = recs.length > 0;
      if (hasAny) {
        const present = new Set(recs.map((r) => String(r.employee_id)));
        for (const e of employees) {
          if (!present.has(String(e.id))) {
            recs.push({
              id: `${dateStr}::${e.id}`,
              _shiftId: null,
              _virtualDate: dateStr,
              date: dateStr,
              status: "absent",
              attendance_status: "absent",
              employee_id: e.id,
              employee_name: e.name,
              department: e.department || "",
              start_time: "",
              end_time: "",
              notes: "",
            });
          }
        }
      }

      setSelectedDay(day);
      setDayRecords(recs);
      setDayModalOpen(true);
    },
    [completedShifts, employees]
  );

  const openNewAttendance = useCallback(
    (employee) => {
      if (!selectedDay) return;
      const dateStr = format(selectedDay, "yyyy-MM-dd");
      setEditingRecord({
        isNew: true,
        _shiftId: null,
        date: dateStr,
        employee_id: employee.id,
        employee_name: employee.name,
        attendance_status: "present",
        start_time: "",
        end_time: "",
        notes: "",
      });
      setEditOpen(true);
    },
    [selectedDay]
  );

  const openEditAttendance = useCallback((record) => {
    setEditingRecord({
      isNew: false,
      ...record,
    });
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (record) => {
      if (!record?._shiftId) return;

      if (record._isPtoMulti && Array.isArray(record._ptoDates)) {
        const remaining = record._ptoDates
          .map((d) => safeISODate(d))
          .filter((d) => d && d !== record._virtualDate);
        await updateShift.mutateAsync({
          id: record._shiftId,
          payload: { pto_dates: remaining },
        });
        return;
      }

      await deleteShift.mutateAsync(record._shiftId);
    },
    [deleteShift, updateShift]
  );

  const handleSave = useCallback(
    async (form) => {
      // Map the UI Attendance record onto the existing Shift entity.
      const status = normalizeStatus(form.attendance_status);

      const payload = {
        driver_name: form.employee_name,
        date: form.date,
        status: "completed",
        attendance_status: status,
        is_pto: status === "pto",
        shift_type: status === "pto" ? "pto" : "day",
      };

      if (status === "pto") {
        payload.pto_dates = [form.date];
      } else {
        payload.pto_dates = [];
      }

      if (form.start_time) payload.start_time = form.start_time;
      if (form.end_time) payload.end_time = form.end_time;
      if (form.notes) payload.unit_number = `NOTE: ${form.notes}`;

      if (editingRecord?.isNew) {
        await createShift.mutateAsync(payload);
      } else if (editingRecord?._shiftId) {
        await updateShift.mutateAsync({ id: editingRecord._shiftId, payload });
      }

      setEditOpen(false);
      setEditingRecord(null);
    },
    [createShift, updateShift, editingRecord]
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AttendanceCalendar attendance={attendance} employees={employees} onDayClick={handleDayClick} />

        <DayDetailModal
          open={dayModalOpen}
          onOpenChange={setDayModalOpen}
          selectedDate={selectedDay}
          records={dayRecords}
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
