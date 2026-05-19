import * as cheerio from "cheerio";

export interface ScrapedCoffee {
  name?: string;
  roaster?: string;
  origin?: string;
  region?: string;
  process?: string;
  variety?: string;
  roast_level?: string;
}

function clean(s: string | undefined | null): string | undefined {
  const t = s?.replace(/\s+/g, " ").trim();
  return t || undefined;
}

// Walk all text in the body as one string, then regex-extract label→value pairs
function extractFromText(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:\\n]\\s*([^\\n]{2,60})`,
      "im"
    );
    const m = text.match(re);
    if (m) {
      const val = m[1].trim().replace(/^[:–-]\s*/, "");
      // Skip sentence-like values (start with "This", "The", "A ", "An " or are clearly prose)
      if (!val || /^(this |the |a |an )/i.test(val)) continue;
      if (val.length < 60 && !val.toLowerCase().startsWith(label.toLowerCase())) {
        return val;
      }
    }
  }
  return undefined;
}

// Find label→value from adjacent same-level elements (e.g. each in own <tr><td>)
function findAdjacentLabel($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${label}\\s*$`, "i");
    let found: string | undefined;
    // Check adjacent tds/divs/spans that each occupy a row
    $("td, li, div, span, p").each((_, el) => {
      if (re.test($(el).text().trim())) {
        const next = $(el).next();
        const val = clean(next.text());
        if (val && val.length < 80 && !/^(this |the |a |an )/i.test(val)) {
          found = val;
          return false;
        }
      }
    });
    if (found) return found;
  }
  return undefined;
}

// Try cheerio dt/th label patterns
function findByLabel($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(label, "i");

    // dt → dd
    const dt = $("dt").filter((_, el) => re.test($(el).text()));
    if (dt.length) {
      const val = clean(dt.first().next("dd").text());
      if (val) return val;
    }

    // th → td in same row
    let found: string | undefined;
    $("tr").each((_, tr) => {
      const th = $(tr).find("th, td:first-child").first();
      if (re.test(th.text())) {
        const td = $(tr).find("td").last();
        const val = clean(td.text());
        if (val && val !== clean(th.text())) {
          found = val;
          return false;
        }
      }
    });
    if (found) return found;
  }
  return undefined;
}

export async function scrapeCoffeePage(url: string): Promise<ScrapedCoffee> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // --- Name & Roaster from meta tags (most reliable) ---
  const ogTitle = $('meta[property="og:title"]').attr("content") ||
    $('meta[name="og:title"]').attr("content");
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");

  let name: string | undefined;
  let roaster: string | undefined;

  if (ogTitle) {
    // "Product Name - Site Name" or "Product Name | Site Name"
    const parts = ogTitle.split(/\s*[-|–]\s*/);
    name = clean(parts[0]);
    if (parts.length > 1 && !ogSiteName) {
      roaster = clean(parts[parts.length - 1]);
    }
  }
  if (ogSiteName) roaster = clean(ogSiteName);

  // Fallback name from h1 if meta didn't help
  if (!name) {
    $("nav, footer, script, style, header").remove();
    name = clean($("h1").first().text());
  } else {
    $("nav, footer, script, style, header").remove();
  }

  // --- Extract structured fields ---
  const PROCESS_LABELS = ["process", "post.harvest process", "processing method", "processing"];
  const ORIGIN_LABELS  = ["origin", "country", "farm", "estate", "growing region"];
  const REGION_LABELS  = ["region", "area", "district", "zone"];
  const VARIETY_LABELS = ["variety", "varietal", "cultivar"];
  const ROAST_LABELS   = ["roast level", "roast profile", "roast"];

  const process =
    findByLabel($, PROCESS_LABELS) ||
    findAdjacentLabel($, PROCESS_LABELS);

  const origin =
    findByLabel($, ORIGIN_LABELS) ||
    findAdjacentLabel($, ORIGIN_LABELS);

  const region =
    findByLabel($, REGION_LABELS) ||
    findAdjacentLabel($, REGION_LABELS);

  const variety =
    findByLabel($, VARIETY_LABELS) ||
    findAdjacentLabel($, VARIETY_LABELS);

  const roast_level =
    findByLabel($, ROAST_LABELS) ||
    findAdjacentLabel($, ROAST_LABELS);

  // --- Text-block fallback: grab all visible body text and regex-scan ---
  const bodyText = $("body").text().replace(/\t/g, " ");

  const result: ScrapedCoffee = {
    name,
    roaster,
    origin: origin || extractFromText(bodyText, ORIGIN_LABELS),
    region: region || extractFromText(bodyText, REGION_LABELS),
    process: process || extractFromText(bodyText, PROCESS_LABELS),
    variety: variety || extractFromText(bodyText, VARIETY_LABELS),
    roast_level: roast_level || extractFromText(bodyText, ROAST_LABELS),
  };

  return result;
}
