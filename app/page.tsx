import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Coffee {
  id: number;
  name: string;
  roaster?: string;
  origin?: string;
  process?: string;
  roast_level?: string;
  date_bought?: string;
  log_count: number;
  avg_rating?: number;
}

function StarRating({ value }: { value: number | string }) {
  const num = parseFloat(String(value));
  const rounded = Math.round(num * 2) / 2;
  return (
    <span className="text-amber-400 text-sm" title={`${num.toFixed(1)}/10`}>
      {"★".repeat(Math.floor(rounded / 2))}
      {rounded % 2 ? "½" : ""}
      {"☆".repeat(5 - Math.ceil(rounded / 2))}
      <span className="text-stone-400 ml-1 text-xs">{num.toFixed(1)}</span>
    </span>
  );
}

async function getCoffees(): Promise<{ coffees?: Coffee[]; error?: string }> {
  try {
    const { rows } = await sql`
      SELECT c.*,
        (SELECT COUNT(*) FROM brew_logs WHERE coffee_id = c.id)::int AS log_count,
        (SELECT AVG(rating) FROM brew_logs WHERE coffee_id = c.id AND rating IS NOT NULL) AS avg_rating
      FROM coffees c ORDER BY c.created_at DESC
    `;
    return { coffees: rows as Coffee[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export default async function Home() {
  const { coffees, error } = await getCoffees();

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-medium mb-2">Failed to load coffees</p>
        <pre className="text-xs text-stone-400 bg-stone-100 rounded-lg p-4 text-left max-w-xl mx-auto whitespace-pre-wrap">{error}</pre>
        <p className="text-stone-400 text-sm mt-4">
          If you haven&apos;t yet, visit <code className="bg-stone-100 px-1 rounded">/api/setup</code> to create the database tables.
        </p>
      </div>
    );
  }

  if (!coffees || coffees.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-4xl mb-4">☕</p>
        <p className="text-stone-500 mb-6">No coffees yet. Add your first one!</p>
        <Link
          href="/coffees/new"
          className="bg-stone-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-stone-700 transition-colors"
        >
          + Add Coffee
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Coffees</h1>
        <span className="text-stone-400 text-sm">{coffees.length} coffee{coffees.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid gap-4">
        {coffees.map((c) => (
          <Link
            key={c.id}
            href={`/coffees/${c.id}`}
            className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-400 hover:shadow-sm transition-all block"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-lg leading-tight truncate">{c.name}</h2>
                {c.roaster && <p className="text-stone-500 text-sm mt-0.5">{c.roaster}</p>}
              </div>
              {c.avg_rating != null && <StarRating value={c.avg_rating} />}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {c.origin && (
                <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full">{c.origin}</span>
              )}
              {c.process && (
                <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">{c.process}</span>
              )}
              {c.roast_level && (
                <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">{c.roast_level}</span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
              {c.date_bought && <span>Bought {c.date_bought}</span>}
              <span>{c.log_count} brew log{c.log_count !== 1 ? "s" : ""}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
