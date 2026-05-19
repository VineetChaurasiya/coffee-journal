import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  await sql`DELETE FROM brew_logs WHERE id = ${logId}`;
  return NextResponse.json({ ok: true });
}
