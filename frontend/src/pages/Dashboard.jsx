import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { card, resultRow } from '../styles/ui'

function StatCard({ icon, iconVariant = 'primary', label, value, sublabel, danger }) {
  const iconBg = { primary: 'bg-primary-tint text-primary', danger: 'bg-danger-tint text-danger' }
  return (
    <div className={`bg-white border rounded-[14px] p-4 ${danger ? 'border-danger/30 bg-danger-tint/40' : 'border-border'}`}>
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
        <span className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${iconBg[iconVariant]}`}>
          {icon}
        </span>
      </div>
      <div className={`font-display text-[26px] font-semibold mt-1 ${danger ? 'text-danger' : ''}`}>{value}</div>
      {sublabel && <div className="text-[13px] text-muted mt-0.5">{sublabel}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { currentUser } = useApp()
  const isOwner = currentUser?.role === 'owner'

  const { data: alerts, loading: alertsLoading, error: alertsError } = useFetch(() => api.get('/alerts'), [])
  const { data: medicines } = useFetch(() => api.get('/medicines'), [])
  const { data: movements } = useFetch(
    () => (isOwner ? api.get('/stock-movements') : Promise.resolve([])),
    [isOwner]
  )

  if (alertsLoading) return <p className="text-sm text-muted">Loading dashboard...</p>
  if (alertsError) return <p className="text-sm text-danger">Couldn't load the dashboard: {alertsError}</p>

  const { lowStock = [], outOfStock = [], expiringSoon = [] } = alerts || {}
  const totalUnits = (medicines || []).reduce((sum, m) => sum + Number(m.stock), 0)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px]">Welcome back, {currentUser?.name}</h1>
        <p className="text-sm text-muted mt-0.5">Here's how the shop looks right now.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="📦"
          label="Total Inventory"
          value={medicines ? `${medicines.length} SKUs` : '—'}
          sublabel={medicines ? `${totalUnits.toLocaleString()} units on shelves` : undefined}
        />
        <StatCard
          icon="⚠"
          iconVariant={lowStock.length ? 'danger' : 'primary'}
          label="Low Stock Alert"
          value={lowStock.length}
          sublabel="Below reorder threshold"
          danger={lowStock.length > 0}
        />
        <StatCard
          icon="📅"
          iconVariant={expiringSoon.length ? 'danger' : 'primary'}
          label="Expiry Watch"
          value={expiringSoon.length}
          sublabel="Expiring ≤ 60 days"
          danger={expiringSoon.length > 0}
        />
        <StatCard
          icon="⊘"
          iconVariant={outOfStock.length ? 'danger' : 'primary'}
          label="Out of Stock"
          value={outOfStock.length}
          sublabel="Needs immediate reorder"
          danger={outOfStock.length > 0}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="text-base mb-3">Needs attention</h3>
          {lowStock.length === 0 && outOfStock.length === 0 && expiringSoon.length === 0 ? (
            <p className="text-sm text-muted">All good — nothing needs attention right now.</p>
          ) : (
            <div>
              {outOfStock.map((m) => (
                <div className={resultRow} key={`out-${m.id}`}>
                  <span>{m.brand_name}</span>
                  <StatusBadge variant="critical">Out of stock</StatusBadge>
                </div>
              ))}
              {lowStock.map((m) => (
                <div className={resultRow} key={`low-${m.id}`}>
                  <span>
                    {m.brand_name} — {m.stock} left
                  </span>
                  <StatusBadge variant="low">Reorder at {m.reorder_level}</StatusBadge>
                </div>
              ))}
              {expiringSoon.map((m) => (
                <div className={resultRow} key={`exp-${m.id}`}>
                  <span>{m.brand_name}</span>
                  <StatusBadge variant="low">Expires {m.expiry_date?.slice(0, 10)}</StatusBadge>
                </div>
              ))}
            </div>
          )}
          <Link to="/alerts" className="text-sm inline-block mt-3 text-primary">
            View all alerts →
          </Link>
        </div>

        {isOwner && (
          <div className={card}>
            <h3 className="text-base mb-3">Recent stock movements</h3>
            {!movements || movements.length === 0 ? (
              <p className="text-sm text-muted">No stock activity yet.</p>
            ) : (
              movements.slice(0, 4).map((sm) => (
                <div className={resultRow} key={sm.id}>
                  <span>
                    {sm.quantity > 0 ? '+' : ''}
                    {sm.quantity} {sm.medicine}
                  </span>
                  <span className="text-sm text-muted capitalize">{sm.type}</span>
                </div>
              ))
            )}
            <Link to="/stock" className="text-sm inline-block mt-3 text-primary">
              View full log →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
