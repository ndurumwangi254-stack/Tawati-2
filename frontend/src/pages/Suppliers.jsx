import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import EmptyState from '../components/EmptyState'
import { pageHeader, tableScroll, table, th, td, btn, btnSm, field, fieldLabel, fieldInput } from '../styles/ui'

export default function Suppliers() {
  const { data: suppliers, loading, error, refetch } = useFetch(() => api.get('/suppliers'), [])
  const [showModal, setShowModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  async function handleDelete(supplier) {
    const confirmed = window.confirm(`Delete ${supplier.name}? This can't be undone.`)
    if (!confirmed) return

    setDeleteError('')
    setDeletingId(supplier.id)
    try {
      await api.delete(`/suppliers/${supplier.id}`)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete supplier')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className={pageHeader}>
        <h1 className="text-[22px]">Suppliers</h1>
        <button className={btn.primary} onClick={() => setShowModal(true)}>
          + Add supplier
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Loading suppliers...</p>}
      {error && <p className="text-sm text-danger">Couldn't load suppliers: {error}</p>}
      {deleteError && <p className="text-sm text-danger mb-4">{deleteError}</p>}

      {!loading && !error && suppliers?.length === 0 && (
        <EmptyState title="No suppliers added yet" actionLabel="+ Add supplier" onAction={() => setShowModal(true)} />
      )}

      {!loading && !error && suppliers?.length > 0 && (
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr>
                <th className={`${th} pl-4`}>Name</th>
                <th className={th}>Contact</th>
                <th className={th}>Phone</th>
                <th className={th}>Medicines supplied</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className={`${td} pl-4`}>{s.name}</td>
                  <td className={td}>{s.contact_person || '—'}</td>
                  <td className={td}>{s.phone || '—'}</td>
                  <td className={td}>{s.medicines_supplied}</td>
                  <td className={td}>
                    <button
                      className={`${btn.secondary} ${btnSm}`}
                      onClick={() => handleDelete(s)}
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddSupplierModal
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

function AddSupplierModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', address: '' })
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
      await api.post('/suppliers', form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[10px] max-w-[420px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="text-base">Add supplier</h3>
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
            <label className={fieldLabel}>Contact person</label>
            <input className={fieldInput} value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
          </div>
          <div className={field}>
            <label className={fieldLabel}>Phone</label>
            <input className={fieldInput} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className={field}>
            <label className={fieldLabel}>Address</label>
            <input className={fieldInput} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="flex gap-2.5 justify-end mt-2">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Save supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
