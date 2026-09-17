import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import BarChart from '../components/BarChart'
import { pageHeader, card, fieldInput } from '../styles/ui'

const RANGES = [
  { label: 'This month', months: 1 },
  { label: 'Last 3 months', months: 3 },
  { label: 'This year', months: 12 },
]

// pg returns SUM()/COUNT() as strings (they can exceed JS's safe integer
// range) — normalize to numbers here so BarChart's width math and
// toLocaleString formatting behave.
function normalize(rows) {
  return (rows || []).map((r) => ({ name: r.name, value: Number(r.value) || 0 }))
}

export default function Reports() {
  const [range, setRange] = useState(RANGES[0])
  const { data: reports, loading, error } = useFetch(() => api.get(`/reports?months=${range.months}`), [range])

  return (
    <>
      <div className={pageHeader}>
        <h1 className="text-[22px]">Reports</h1>
        <select
          className={fieldInput}
          value={range.label}
          onChange={(e) => setRange(RANGES.find((r) => r.label === e.target.value))}
        >
          {RANGES.map((r) => (
            <option key={r.label}>{r.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-muted">Loading reports...</p>}
      {error && <p className="text-sm text-danger">Couldn't load reports: {error}</p>}

      {!loading && !error && reports && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={card}>
            <h3 className="text-base mb-3">Best-selling medicines</h3>
            <BarChart data={normalize(reports.bestSellers)} />
          </div>
          <div className={card}>
            <h3 className="text-base mb-3">Least-selling medicines</h3>
            <BarChart data={normalize(reports.leastSellers)} danger />
          </div>

          <div className={card}>
            <h3 className="text-base mb-3">Highest margin items</h3>
            <BarChart data={normalize(reports.marginByMedicine).slice(0, 6)} valuePrefix="KSh " />
          </div>
          <div className={card}>
            <h3 className="text-base mb-3">Monthly profit margin</h3>
            <BarChart data={normalize(reports.monthlyMargin)} valuePrefix="KSh " />
          </div>

          <div className={card}>
            <h3 className="text-base mb-3">Monthly sales trend</h3>
            <BarChart data={normalize(reports.monthlySales)} valuePrefix="KSh " />
          </div>
          <div className={card}>
            <h3 className="text-base mb-3">Sales by category</h3>
            <BarChart data={normalize(reports.salesByCategory)} />
          </div>

          <div className={card}>
            <h3 className="text-base mb-3">Expiry losses (KSh)</h3>
            <BarChart data={normalize(reports.expiryLosses)} danger valuePrefix="KSh " />
          </div>
          <div className={card}>
            <h3 className="text-base mb-3">Peak hours</h3>
            <BarChart data={normalize(reports.peakHours)} />
          </div>
        </div>
      )}
    </>
  )
}
