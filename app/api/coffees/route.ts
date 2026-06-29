import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { rows } = await sql`
    SELECT c.*,
      (SELECT COUNT(*) FROM brew_logs WHERE coffee_id = c.id)::int AS log_count,
      (SELECT AVG(rating) FROM brew_logs WHERE coffee_id = c.id AND rating IS NOT NULL) AS avg_rating
    FROM coffees c ORDER BY c.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, url, roaster, origin, region, process, variety, roast_level, date_bought, notes, image_url } =
    await req.json();

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO coffees (name, url, roaster, origin, region, process, variety, roast_level, date_bought, notes, image_url)
    VALUES (${name}, ${url}, ${roaster}, ${origin}, ${region}, ${process}, ${variety}, ${roast_level}, ${date_bought}, ${notes}, ${image_url})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
