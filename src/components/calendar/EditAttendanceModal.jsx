import React, { useEffect, useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function isoToDate(isoLike) {
  if (!isoLike) return "";
  const s = String(isoLike);
  const d = new Date(s);
  if (isValid(d)) return format(d, "yyyy-MM-dd");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10))) return s.slice(0, 10);
  return "";
}

function isoToTime(isoLike) {
  if (!isoLike) return "";
  const d = new Date(String(isoLike));
  if (!isValid(d)) return "";
  return format(d, "HH:mm");
}

function buildDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "";
  // IMPORTANT: return a "local" date-time string (no Z) to avoid the common "day before" UTC shift.
  // Base44/Entity API typically accepts ISO-like strings.
  return `${dateStr}T${timeStr}:00`;
}

export default function EditAttendanceModal({ open, onOpenChange, employees = [], record, onSave }) {
  const employeeOptions = useMemo(() => {
    return (Array.isArray(employees) ? employees : []).map((e) => ({
      id: String(e.id),
      name: String(e.name),
    }));
  }, [employees]);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!record) return;
    setEmployeeId(String(record.employee_id ?? ""));
    setDate(String(record.date ?? isoToDate(record.start_time) ?? ""));
    setStatus(String(record.attendance_status ?? record.status ?? "present"));
    setCheckIn(isoToTime(record.start_time));
    setCheckOut(isoToTime(record.end_time));
    setNotes(String(record.notes ?? ""));
  }, [record]);

  const employeeName = useMemo(() => {
    const hit = employeeOptions.find((e) => e.id === String(employeeId));
    return hit ? hit.name : String(record?.employee_name || "");
  }, [employeeId, employeeOptions, record]);

  const canSave = !!employeeId && !!date && !!status;

  const title = record?.isNew ? "Add Attendance" : "Edit Attendance";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={String(employeeId)} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <div className="relative">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Check In</Label>
              <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check Out</Label>
              <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={String(status)} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="pto">PTO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Approved / reason / etc"
              className="min-h-[90px]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSave}
              className="bg-slate-900 hover:bg-slate-800"
              onClick={() => {
                const payload = {
                  employee_id: employeeId,
                  employee_name: employeeName,
                  date,
                  attendance_status: status,
                  start_time: buildDateTime(date, checkIn),
                  end_time: buildDateTime(date, checkOut),
                  notes: notes || "",
                };
                onSave?.(payload);
              }}
            >
              {record?.isNew ? "Add" : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
