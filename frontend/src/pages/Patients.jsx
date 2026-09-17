import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import {
  pageHeader,
  toolbar,
  searchInput,
  tableScroll,
  table,
  th,
  td,
  card,
  resultRow,
  btn,
  btnSm,
  field,
  fieldLabel,
  fieldInput,
} from '../styles/ui'

export default function Patients() {
  const { data: patients, loading, error, refetch } = useFetch(() => api.get('/patients'), [])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const filtered = (patients || []).filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  if (selectedId) {
    return <PatientProfile patientId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <>
      <div className={pageHeader}>
        <h1 className="text-[22px]">Patients</h1>
        <button className={btn.primary} onClick={() => setShowModal(true)}>
          + Add patient
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Loading patients...</p>}
      {error && <p className="text-sm text-danger">Couldn't load patients: {error}</p>}

      {!loading && !error && patients?.length === 0 && (
        <EmptyState
          title="No patient records yet"
          description="Patients are added optionally at checkout, mainly for regulars and chronic patients."
        />
      )}

      {!loading && !error && patients?.length > 0 && (
        <>
          <div className={toolbar}>
            <input className={searchInput} placeholder="Search patients..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className={tableScroll}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={`${th} pl-4`}>Name</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)} className="cursor-pointer hover:bg-gray-50">
                    <td className={`${td} pl-4`}>{p.name}</td>
                    <td className={td}>{p.phone || '—'}</td>
                    <td className={td}>{p.is_chronic && <StatusBadge variant="info">Chronic</StatusBadge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <AddPatientModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            refetch()
          }}
        />
      )}
    </>
  )
}

function PatientProfile({ patientId, onBack }) {
  const navigate = useNavigate()
  const { data: patient, loading, error } = useFetch(() => api.get(`/patients/${patientId}`), [patientId])

  if (loading) return <p className="text-sm text-muted">Loading...</p>
  if (error) return <p className="text-sm text-danger">Couldn't load this patient: {error}</p>
  if (!patient) return null

  return (
    <>
      <button className={`${btn.secondary} ${btnSm} mb-4`} onClick={onBack}>
        ← Back
      </button>

      <div className={pageHeader}>
        <div>
          <h1 className="text-[22px]">{patient.name}</h1>
          {patient.is_chronic && <StatusBadge variant="info">Chronic patient</StatusBadge>}
          <p className="text-sm text-muted mt-1.5">{patient.phone}</p>
        </div>
      </div>

      {patient.usualMedicines?.length > 0 && (
        <div className={card}>
          <h3 className="text-base mb-3">Usual medicines</h3>
          {patient.usualMedicines.map((um) => {
            const daysSince = um.last_purchased_at
              ? Math.round((new Date() - new Date(um.last_purchased_at)) / (1000 * 60 * 60 * 24))
              : null
            const refillDue = daysSince != null && um.typical_interval_days != null && daysSince >= um.typical_interval_days
            return (
              <div className={resultRow} key={um.generic_name}>
                <div>
                  <div>{um.generic_name}</div>
                  {um.typical_interval_days && <div className="text-sm text-muted">every ~{um.typical_interval_days} days</div>}
                </div>
                {refillDue ? (
                  <StatusBadge variant="low">Refill due — last bought {daysSince}d ago</StatusBadge>
                ) : (
                  <span className="text-sm text-muted">
                    {daysSince != null ? `last bought ${daysSince}d ago` : 'no purchases yet'}
                  </span>
                )}
              </div>
            )
          })}
          <button className={`${btn.primary} ${btnSm} mt-3`} onClick={() => navigate('/dispense')}>
            Go to Dispense
          </button>
        </div>
      )}

      <div className={`${card} mt-4`}>
        <h3 className="text-base mb-3">Purchase history</h3>
        {!patient.history || patient.history.length === 0 ? (
          <p className="text-sm text-muted">No purchases recorded yet.</p>
        ) : (
          patient.history.map((h) => (
            <div className={resultRow} key={`${h.sale_id}-${h.brand_name}`}>
              <span>
                {h.created_at?.slice(0, 10)} — {h.brand_name} ({h.generic_name}) ×{h.quantity}
              </span>
              <span>KSh {h.subtotal}</span>
            </div>
          ))
        )}
      </div>

      <div className={`${card} mt-4`}>
        <h3 className="text-base mb-3">Notes</h3>
        <p className="text-sm">{patient.notes || 'No notes yet.'}</p>
      </div>
    </>
  )
}

function AddPatientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', isChronic: false, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f, value) {
    setForm((prev) => ({ ...prev, [f]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/patients', form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[10px] max-w-[420px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="text-base">Add patient</h3>
          <button className="text-lg bg-transparent border-none cursor-pointer" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form className="p-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}
          <div className={field}>
            <label className={fieldLabel}>Name</label>
            <input className={fieldInput} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className={field}>
            <label className={fieldLabel}>Phone</label>
            <input className={fieldInput} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className={field}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isChronic} onChange={(e) => set('isChronic', e.target.checked)} />
              Chronic patient
            </label>
          </div>
          <div className={field}>
            <label className={fieldLabel}>Notes</label>
            <input className={fieldInput} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex gap-2.5 justify-end mt-2">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Save patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
