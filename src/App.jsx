import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ─── Constants ────────────────────────────────────────────────────────────────
const BG = '#0a0a0a'
const SURFACE = '#111827'
const BORDER = '#1f2937'
const ACCENT = '#1f6feb'
const TEXT = '#f9fafb'
const MUTED = '#6b7280'

const CHART_COLORS = {
  oil: '#22c55e',
  water: '#3b82f6',
  pressure: '#f97316',
  swd: '#a855f7',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  app: { minHeight: '100vh', background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" },
  header: {
    background: SURFACE, borderBottom: `1px solid ${BORDER}`,
    padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16
  },
  logo: { width: 32, height: 32, background: ACCENT, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 },
  headerSub: { fontSize: 12, color: MUTED, margin: 0 },
  controls: { padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}` },
  presetBtn: (active) => ({
    padding: '6px 14px', borderRadius: 6, border: `1px solid ${active ? ACCENT : BORDER}`,
    background: active ? ACCENT : 'transparent', color: active ? '#fff' : MUTED,
    cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s'
  }),
  dateInput: {
    background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
    padding: '6px 10px', borderRadius: 6, fontSize: 13
  },
  tabs: { display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 24px' },
  tab: (active) => ({
    padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
    color: active ? TEXT : MUTED,
    borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
    background: 'none', border: 'none', borderBottomWidth: 2,
    borderBottomStyle: 'solid', borderBottomColor: active ? ACCENT : 'transparent',
    transition: 'all 0.15s'
  }),
  content: { padding: '24px' },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 },
  chartCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px 16px 16px 16px' },
  chartTitle: { fontSize: 13, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { background: '#161b22', color: MUTED, padding: '10px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`, fontWeight: 600 },
  td: { padding: '9px 12px', borderBottom: `1px solid ${BORDER}`, color: TEXT },
  tdMono: { padding: '9px 12px', borderBottom: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'monospace', fontSize: 12 },
  tableWrap: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', overflowX: 'auto' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 14 },
  logBtn: (active) => ({
    padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? '#a855f7' : BORDER}`,
    background: active ? '#a855f720' : 'transparent', color: active ? '#a855f7' : MUTED,
    cursor: 'pointer', fontSize: 12, fontWeight: 500
  }),
  searchInput: {
    background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT,
    padding: '8px 12px', borderRadius: 6, fontSize: 13, width: 280,
    outline: 'none'
  },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    background: color + '20', color: color, fontSize: 11, fontWeight: 600
  }),
  empty: { color: MUTED, textAlign: 'center', padding: '40px 0', fontSize: 14 },
  loginWrap: { minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 40, width: 340 },
  loginTitle: { fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 4 },
  loginSub: { fontSize: 13, color: MUTED, marginBottom: 28 },
  input: {
    width: '100%', background: '#161b22', border: `1px solid ${BORDER}`, color: TEXT,
    padding: '10px 14px', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14
  },
  loginBtn: {
    width: '100%', background: ACCENT, color: '#fff', border: 'none',
    padding: '11px', borderRadius: 7, fontSize: 15, fontWeight: 600, cursor: 'pointer'
  },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 10 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function fmtNum(n, dec = 1) {
  if (n === null || n === undefined || n === '') return '—'
  const v = parseFloat(n)
  if (isNaN(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function chartDate(d) {
  const dt = new Date(d)
  return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`
}

function getPresetDates(preset) {
  const end = new Date()
  const start = new Date()
  const map = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }
  start.setDate(start.getDate() - (map[preset] || 30))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c2333', border: `1px solid ${BORDER}`, borderRadius: 7, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: MUTED, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {fmtNum(p.value)} {unit || ''}
        </div>
      ))}
    </div>
  )
}

