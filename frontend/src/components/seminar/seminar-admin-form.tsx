"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  createSeminarSession,
  type CreateSeminarPayload,
  getAllSeminarSessions,
  type SeminarSessionDto,
  updateSeminarSession,
} from "@/lib/api";

const EMPTY_FORM: CreateSeminarPayload = {
  title: "",
  description: "",
  host_name: "",
  host_role: "",
  host_company: "",
  host_linkedin: "",
  host_image_url: "",
  date_time: "",
  duration_minutes: 90,
  venue: "",
  spots_total: 15,
  spots_remaining: 15,
  price_inr: 399,
  razorpay_link: "",
  banner_image_url: "",
  tags: [],
  status: "live",
};

type Field = keyof CreateSeminarPayload;

export function SeminarAdminForm() {
  const [form, setForm] = useState<CreateSeminarPayload>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SeminarSessionDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [sessions],
  );

  useEffect(() => {
    void refreshAll();
  }, []);

  async function refreshAll() {
    const data = await getAllSeminarSessions();
    setSessions(data.sessions);
  }

  function setField<K extends Field>(field: K, value: CreateSeminarPayload[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTagFromInput() {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  function hydrateFromSession(s: SeminarSessionDto) {
    setShowForm(true);
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description,
      host_name: s.host_name,
      host_role: s.host_role,
      host_company: s.host_company,
      host_linkedin: s.host_linkedin,
      host_image_url: s.host_image_url ?? "",
      date_time: s.date_time.slice(0, 16),
      duration_minutes: s.duration_minutes,
      venue: s.venue,
      spots_total: s.spots_total,
      spots_remaining: s.spots_remaining,
      price_inr: s.price_inr,
      razorpay_link: s.razorpay_link,
      banner_image_url: s.banner_image_url ?? "",
      tags: s.tags ?? [],
      status: s.status,
    });
    setMessage(`Loaded "${s.title}" for editing.`);
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await updateSeminarSession(editingId, form);
        setMessage("Session updated.");
      } else {
        await createSeminarSession(form);
        setMessage("Session created.");
      }
      await refreshAll();
      setShowForm(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onPreview() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await createSeminarSession({ ...form, status: "live" });
      setMessage(`Preview created live: ${result.seminar.title}`);
      await refreshAll();
      setShowForm(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-lc-bg px-4 py-8 text-lc-text md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-lc-border bg-lc-surface p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Seminar Admin</h1>
              <p className="mt-1 text-sm text-lc-muted">
                Dev-only panel. Create or edit sessions that appear on `/seminar`.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/seminar"
                className="rounded-md border border-lc-border px-3 py-2 text-xs uppercase tracking-wide text-lc-muted hover:text-lc-text"
              >
                Open seminar tab
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setShowForm((v) => !v);
                }}
                className="rounded-md bg-lc-orange px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:bg-lc-orangeHover"
              >
                {showForm ? "Close form" : "Add new seminar"}
              </button>
            </div>
          </div>

          {showForm ? (
            <>
              <div className="mt-5 grid gap-3">
                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Title</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                  />
                </label>
                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Description</span>
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Date/time</span>
                    <input
                      type="datetime-local"
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.date_time}
                      onChange={(e) => setField("date_time", e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Duration (mins)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.duration_minutes}
                      onChange={(e) => setField("duration_minutes", Number(e.target.value) || 0)}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Host name</span>
                    <input
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.host_name}
                      onChange={(e) => setField("host_name", e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Host role</span>
                    <input
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.host_role}
                      onChange={(e) => setField("host_role", e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Host company</span>
                    <input
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.host_company}
                      onChange={(e) => setField("host_company", e.target.value)}
                    />
                  </label>
                </div>

                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Host LinkedIn URL</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.host_linkedin}
                    onChange={(e) => setField("host_linkedin", e.target.value)}
                  />
                </label>
                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Host image URL</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.host_image_url ?? ""}
                    onChange={(e) => setField("host_image_url", e.target.value)}
                  />
                </label>
                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Banner image URL</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.banner_image_url ?? ""}
                    onChange={(e) => setField("banner_image_url", e.target.value)}
                  />
                </label>
                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Venue</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.venue}
                    onChange={(e) => setField("venue", e.target.value)}
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Spots total</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.spots_total}
                      onChange={(e) => setField("spots_total", Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Spots remaining</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.spots_remaining}
                      onChange={(e) => setField("spots_remaining", Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="text-xs text-lc-muted">
                    <span className="mb-1 block">Price (INR)</span>
                    <input
                      type="number"
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={form.price_inr}
                      onChange={(e) => setField("price_inr", Number(e.target.value) || 0)}
                    />
                  </label>
                </div>

                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Razorpay link</span>
                  <input
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.razorpay_link}
                    onChange={(e) => setField("razorpay_link", e.target.value)}
                  />
                </label>

                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Status</span>
                  <select
                    className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) =>
                      setField(
                        "status",
                        e.target.value as "draft" | "live" | "full" | "completed",
                      )
                    }
                  >
                    <option value="draft">draft</option>
                    <option value="live">live</option>
                    <option value="full">full</option>
                    <option value="completed">completed</option>
                  </select>
                </label>

                <label className="text-xs text-lc-muted">
                  <span className="mb-1 block">Tags</span>
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-sm"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTagFromInput();
                        }
                      }}
                      placeholder="Type and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addTagFromInput}
                      className="rounded-md border border-lc-border px-3 py-2 text-xs uppercase tracking-wide text-lc-muted hover:text-lc-text"
                    >
                      Add
                    </button>
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full border border-lc-border px-3 py-1 text-xs text-lc-muted hover:text-lc-text"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving}
                  className="rounded-md bg-lc-orange px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black disabled:opacity-50"
                >
                  {editingId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => void onPreview()}
                  disabled={saving}
                  className="rounded-md border border-lc-border px-3 py-2 text-xs uppercase tracking-wide text-lc-muted disabled:opacity-50"
                >
                  Preview (set live)
                </button>
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-lc-muted">
              Click <span className="font-medium text-lc-text">Add new seminar</span> to open the form.
            </p>
          )}

          {message ? <p className="mt-3 text-sm text-lc-orange">{message}</p> : null}
        </section>

        <section className="rounded-xl border border-lc-border bg-lc-surface p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All seminars</h2>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="rounded-md border border-lc-border px-3 py-1.5 text-xs uppercase tracking-wide text-lc-muted hover:text-lc-text"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            {sortedSessions.length === 0 ? (
              <p className="text-sm text-lc-muted">No sessions yet.</p>
            ) : (
              sortedSessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-lc-border bg-lc-bg px-3 py-2 text-left hover:border-lc-orange/50"
                  onClick={() => hydrateFromSession(s)}
                >
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-0.5 text-xs text-lc-muted">
                      {new Date(s.date_time).toLocaleString()} · ₹{s.price_inr}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase ${
                      s.status === "live"
                        ? "border-emerald-500/50 text-emerald-400"
                        : s.status === "full"
                          ? "border-red-500/50 text-red-400"
                          : "border-lc-border text-lc-muted"
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
