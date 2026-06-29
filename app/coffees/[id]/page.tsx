"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface BrewLog {
  id: number;
  date: string;
  brew_method?: string;
  grind_size?: string;
  dose_g?: number;
  yield_g?: number;
  time_s?: number;
  water_temp_c?: number;
  flavor_notes?: string;
  aroma?: string;
  body?: string;
  acidity?: string;
  rating?: number;
  notes?: string;
}

interface Coffee {
  id: number;
  name: string;
  url?: string;
  roaster?: string;
  origin?: string;
  region?: string;
  process?: string;
  variety?: string;
  roast_level?: string;
  date_bought?: string;
  notes?: string;
  image_url?: string;
  logs: BrewLog[];
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-amber-400" title={`${value}/10`}>
      {"★".repeat(value)}{"☆".repeat(10 - value)}
      <span className="text-stone-400 text-xs ml-1">{value}/10</span>
    </span>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-stone-400">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function CoffeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  useEffect(() => {
    fetch(`/api/coffees/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCoffee(d);
        setLoading(false);
      });
  }, [id]);

  async function deleteLog(logId: number) {
    if (!confirm("Delete this brew log?")) return;
    await fetch(`/api/coffees/${id}/logs/${logId}`, { method: "DELETE" });
    setCoffee((c) => c ? { ...c, logs: c.logs.filter((l) => l.id !== logId) } : c);
  }

  async function deleteCoffee() {
    if (!confirm("Delete this coffee and all its logs?")) return;
    setDeleting(true);
    await fetch(`/api/coffees/${id}`, { method: "DELETE" });
    router.push("/");
  }

  function onLogAdded(log: BrewLog) {
    setCoffee((c) => c ? { ...c, logs: [log, ...c.logs] } : c);
    setShowLogForm(false);
  }

  if (loading) return <div className="text-stone-400 text-center py-16">Loading…</div>;
  if (!coffee) return <div className="text-center py-16">Coffee not found.</div>;

  const avgRating = coffee.logs.filter((l) => l.rating != null).reduce((s, l) => s + l.rating!, 0) /
    (coffee.logs.filter((l) => l.rating != null).length || 1);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/" className="text-stone-400 text-sm hover:text-stone-600 mb-2 block">← All coffees</Link>
      </div>

      {coffee.image_url && (
        <div className="w-full h-80 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coffee.image_url}
            alt={coffee.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{coffee.name}</h1>
          {coffee.roaster && <p className="text-stone-500 mt-0.5">{coffee.roaster}</p>}
        </div>
        <button
          onClick={deleteCoffee}
          disabled={deleting}
          className="text-red-400 hover:text-red-600 text-sm mt-1 shrink-0"
        >
          Delete
        </button>
      </div>

      {/* Info card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {coffee.origin && <MetaBadge label="Origin" value={[coffee.origin, coffee.region].filter(Boolean).join(", ")} />}
          {coffee.process && <MetaBadge label="Process" value={coffee.process} />}
          {coffee.variety && <MetaBadge label="Variety" value={coffee.variety} />}
          {coffee.roast_level && <MetaBadge label="Roast" value={coffee.roast_level} />}
          {coffee.date_bought && <MetaBadge label="Bought" value={coffee.date_bought} />}
        </div>
        {coffee.logs.filter((l) => l.rating != null).length > 0 && (
          <div className="pt-2 border-t border-stone-100">
            <StarRating value={Math.round(avgRating)} />
            <span className="text-stone-400 text-xs ml-2">avg of {coffee.logs.filter((l) => l.rating != null).length} logs</span>
          </div>
        )}
        {coffee.notes && <p className="text-stone-500 text-sm border-t border-stone-100 pt-3">{coffee.notes}</p>}
        {coffee.url && (
          <a href={coffee.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs hover:underline block border-t border-stone-100 pt-3 truncate">
            {coffee.url}
          </a>
        )}
      </div>

      {/* Brew logs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Brew Logs</h2>
          <button
            onClick={() => setShowLogForm((v) => !v)}
            className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            {showLogForm ? "Cancel" : "+ Add Log"}
          </button>
        </div>

        {showLogForm && <BrewLogForm coffeeId={id} onSaved={onLogAdded} />}

        {coffee.logs.length === 0 && !showLogForm ? (
          <p className="text-stone-400 text-center py-8">No brew logs yet.</p>
        ) : (
          <div className="space-y-3">
            {coffee.logs.map((log) => (
              <BrewLogCard key={log.id} log={log} onDelete={() => deleteLog(log.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BrewLogCard({ log, onDelete }: { log: BrewLog; onDelete: () => void }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-medium">{log.date}</span>
          {log.brew_method && (
            <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full">{log.brew_method}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {log.rating != null && (
            <span className="text-amber-400 font-medium text-sm">★ {log.rating}/10</span>
          )}
          <button onClick={onDelete} className="text-stone-300 hover:text-red-400 text-xs transition-colors">✕</button>
        </div>
      </div>

      {/* Recipe */}
      {(log.dose_g || log.yield_g || log.time_s || log.water_temp_c || log.grind_size) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 mb-3 bg-stone-50 rounded-lg px-3 py-2">
          {log.grind_size && <span>Grind: <b>{log.grind_size}</b></span>}
          {log.dose_g && <span>Dose: <b>{log.dose_g}g</b></span>}
          {log.yield_g && <span>Yield: <b>{log.yield_g}g</b></span>}
          {log.time_s && <span>Time: <b>{log.time_s}s</b></span>}
          {log.water_temp_c && <span>Temp: <b>{log.water_temp_c}°C</b></span>}
          {log.dose_g && log.yield_g && (
            <span className="text-stone-400">Ratio 1:{(log.yield_g / log.dose_g).toFixed(1)}</span>
          )}
        </div>
      )}

      {/* Tasting */}
      {(log.flavor_notes || log.aroma || log.body || log.acidity) && (
        <div className="text-sm space-y-0.5 mb-3">
          {log.flavor_notes && <p><span className="text-stone-400">Flavor: </span>{log.flavor_notes}</p>}
          {log.aroma && <p><span className="text-stone-400">Aroma: </span>{log.aroma}</p>}
          {log.body && <p><span className="text-stone-400">Body: </span>{log.body}</p>}
          {log.acidity && <p><span className="text-stone-400">Acidity: </span>{log.acidity}</p>}
        </div>
      )}

      {log.notes && <p className="text-stone-500 text-sm">{log.notes}</p>}
    </div>
  );
}

function BrewLogForm({ coffeeId, onSaved }: { coffeeId: string; onSaved: (log: BrewLog) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    date: today, brew_method: "", grind_size: "", dose_g: "", yield_g: "",
    time_s: "", water_temp_c: "", flavor_notes: "", aroma: "", body: "", acidity: "", rating: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      dose_g: form.dose_g ? parseFloat(form.dose_g) : undefined,
      yield_g: form.yield_g ? parseFloat(form.yield_g) : undefined,
      time_s: form.time_s ? parseInt(form.time_s) : undefined,
      water_temp_c: form.water_temp_c ? parseFloat(form.water_temp_c) : undefined,
      rating: form.rating ? parseInt(form.rating) : undefined,
    };
    const res = await fetch(`/api/coffees/${coffeeId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const log = await res.json();
      onSaved(log);
    } else {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 space-y-4">
      <h3 className="font-medium text-amber-900">New Brew Log</h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date *">
          <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Brew Method">
          <input type="text" value={form.brew_method} onChange={(e) => set("brew_method", e.target.value)} placeholder="V60, Espresso, Aeropress…" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Grind Size">
          <input type="text" value={form.grind_size} onChange={(e) => set("grind_size", e.target.value)} placeholder="e.g. 24 clicks" className={inputCls} />
        </Field>
        <Field label="Dose (g)">
          <input type="number" step="0.1" value={form.dose_g} onChange={(e) => set("dose_g", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Yield (g)">
          <input type="number" step="0.1" value={form.yield_g} onChange={(e) => set("yield_g", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Time (s)">
          <input type="number" value={form.time_s} onChange={(e) => set("time_s", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Water Temp (°C)">
        <input type="number" step="0.5" value={form.water_temp_c} onChange={(e) => set("water_temp_c", e.target.value)} className={`${inputCls} max-w-[160px]`} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Flavor Notes">
          <input type="text" value={form.flavor_notes} onChange={(e) => set("flavor_notes", e.target.value)} placeholder="Chocolate, citrus, floral…" className={inputCls} />
        </Field>
        <Field label="Aroma">
          <input type="text" value={form.aroma} onChange={(e) => set("aroma", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Body">
          <input type="text" value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Light, medium, heavy" className={inputCls} />
        </Field>
        <Field label="Acidity">
          <input type="text" value={form.acidity} onChange={(e) => set("acidity", e.target.value)} placeholder="Bright, mild, low" className={inputCls} />
        </Field>
      </div>

      <Field label="Rating (1–10)">
        <div className="flex items-center gap-3">
          <input
            type="range" min="1" max="10" value={form.rating || 7}
            onChange={(e) => set("rating", e.target.value)}
            className="flex-1"
          />
          <span className="text-amber-700 font-semibold w-8 text-right">{form.rating || "—"}</span>
        </div>
        <button type="button" onClick={() => set("rating", "")} className="text-xs text-stone-400 hover:text-stone-600 mt-1">
          Clear rating
        </button>
      </Field>

      <Field label="Notes">
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} />
      </Field>

      <button
        type="submit"
        disabled={saving}
        className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Log"}
      </button>
    </form>
  );
}

const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
