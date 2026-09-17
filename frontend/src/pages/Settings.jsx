import { useEffect, useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import { pageHeader, card, field, fieldLabel, fieldInput, btn, btnSm, resultRow, badge } from '../styles/ui'

export default function Settings() {
  const { data: shop, loading: shopLoading, refetch: refetchShop } = useFetch(() => api.get('/settings'), [])
  const { data: users, loading: usersLoading, refetch: refetchUsers } = useFetch(() => api.get('/users'), [])

  const [shopForm, setShopForm] = useState({ name: '', phone: '', address: '' })
  const [savingShop, setSavingShop] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showAddWorker, setShowAddWorker] = useState(false)

  useEffect(() => {
    if (shop) setShopForm({ name: shop.name || '', phone: shop.phone || '', address: shop.address || '' })
  }, [shop])

  async function saveShop() {
    setSavingShop(true)
    try {
      await api.put('/settings', shopForm)
      refetchShop()
    } catch {
      // Kept quiet in the UI for now — a toast/error banner can be added
      // once there's a shared notification pattern across the app.
    } finally {
      setSavingShop(false)
    }
  }

  async function toggleStatus(u) {
    await api.patch(`/users/${u.id}/status`, { status: u.status === 'active' ? 'deactivated' : 'active' })
    setOpenMenuId(null)
    refetchUsers()
  }

  return (
    <>
      <div className={pageHeader}>
        <h1 className="text-[22px]">Settings</h1>
      </div>

      <div className={card}>
        <h3 className="text-base mb-3">Shop details</h3>
        {shopLoading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : (
          <>
            <div className={field}>
              <label className={fieldLabel}>Name</label>
              <input className={fieldInput} value={shopForm.name} onChange={(e) => setShopForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={fieldLabel}>Phone</label>
              <input className={fieldInput} value={shopForm.phone} onChange={(e) => setShopForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className={field}>
              <label className={fieldLabel}>Address</label>
              <input
                className={fieldInput}
                value={shopForm.address}
                onChange={(e) => setShopForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <button className={btn.primary} onClick={saveShop} disabled={savingShop}>
              {savingShop ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
      </div>

      <div className={`${card} mt-4`}>
        <div className={`${pageHeader} mb-3`}>
          <h3 className="text-base">Staff accounts</h3>
          <button className={`${btn.secondary} ${btnSm}`} onClick={() => setShowAddWorker(true)}>
            + Add worker
          </button>
        </div>
        {usersLoading && <p className="text-sm text-muted">Loading...</p>}
        {!usersLoading &&
          (users || [])
            .filter((u) => u.role === 'worker')
            .map((u) => (
              <div className={`${resultRow} relative`} key={u.id}>
                <div>
                  <div>{u.name}</div>
                  <div className="text-sm text-muted">Worker</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={u.status === 'active' ? badge.ok : badge.muted}>
                    {u.status === 'active' ? 'Active' : 'Deactivated'}
                  </span>
                  <button
                    className="p-1.5 rounded-md hover:bg-gray-100"
                    onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                    aria-label="Actions"
                  >
                    ⋯
                  </button>
                  {openMenuId === u.id && (
                    <div className="absolute top-[46px] right-0 bg-white border border-border rounded-[10px] shadow-lg min-w-[180px] p-2 z-20">
                      <button className="block w-full text-left px-2.5 py-2 rounded-md text-sm hover:bg-gray-100" onClick={() => toggleStatus(u)}>
                        {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <ResetPasswordButton userId={u.id} onDone={() => setOpenMenuId(null)} />
                    </div>
                  )}
                </div>
              </div>
            ))}
        {!usersLoading && (users || []).filter((u) => u.role === 'worker').length === 0 && (
          <p className="text-sm text-muted">No worker accounts yet.</p>
        )}
      </div>

      {showAddWorker && (
        <AddWorkerModal
          onClose={() => setShowAddWorker(false)}
          onSaved={() => {
            setShowAddWorker(false)
            refetchUsers()
          }}
        />
      )}
    </>
  )
}

function ResetPasswordButton({ userId, onDone }) {
  const [resetting, setResetting] = useState(false)

  async function handleClick() {
    const newPassword = window.prompt('New password for this account (min 6 characters):')
    if (!newPassword) return
    setResetting(true)
    try {
      await api.post(`/users/${userId}/reset-password`, { password: newPassword })
    } finally {
      setResetting(false)
      onDone()
    }
  }

  return (
    <button className="block w-full text-left px-2.5 py-2 rounded-md text-sm hover:bg-gray-100" onClick={handleClick} disabled={resetting}>
      Reset password
    </button>
  )
}

function AddWorkerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' })
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
      await api.post('/users', form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to create worker account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[10px] max-w-[420px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border">
          <h3 className="text-base">Add worker</h3>
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
            <label className={fieldLabel}>Username</label>
            <input className={fieldInput} value={form.username} onChange={(e) => set('username', e.target.value)} required />
          </div>
          <div className={field}>
            <label className={fieldLabel}>Temporary password</label>
            <input
              type="password"
              className={fieldInput}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-2.5 justify-end mt-2">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Save worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
