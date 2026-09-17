import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import { field, fieldLabel, fieldInput, btn } from '../styles/ui'

export default function RestockModal({ medicine, onClose, onSaved }) {
  const { data: suppliers } = useFetch(() => api.get('/suppliers'), [])

  const [form, setForm] = useState({ supplierId: '', quantity: '', costPrice: '', expiry: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f, value) {
    setForm((prev) => ({ ...prev, [f]: value }))
  }

  const unitsPerPack = medicine.units_per_pack || 1
  const totalUnits = (Number(form.quantity) || 0) * unitsPerPack
  const costPerUnit = form.costPrice ? (Number(form.costPrice) / unitsPerPack).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/medicines/${medicine.id}/batches`, form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to restock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[14px] max-w-[460px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-lg font-display font-semibold">Restock {medicine.brand_name}</h3>
            <p className="text-sm text-muted mt-0.5">
              {unitsPerPack > 1
                ? `Sold per ${medicine.unit} · ${unitsPerPack} ${medicine.unit}s per pack`
                : `Sold per ${medicine.unit}`}
            </p>
          </div>
          <button className="text-lg bg-transparent border-none cursor-pointer text-muted" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="p-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}

          <div className={field}>
            <label className={fieldLabel}>Supplier</label>
            <select className={`${fieldInput} w-full mt-1.5`} value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
              <option value="">Not specified</option>
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className={field}>
            <label className={fieldLabel}>{unitsPerPack > 1 ? 'Packs Received' : `${medicine.unit}s Received`}</label>
            <input
              type="number"
              className={`${fieldInput} w-full mt-1.5`}
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              required
            />
            {unitsPerPack > 1 && form.quantity && (
              <p className="text-[13px] text-primary mt-1">
                = {totalUnits.toLocaleString()} {medicine.unit}s added to stock
              </p>
            )}
          </div>

          <div className={field}>
            <label className={fieldLabel}>
              {unitsPerPack > 1 ? 'Cost Price per Pack (KSh)' : `Cost Price per ${medicine.unit} (KSh)`}
            </label>
            <input
              type="number"
              className={`${fieldInput} w-full mt-1.5`}
              value={form.costPrice}
              onChange={(e) => set('costPrice', e.target.value)}
            />
            {unitsPerPack > 1 && costPerUnit && (
              <p className="text-[13px] text-muted mt-1">= KSh {costPerUnit} per {medicine.unit}</p>
            )}
          </div>

          <div className={field}>
            <label className={fieldLabel}>Expiry Date</label>
            <input
              type="date"
              className={`${fieldInput} w-full mt-1.5`}
              value={form.expiry}
              onChange={(e) => set('expiry', e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-border">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Add to Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
