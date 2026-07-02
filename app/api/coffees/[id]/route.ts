import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: coffeeRows } = await sql`SELECT * FROM coffees WHERE id = ${id}`;
  if (!coffeeRows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { rows: logs } = await sql`
    SELECT * FROM brew_logs WHERE coffee_id = ${id} ORDER BY date DESC, created_at DESC
  `;

  return NextResponse.json({ ...coffeeRows[0], logs });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, url, roaster, origin, region, process, variety, roast_level, date_bought, notes, image_url, price_paid, quantity_g } =
    await req.json();

  const { rows } = await sql`
    UPDATE coffees SET
      name        = COALESCE(${name}, name),
      url         = COALESCE(${url}, url),
      roaster     = COALESCE(${roaster}, roaster),
      origin      = COALESCE(${origin}, origin),
      region      = COALESCE(${region}, region),
      process     = COALESCE(${process}, process),
      variety     = COALESCE(${variety}, variety),
      roast_level = COALESCE(${roast_level}, roast_level),
      date_bought = COALESCE(${date_bought}, date_bought),
      notes       = COALESCE(${notes}, notes),
      image_url   = COALESCE(${image_url}, image_url),
      price_paid  = COALESCE(${price_paid ?? null}, price_paid),
      quantity_g  = COALESCE(${quantity_g ?? null}, quantity_g)
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM coffees WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
