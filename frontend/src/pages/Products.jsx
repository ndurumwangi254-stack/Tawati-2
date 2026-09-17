import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import ProductModal from '../components/ProductModal'
import ProductRestockModal from '../components/ProductRestockModal'
import { pageHeader, toolbar, searchInput, table, th, td, btn, btnSm, statusDot } from '../styles/ui'

function statusFor(stock, reorderLevel) {
  if (stock === 0) return { variant: 'critical', label: 'Out of stock' }
  if (stock <= reorderLevel) return { variant: 'low', label: 'Low stock' }
  return { variant: 'ok', label: 'OK' }
}

export default function Products() {
  const { currentUser } = useApp()
  const isOwner = currentUser?.role === 'owner'
  const navigate = useNavigate()
  const { data: products, loading, error, refetch } = useFetch(() => api.get('/products'), [])
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [restockTarget, setRestockTarget] = useState(null)

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
  }, [products, query])

  function handleSaved() {
    setShowModal(false)
    refetch()
  }

  return (
    <>
      <div className={pageHeader}>
        <div>
          <h1 className="text-[22px]">Shop Items</h1>
          <p className="text-sm text-muted mt-0.5">Non-medicine products — toiletries, drinks, and the like.</p>
        </div>
        {isOwner && (
          <button className={btn.primary} onClick={() => setShowModal(true)}>
            + Add Item
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-muted">Loading shop items...</p>}
      {error && <p className="text-sm text-danger">Couldn't load shop items: {error}</p>}

      {!loading && !error && products?.length === 0 && (
        <EmptyState
          title="No shop items yet"
          description="Add toothpaste, bottled water, and other non-medicine products here."
          actionLabel={isOwner ? '+ Add Item' : undefined}
          onAction={() => setShowModal(true)}
        />
      )}

      {!loading && !error && products?.length > 0 && (
        <>
          <div className={toolbar}>
            <input className={searchInput} placeholder="Search items..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted">No items match your search.</p>
          ) : (
            <div className="border border-border rounded-[10px] overflow-hidden">
              <table className={table}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className={`${th} pl-4`}>Item</th>
                    <th className={th}>Category</th>
                    <th className={th}>Stock / Reorder</th>
                    <th className={th}>Price</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const status = statusFor(p.stock_quantity, p.reorder_level)
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className={`${td} pl-4`}>
                          <div className="flex items-center gap-2">
                            <span className={statusDot(status.variant)} />
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-sm text-muted">{p.unit}</div>
                            </div>
                          </div>
                        </td>
                        <td className={td}>{p.category || '—'}</td>
                        <td className={td}>
                          <div>
                            <span className={status.variant === 'ok' ? '' : 'font-semibold'}>{p.stock_quantity}</span>
                            <span className="text-muted"> / min {p.reorder_level}</span>
                          </div>
                          {p.units_per_pack > 1 && (
                            <div className="text-[13px] text-muted">
                              ≈ {(p.stock_quantity / p.units_per_pack).toFixed(1)} packs of {p.units_per_pack}
                            </div>
                          )}
                          {status.variant === 'low' && <StatusBadge variant="low">Reorder level</StatusBadge>}
                          {status.variant === 'critical' && <StatusBadge variant="critical">Out of stock</StatusBadge>}
                        </td>
                        <td className={`${td} font-medium`}>KSh {p.selling_price}</td>
                        <td className={`${td} text-right pr-4`}>
                          <div className="flex gap-1.5 justify-end">
                            {isOwner && (
                              <button className={`${btn.secondary} ${btnSm}`} onClick={() => setRestockTarget(p)}>
                                Restock
                              </button>
                            )}
                            <button className={`${btn.secondary} ${btnSm}`} onClick={() => navigate('/dispense')}>
                              Sell
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

      {showModal && <ProductModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      {restockTarget && (
        <ProductRestockModal
          product={restockTarget}
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
