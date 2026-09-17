import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { tableScroll, table, th, td, searchInput } from '../styles/ui'

const TYPES = ['All', 'Received', 'Sold', 'Expired', 'Adjustment']

const TYPE_STYLE = {
  received: 'bg-success-tint text-success',
  sold: 'bg-info-tint text-info-dark',
  expired: 'bg-danger-tint text-danger',
  adjustment: 'bg-warning-tint text-warning',
}

const TYPE_ARROW = { received: '↗', sold: '↘', expired: '⛔', adjustment: '⇅' }

export default function StockMovements() {
  const [type, setType] = useState('All')
  const [query, setQuery] = useState('')
  const { data: movements, loading, error } = useFetch(
    () => api.get(type === 'All' ? '/stock-movements' : `/stock-movements?type=${type.toLowerCase()}`),
    [type]
  )

  const filtered = (movements || []).filter(
    (sm) => !query || sm.medicine.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <>
      <div className="bg-white border border-border rounded-[14px] p-6 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-primary text-lg">🕐</span>
          <h1 className="text-lg font-display font-semibold">Stock Movement &amp; Audit Ledger</h1>
        </div>
        <p className="text-sm text-muted mt-1">A log of every sale, delivery, and stock adjustment at Tawati Chemist.</p>

        <div className="flex flex-wrap gap-3 items-center mt-4">
          <input
            className={`${searchInput} rounded-pill`}
            placeholder="Search medicine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3.5 py-1.5 rounded-pill text-[13px] font-medium border ${
                  type === t ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-borderStrong'
                }`}
              >
                {t === 'All' ? 'All Movements' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Loading...</p>}
      {error && <p className="text-sm text-danger">Couldn't load stock movements: {error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No stock activity yet" description="Sales and deliveries will show up here." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr className="bg-gray-50">
                <th className={`${th} pl-4`}>Date &amp; Time</th>
                <th className={th}>Type</th>
                <th className={th}>Medication</th>
                <th className={th}>Quantity</th>
                <th className={th}>Note</th>
                <th className={th}>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sm) => (
                <tr key={sm.id} className="hover:bg-gray-50">
                  <td className={`${td} pl-4 whitespace-nowrap`}>
                    {sm.created_at ? new Date(sm.created_at).toLocaleString() : '—'}
                  </td>
                  <td className={td}>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium capitalize ${TYPE_STYLE[sm.type] || 'bg-gray-100 text-muted'}`}>
                      {TYPE_ARROW[sm.type] || '•'} {sm.type}
                    </span>
                  </td>
                  <td className={`${td} font-medium`}>{sm.medicine}</td>
                  <td className={`${td} font-semibold ${sm.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                    {sm.quantity > 0 ? '+' : ''}
                    {sm.quantity} units
                  </td>
                  <td className={`${td} text-muted`}>{sm.note || '—'}</td>
                  <td className={td}>{sm.performed_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
