import { sql, createClient } from "@vercel/postgres";

export { sql };

let initialized = false;

export async function initDb() {
  if (initialized) return;

  // DDL must use the direct (non-pooling) connection — pgBouncer blocks CREATE TABLE
  const client = createClient({
    connectionString: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL,
  });
  await client.connect();

  try {
    await client.sql`
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
        image_url TEXT,
        price_paid REAL,
        quantity_g REAL,
        tasting_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await client.sql`ALTER TABLE coffees ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await client.sql`ALTER TABLE coffees ADD COLUMN IF NOT EXISTS price_paid REAL`;
    await client.sql`ALTER TABLE coffees ADD COLUMN IF NOT EXISTS quantity_g REAL`;
    await client.sql`ALTER TABLE coffees ADD COLUMN IF NOT EXISTS tasting_notes TEXT`;
    await client.sql`
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
    initialized = true;
  } finally {
    await client.end();
  }
}
