import pg from 'pg';
const { Pool } = pg;

const rawConn = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
const connStr = rawConn.replace('channel_binding=require', 'channel_binding=disable');
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

const num = v => (v == null ? null : Number(v));
// ── XLSX export helpers ──
const fmtVal = v => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
};
// Keep only columns that exist in the table, in the given order
const exportRows = (rows, cols) => {
  const have = rows.length ? cols.filter(c => c in rows[0]) : cols;
  return { cols: have, rows: rows.map(r => Object.fromEntries(have.map(c => [c, fmtVal(r[c])]))) };
};

const pick = (r, ...keys) => { for (const k of keys) if (r[k] != null) return r[k]; return null; };

export const handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  try {
    const { start, end } = event.queryStringParameters || {};
    const params = [start || null, end || null];

    // SELECT * so a renamed/missing column can never break the query
    const prod = await pool.query(
      `SELECT * FROM keeran.production
       WHERE ($1::date IS NULL OR report_date >= $1::date)
         AND ($2::date IS NULL OR report_date <= $2::date)
       ORDER BY report_date ASC`, params);

    const tests = await pool.query(
      `SELECT * FROM keeran.well_tests
       WHERE ($1::date IS NULL OR test_date >= $1::date)
         AND ($2::date IS NULL OR test_date <= $2::date)
       ORDER BY test_date DESC, well_name ASC`, params);

    const production = prod.rows.map(r => ({
      report_date:         r.report_date,
      oil_produced_bbls:   num(r.oil_produced_bbls),
      water_produced_bbls: num(r.water_produced_bbls),
      field_psi:           num(pick(r, 'field_pressure_psi', 'field_psi')),
      swd_discharge_psi:   num(r.swd_discharge_psi),
      oil_hauled_bbls:     num(r.oil_hauled_bbls),
      ticket_number:       r.ticket_number ?? null,
    }));

    const wellTests = tests.rows.map(r => ({
      test_date:  r.test_date,
      well_name:  r.well_name,
      oil_bbls:   num(pick(r, 'oil_bopd', 'oil_bbls')),
      water_bbls: num(pick(r, 'water_bwpd', 'water_bbls')),
      tubing_psi: num(r.tubing_psi),
      casing_psi: num(r.casing_psi),
    }));

    const pe = exportRows(prod.rows, ['report_date','tank_25173_ft','tank_25173_in','tank_25173_bbls','tank_25785_ft','tank_25785_in','tank_25785_bbls','oil_produced_bbls','oil_hauled_bbls','water_produced_bbls','field_pressure_psi','swd_discharge_psi']);
    const we = exportRows(tests.rows, ['test_date','well_name','well_type','oil_bopd','water_bwpd','gas_in_mcfd','gas_out_mcfd','tubing_psi','casing_psi']);

    return { statusCode: 200, headers, body: JSON.stringify({
      production, wellTests,
      productionExport: pe.rows, productionExportCols: pe.cols,
      wellTestsExport: we.rows, wellTestsExportCols: we.cols,
      range: { start: start || null, end: end || null },
    }) };
  } catch (err) {
    console.error('DB error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
