"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

type Reminder = {
  occurrence_id: number;
  task_id: number;
  title: string;
  notes: string;
  due_date: string;
  due_day_of_month: number;
  is_done: boolean;
  is_active: boolean;
};

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [month, setMonth] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDay, setDueDay] = useState(1);

  async function load() {
    setLoading(true);
    setError("");
    setSaveStatus("");
    try {
      const payload = await apiGet("/reminders/monthly");
      setMonth(payload?.month || "");
      setReminders(payload?.reminders || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    setError("");
    setSaveStatus("");
    try {
      await apiPost("/reminders/tasks", {
        title,
        notes,
        due_day_of_month: Number(dueDay || 0)
      });
      setTitle("");
      setNotes("");
      setDueDay(1);
      setSaveStatus("Reminder task created.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to create reminder.");
    }
  }

  async function toggleDone(item: Reminder, checked: boolean) {
    setError("");
    try {
      await apiPost(`/reminders/occurrences/${item.occurrence_id}/done`, { is_done: checked });
      setReminders((prev) =>
        prev.map((r) => (r.occurrence_id === item.occurrence_id ? { ...r, is_done: checked } : r))
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update reminder.");
    }
  }

  async function removeThisMonth(item: Reminder) {
    setError("");
    const ok = window.confirm(`Remove this month's reminder for "${item.title}"?`);
    if (!ok) return;
    try {
      await apiDelete(`/reminders/occurrences/${item.occurrence_id}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to remove this month reminder.");
    }
  }

  async function deleteRecurring(item: Reminder) {
    setError("");
    const ok = window.confirm(
      `Delete recurring task "${item.title}" permanently? This removes all its reminders.`
    );
    if (!ok) return;
    try {
      await apiDelete(`/reminders/tasks/${item.task_id}`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to delete recurring reminder.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Reminders</div>
        <div className="subtle">Create monthly task reminders, mark them done, or remove them.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <label>
            Task:&nbsp;
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Electricity bill"
            />
          </label>
          <label>
            Due day:&nbsp;
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value || 0))}
            />
          </label>
          <label>
            Notes:&nbsp;
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <button className="button" type="button" onClick={createReminder}>
            Create
          </button>
          {saveStatus ? <span className="meta">{saveStatus}</span> : null}
        </div>
      </div>

      <div className="card">
        <span className="meta">Current month: {month || "-"}</span>
      </div>

      {loading ? (
        <div className="meta">Loading...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Done</th>
                <th>Task</th>
                <th>Due Date</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reminders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="meta">
                    No reminders for current month.
                  </td>
                </tr>
              ) : null}
              {reminders.map((item) => (
                <tr key={item.occurrence_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={(e) => toggleDone(item, e.currentTarget.checked)}
                    />
                  </td>
                  <td>{item.title}</td>
                  <td>{item.due_date}</td>
                  <td>{item.notes || "--"}</td>
                  <td>
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                      <button className="button" type="button" onClick={() => removeThisMonth(item)}>
                        Remove This Month
                      </button>
                      <button className="button" type="button" onClick={() => deleteRecurring(item)}>
                        Delete Recurring
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