// ─── PasswordGate ─────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const correct = import.meta.env.VITE_APP_PASSWORD
    if (pw === correct) {
      sessionStorage.setItem('authed', '1')
      onAuth()
    } else {
      setErr('Incorrect password.')
      setPw('')
    }
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ ...styles.logo, width: 40, height: 40, fontSize: 16 }}>R</div>
          <div>
            <div style={styles.loginTitle}>Keeran Ranch</div>
            <div style={styles.loginSub}>Production Explorer · Remora Management</div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {err && <div style={styles.error}>{err}</div>}
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.loginBtn}>Sign In</button>
        </form>
      </div>
    </div>
  )
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ title, data, dataKey, color, label, unit, logScale }) {
  const hasData = data && data.length > 0
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="dateLabel" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: BORDER }} interval="preserveStartEnd" />
            <YAxis
              scale={logScale ? 'log' : 'auto'}
              domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
              tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false}
              width={52}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone" dataKey={dataKey} name={label}
              stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 13 }}>
          No data in range
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('authed') === '1')
  const [tab, setTab] = useState('production')
  const [preset, setPreset] = useState('1M')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [logScale, setLogScale] = useState(false)
  const [production, setProduction] = useState([])
  const [wellTests, setWellTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [wellSearch, setWellSearch] = useState('')
  const [sortCol, setSortCol] = useState('test_date')
  const [sortDir, setSortDir] = useState('desc')

  const getDateRange = useCallback(() => {
    if (preset === 'Custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd }
    }
    return getPresetDates(preset)
  }, [preset, customStart, customEnd])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const { start, end } = getDateRange()
      const params = new URLSearchParams({ start, end })
      const res = await fetch(`/api/data?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setProduction(json.production || [])
      setWellTests(json.wellTests || [])
    } catch (e) {
      setFetchError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => { if (authed) fetchData() }, [authed, fetchData])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  // Prepare chart data
  const chartData = production.map(r => ({
    dateLabel: chartDate(r.report_date),
    fullDate: fmtDate(r.report_date),
    oil: r.oil_produced_bbls ? parseFloat(r.oil_produced_bbls) : null,
    water: r.water_produced_bbls ? parseFloat(r.water_produced_bbls) : null,
    pressure: r.field_psi ? parseFloat(r.field_psi) : null,
    swd: r.swd_discharge_psi ? parseFloat(r.swd_discharge_psi) : null,
  }))

  // Sorted/filtered well tests
  const filteredTests = wellTests
    .filter(r => !wellSearch || r.well_name?.toLowerCase().includes(wellSearch.toLowerCase()))
    .sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol]
      if (sortCol === 'test_date') { av = new Date(av); bv = new Date(bv) }
      else { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0 }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function SortIndicator({ col }) {
    if (sortCol !== col) return <span style={{ color: BORDER }}> ↕</span>
    return <span style={{ color: ACCENT }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
  }

  const presets = ['1M', '3M', '6M', '1Y', 'Custom']

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>R</div>
        <div>
          <div style={styles.headerTitle}>Keeran Ranch Production Explorer</div>
          <div style={styles.headerSub}>Remora Management LLC · Live Production Data</div>
        </div>
        {loading && (
          <div style={{ marginLeft: 'auto', color: MUTED, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, animation: 'pulse 1s infinite' }} />
            Loading…
          </div>
        )}
        {fetchError && (
          <div style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 12 }}>
            Error: {fetchError}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>DATE RANGE</span>
        {presets.map(p => (
          <button key={p} style={styles.presetBtn(preset === p)}
            onClick={() => {
              setPreset(p)
              setShowCustom(p === 'Custom')
              if (p !== 'Custom') setTimeout(fetchData, 0)
            }}>
            {p}
          </button>
        ))}
        {showCustom && (
          <>
            <input type="date" style={styles.dateInput} value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span style={{ color: MUTED }}>to</span>
            <input type="date" style={styles.dateInput} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            <button style={styles.presetBtn(false)} onClick={fetchData}>Apply</button>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: MUTED }}>Scale:</span>
          <button style={styles.logBtn(false)} onClick={() => setLogScale(false)} disabled={!logScale}
            {...(!logScale && { style: { ...styles.logBtn(false), borderColor: ACCENT, color: ACCENT } })}>
            Linear
          </button>
          <button style={styles.logBtn(logScale)} onClick={() => setLogScale(true)}>Log</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['production', 'wellTests'].map(t => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'production' ? 'Production' : 'Well Tests'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'production' && (
          <>
            {/* 2x2 Chart Grid */}
            <div style={styles.chartGrid}>
              <ChartCard title="Oil Production" data={chartData} dataKey="oil"
                color={CHART_COLORS.oil} label="Oil" unit="BBL" logScale={logScale} />
              <ChartCard title="Water Production" data={chartData} dataKey="water"
                color={CHART_COLORS.water} label="Water" unit="BBL" logScale={logScale} />
              <ChartCard title="Field Pressure" data={chartData} dataKey="pressure"
                color={CHART_COLORS.pressure} label="Field PSI" unit="psi" logScale={logScale} />
              <ChartCard title="SWD Discharge Pressure" data={chartData} dataKey="swd"
                color={CHART_COLORS.swd} label="SWD PSI" unit="psi" logScale={logScale} />
            </div>

            {/* Historical Table */}
            <div style={{ marginBottom: 12, ...styles.sectionTitle }}>Historical Production</div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Oil (BBL)</th>
                    <th style={styles.th}>Water (BBL)</th>
                    <th style={styles.th}>Field P (psi)</th>
                    <th style={styles.th}>SWD P (psi)</th>
                    <th style={styles.th}>Oil Hauled</th>
                    <th style={styles.th}>Ticket #</th>
                  </tr>
                </thead>
                <tbody>
                  {production.length === 0 && (
                    <tr><td colSpan={7} style={{ ...styles.td, ...styles.empty }}>No production records in range</td></tr>
                  )}
                  {[...production].reverse().map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#0d1117' }}>
                      <td style={styles.td}>{fmtDate(r.report_date)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.oil_produced_bbls)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.water_produced_bbls)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.field_psi, 0)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.swd_discharge_psi, 0)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.oil_hauled_bbls)}</td>
                      <td style={{ ...styles.td, color: MUTED }}>{r.ticket_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'wellTests' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={styles.sectionTitle}>Well Tests</div>
              <input
                type="text"
                placeholder="Search by well name…"
                value={wellSearch}
                onChange={e => setWellSearch(e.target.value)}
                style={styles.searchInput}
              />
              <span style={{ color: MUTED, fontSize: 12, marginLeft: 'auto' }}>
                {filteredTests.length} record{filteredTests.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('test_date')}>
                      Date <SortIndicator col="test_date" />
                    </th>
                    <th style={styles.th}>Well</th>
                    <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('oil_bbls')}>
                      Oil (BOPD) <SortIndicator col="oil_bbls" />
                    </th>
                    <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('water_bbls')}>
                      Water (BWPD) <SortIndicator col="water_bbls" />
                    </th>
                    <th style={styles.th}>TP (psi)</th>
                    <th style={styles.th}>CP (psi)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.length === 0 && (
                    <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: MUTED, padding: '40px 0' }}>
                      {wellSearch ? 'No wells match search' : 'No well tests in range'}
                    </td></tr>
                  )}
                  {filteredTests.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#0d1117' }}>
                      <td style={styles.td}>{fmtDate(r.test_date)}</td>
                      <td style={{ ...styles.td, fontWeight: 500, color: CHART_COLORS.oil }}>{r.well_name}</td>
                      <td style={styles.tdMono}>{fmtNum(r.oil_bbls)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.water_bbls)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.tubing_psi, 0)}</td>
                      <td style={styles.tdMono}>{fmtNum(r.casing_psi, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
