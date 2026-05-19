import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

// Call this once after deploying: GET /api/setup
export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ ok: true, message: "Tables created successfully" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
