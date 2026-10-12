import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const { start, end } = event.queryStringParameters || {};

    const prodResult = await pool.query(
      `SELECT report_date, oil_produced_bbls, water_produced_bbls, field_psi, swd_discharge_psi,
              oil_hauled_bbls, ticket_number
       FROM keeran_production
       WHERE ($1::date IS NULL OR report_date >= $1) AND ($2::date IS NULL OR report_date <= $2)
       ORDER BY report_date ASC`,
      [start || null, end || null]
    );

    const wellResult = await pool.query(
      `SELECT test_date, well_name, oil_bbls, water_bbls, tubing_psi, casing_psi
       FROM well_tests
       WHERE well_name ILIKE 'KEERAN%'
         AND ($1::date IS NULL OR test_date >= $1) AND ($2::date IS NULL OR test_date <= $2)
       ORDER BY test_date DESC, well_name ASC`,
      [start || null, end || null]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ production: prodResult.rows, wellTests: wellResult.rows }),
    };
  } catch (err) {
    console.error('DB error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
