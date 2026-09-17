import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { btn, btnSm } from '../styles/ui'

function daysUntil(dateStr) {
  return Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function Section({ icon, title, subtitle, tone, count, children }) {
  const tones = {
    danger: 'bg-danger-tint border-danger/30',
    warning: 'bg-warning-tint border-warning/30',
    neutral: 'bg-white border-border',
  }
  const textTones = { danger: 'text-danger', warning: 'text-warning', neutral: 'text-ink' }

  return (
    <div className={`border rounded-[14px] overflow-hidden mb-4 ${tones[tone]}`}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className={`text-lg ${textTones[tone]}`}>{icon}</span>
          <h3 className={`font-display font-semibold ${textTones[tone]}`}>
            {title} {count !== undefined && `(${count})`}
          </h3>
        </div>
        {subtitle && <p className={`text-sm mt-1 ${tone === 'neutral' ? 'text-muted' : textTones[tone]}`}>{subtitle}</p>}
      </div>
      {count > 0 && <div className="bg-white">{children}</div>}
    </div>
  )
}

export default function Alerts() {
  const { data: alerts, loading, error } = useFetch(() => api.get('/alerts'), [])

  if (loading) return <p className="text-sm text-muted">Loading alerts...</p>
  if (error) return <p className="text-sm text-danger">Couldn't load alerts: {error}</p>

  const lowStock = alerts?.lowStock || []
  const expiringSoon = alerts?.expiringSoon || []
  const expired = alerts?.expired || []

  const nothingAtAll = lowStock.length === 0 && expiringSoon.length === 0 && expired.length === 0

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px]">Alerts</h1>
        <p className="text-sm text-muted mt-0.5">Quality assurance and reorder vigilance for Tawati Chemist.</p>
      </div>

      {nothingAtAll ? (
        <EmptyState icon="✓" title="All good" description="Nothing needs attention right now." />
      ) : (
        <>
          <Section icon="⛔" title="Expired" tone="danger" count={expired.length} subtitle="These batches have passed their expiry date and must not be dispensed.">
            {expired.map((m) => (
              <div key={m.id} className="flex justify-between items-center px-5 py-3.5 border-t border-border">
                <div>
                  <div className="font-medium">{m.brand_name}</div>
                  <div className="text-sm text-danger">Expired {m.expiry_date?.slice(0, 10)}</div>
                </div>
              </div>
            ))}
          </Section>

          <Section
            icon="📅"
            title="Expiring Soon"
            tone="warning"
            count={expiringSoon.length}
            subtitle="Prioritize dispensing these first, or contact the supplier for stock rotation."
          >
            {expiringSoon.map((m) => (
              <div key={m.id} className="flex justify-between items-center px-5 py-3.5 border-t border-border">
                <div>
                  <div className="font-medium">{m.brand_name}</div>
                  <div className="text-sm text-warning">
                    Expiring in {daysUntil(m.expiry_date)}d ({m.expiry_date?.slice(0, 10)})
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Section icon="⚠" title="Low Stock" tone="neutral" count={lowStock.length} subtitle="Below the reorder threshold — worth restocking soon.">
            {lowStock.map((m) => (
              <div key={m.id} className="flex justify-between items-center px-5 py-3.5 border-t border-border">
                <div>
                  <div className="font-medium">{m.brand_name}</div>
                  <div className="text-sm text-muted">
                    {m.stock} left · reorder at {m.reorder_level}
                  </div>
                </div>
                <button className={`${btn.secondary} ${btnSm}`}>Reorder</button>
              </div>
            ))}
          </Section>
        </>
      )}
    </>
  )
}
