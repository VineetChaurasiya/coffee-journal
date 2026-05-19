import { NextRequest, NextResponse } from "next/server";
import { scrapeCoffeePage } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const data = await scrapeCoffeePage(url);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
