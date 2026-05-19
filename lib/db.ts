import { sql } from "@vercel/postgres";

export { sql };

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS coffees (
      id SERIAL PRIMARY KEY,
      url TEXT,
      name TEXT NOT NULL,
      roaster TEXT,
      origin TEXT,
      region TEXT,
      process TEXT,
      variety TEXT,
      roast_level TEXT,
      date_bought TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS brew_logs (
      id SERIAL PRIMARY KEY,
      coffee_id INTEGER NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      brew_method TEXT,
      grind_size TEXT,
      dose_g REAL,
      yield_g REAL,
      time_s INTEGER,
      water_temp_c REAL,
      flavor_notes TEXT,
      aroma TEXT,
      body TEXT,
      acidity TEXT,
      rating INTEGER,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}
