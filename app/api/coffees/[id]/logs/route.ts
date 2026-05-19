import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: coffeeRows } = await sql`SELECT id FROM coffees WHERE id = ${id}`;
  if (!coffeeRows[0]) return NextResponse.json({ error: "coffee not found" }, { status: 404 });

  const {
    date, brew_method, grind_size, dose_g, yield_g, time_s, water_temp_c,
    flavor_notes, aroma, body: bodyText, acidity, rating, notes,
  } = await req.json();

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO brew_logs
      (coffee_id, date, brew_method, grind_size, dose_g, yield_g, time_s, water_temp_c,
       flavor_notes, aroma, body, acidity, rating, notes)
    VALUES
      (${id}, ${date}, ${brew_method}, ${grind_size}, ${dose_g}, ${yield_g}, ${time_s},
       ${water_temp_c}, ${flavor_notes}, ${aroma}, ${bodyText}, ${acidity}, ${rating}, ${notes})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
