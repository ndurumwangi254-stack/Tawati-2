import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import MedicineModal from '../components/MedicineModal'
import RestockModal from '../components/RestockModal'
import { pageHeader, table, th, td, btn, btnSm, fieldInput, statusDot } from '../styles/ui'

function statusFor(stock, reorderLevel) {
  if (stock === 0) return { variant: 'critical', label: 'Out of stock' }
  if (stock <= reorderLevel) return { variant: 'low', label: 'Low stock' }
  return { variant: 'ok', label: 'OK' }
}

const QUICK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
]

export default function Inventory() {
  const { currentUser } = useApp()
  const isOwner = currentUser?.role === 'owner'
  const navigate = useNavigate()
  const { data: medicines, loading, error, refetch } = useFetch(() => api.get('/medicines'), [])
  const { data: categories } = useFetch(() => api.get('/categories'), [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [quickFilter, setQuickFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [restockTarget, setRestockTarget] = useState(null)

  const filtered = useMemo(() => {
    if (!medicines) return []
    return medicines.filter((m) => {
      const stock = Number(m.stock)
      const matchesQuery =
        !query ||
        m.brand_name.toLowerCase().includes(query.toLowerCase()) ||
        m.generic_name.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === 'All' || m.category === category
      const matchesQuick =
        quickFilter === 'all' ||
        (quickFilter === 'low' && stock > 0 && stock <= m.reorder_level) ||
        (quickFilter === 'out' && stock === 0)
      return matchesQuery && matchesCategory && matchesQuick
    })
  }, [medicines, query, category, quickFilter])

  function handleSaved() {
    setShowModal(false)
    refetch()
  }

  return (
    <>
      <div className={pageHeader}>
        <div>
          <h1 className="text-[22px]">Inventory</h1>
          <p className="text-sm text-muted mt-0.5">
            {medicines ? `${medicines.length} medicines on record` : ''}
          </p>
        </div>
        {isOwner && (
          <button className={btn.primary} onClick={() => setShowModal(true)}>
            + Add Medication
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-muted">Loading inventory...</p>}
      {error && <p className="text-sm text-danger">Couldn't load inventory: {error}</p>}

      {!loading && !error && medicines?.length === 0 && (
        <EmptyState
          title="No medicines yet"
          description="Add your first one to start tracking stock."
          actionLabel={isOwner ? '+ Add Medication' : undefined}
          onAction={() => setShowModal(true)}
        />
      )}

      {!loading && !error && medicines?.length > 0 && (
        <>
          {/* Search + quick filters */}
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">⌕</span>
              <input
                className={`${fieldInput} w-full pl-8 rounded-pill`}
                placeholder="Search medicine, generic name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setQuickFilter(f.key)}
                  className={`px-4 py-2 rounded-pill text-sm font-medium border ${
                    quickFilter === f.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-ink border-borderStrong'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setCategory('All')}
              className={`px-3.5 py-1.5 rounded-pill text-[13px] font-medium border ${
                category === 'All'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted border-borderStrong'
              }`}
            >
              All Categories
            </button>
            {(categories || []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.name)}
                className={`px-3.5 py-1.5 rounded-pill text-[13px] font-medium border ${
                  category === c.name
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted border-borderStrong'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No medicines match your search.</p>
          ) : (
            <div className="border border-border rounded-[10px] overflow-hidden">
              <table className={table}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className={`${th} pl-4`}>Medication</th>
                    <th className={th}>Category</th>
                    <th className={th}>Stock / Reorder</th>
                    <th className={th}>Expiry</th>
                    <th className={th}>Cost / Selling</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const stock = Number(m.stock)
                    const status = statusFor(stock, m.reorder_level)
                    const daysToExpiry = m.nearest_expiry
                      ? Math.round((new Date(m.nearest_expiry) - new Date()) / (1000 * 60 * 60 * 24))
                      : null
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className={`${td} pl-4`}>
                          <div className="flex items-center gap-2">
                            <span className={statusDot(status.variant)} />
                            <div>
                              <div className="font-medium">{m.brand_name}</div>
                              <div className="text-sm text-muted">
                                {m.generic_name} · {m.unit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={td}>{m.category || '—'}</td>
                        <td className={td}>
                          <div>
                            <span className={status.variant === 'ok' ? '' : 'font-semibold'}>{stock}</span>
                            <span className="text-muted"> / min {m.reorder_level}</span>
                          </div>
                          {m.units_per_pack > 1 && (
                            <div className="text-[13px] text-muted">
                              ≈ {(stock / m.units_per_pack).toFixed(1)} packs of {m.units_per_pack}
                            </div>
                          )}
                          {status.variant === 'low' && (
                            <StatusBadge variant="low">Reorder level</StatusBadge>
                          )}
                          {status.variant === 'critical' && (
                            <StatusBadge variant="critical">Out of stock</StatusBadge>
                          )}
                        </td>
                        <td className={td}>
                          <div>{m.nearest_expiry ? m.nearest_expiry.slice(0, 10) : '—'}</div>
                          {daysToExpiry !== null && daysToExpiry <= 60 && daysToExpiry >= 0 && (
                            <StatusBadge variant="low">Expiring in {daysToExpiry}d</StatusBadge>
                          )}
                          {daysToExpiry !== null && daysToExpiry < 0 && (
                            <StatusBadge variant="critical">Expired</StatusBadge>
                          )}
                        </td>
                        <td className={td}>
                          <div className="font-medium">KSh {m.selling_price}</div>
                        </td>
                        <td className={`${td} text-right pr-4`}>
                          <div className="flex gap-1.5 justify-end">
                            {isOwner && (
                              <button className={`${btn.secondary} ${btnSm}`} onClick={() => setRestockTarget(m)}>
                                Restock
                              </button>
                            )}
                            <button className={`${btn.secondary} ${btnSm}`} onClick={() => navigate('/dispense')}>
                              Dispense
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && <MedicineModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      {restockTarget && (
        <RestockModal
          medicine={restockTarget}
          onClose={() => setRestockTarget(null)}
          onSaved={() => {
            setRestockTarget(null)
            refetch()
          }}
        />
      )}
    </>
  )
}
