"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CoffeeForm {
  url: string;
  name: string;
  roaster: string;
  origin: string;
  region: string;
  process: string;
  variety: string;
  roast_level: string;
  date_bought: string;
  notes: string;
  image_url: string;
  price_paid: string;
  quantity_g: string;
  tasting_notes: string;
}

const EMPTY: CoffeeForm = {
  url: "", name: "", roaster: "", origin: "", region: "",
  process: "", variety: "", roast_level: "", date_bought: "", notes: "", image_url: "",
  price_paid: "", quantity_g: "", tasting_notes: "",
};

export default function NewCoffeePage() {
  const router = useRouter();
  const [form, setForm] = useState<CoffeeForm>(EMPTY);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(field: keyof CoffeeForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function fetchFromUrl() {
    if (!form.url) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        roaster: data.roaster || f.roaster,
        origin: data.origin || f.origin,
        process: data.process || f.process,
        variety: data.variety || f.variety,
        roast_level: data.roast_level || f.roast_level,
        image_url: data.image_url || f.image_url,
      }));
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/coffees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price_paid: form.price_paid ? parseFloat(form.price_paid) : undefined,
        quantity_g: form.quantity_g ? parseFloat(form.quantity_g) : undefined,
      }),
    });
    if (res.ok) {
      const coffee = await res.json();
      router.push(`/coffees/${coffee.id}`);
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Coffee</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL fetch */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <label className="block text-sm font-medium mb-2">Coffee Page URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://..."
              className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <button
              type="button"
              onClick={fetchFromUrl}
              disabled={!form.url || fetching}
              className="bg-stone-100 hover:bg-stone-200 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {fetching ? "Fetching…" : "Fetch Details"}
            </button>
          </div>
          {fetchError && <p className="text-red-500 text-xs mt-2">{fetchError}</p>}
          {!fetchError && fetching && (
            <p className="text-stone-400 text-xs mt-2">Scraping page…</p>
          )}
          {form.image_url && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image_url}
                alt="Coffee"
                className="w-20 h-20 object-cover rounded-lg border border-stone-200"
              />
              <button
                type="button"
                onClick={() => set("image_url", "")}
                className="text-xs text-stone-400 hover:text-red-500"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Core info */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <h2 className="font-medium">Coffee Info</h2>

          <Field label="Name *" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Roaster">
              <input type="text" value={form.roaster} onChange={(e) => set("roaster", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date Bought">
              <input type="date" value={form.date_bought} onChange={(e) => set("date_bought", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price Paid (₹)">
              <input type="number" step="0.01" min="0" value={form.price_paid} onChange={(e) => set("price_paid", e.target.value)} placeholder="e.g. 850" className={inputCls} />
            </Field>
            <Field label="Quantity (g)">
              <input type="number" step="1" min="0" value={form.quantity_g} onChange={(e) => set("quantity_g", e.target.value)} placeholder="e.g. 250" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Origin / Country">
              <input type="text" value={form.origin} onChange={(e) => set("origin", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Region">
              <input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Process">
              <input type="text" value={form.process} onChange={(e) => set("process", e.target.value)} placeholder="Washed, Natural…" className={inputCls} />
            </Field>
            <Field label="Variety">
              <input type="text" value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="Gesha, SL28…" className={inputCls} />
            </Field>
            <Field label="Roast Level">
              <input type="text" value={form.roast_level} onChange={(e) => set("roast_level", e.target.value)} placeholder="Light, Medium…" className={inputCls} />
            </Field>
          </div>

          <Field label="Tasting Notes">
            <input
              type="text"
              value={form.tasting_notes}
              onChange={(e) => set("tasting_notes", e.target.value)}
              placeholder="Chocolate, citrus, floral…"
              className={inputCls}
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Coffee"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg font-medium border border-stone-200 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
