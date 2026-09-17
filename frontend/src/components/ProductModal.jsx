import { useState } from 'react'
import { api } from '../api/client'
import { field, fieldLabel, fieldInput, btn } from '../styles/ui'

export default function ProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'piece',
    unitsPerPack: 1,
    sellingPrice: '',
    reorderLevel: '',
    costPrice: '',
    stockQuantity: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f, value) {
    setForm((prev) => ({ ...prev, [f]: value }))
  }

  const unitsPerPack = Number(form.unitsPerPack) || 1
  const totalUnits = (Number(form.stockQuantity) || 0) * unitsPerPack
  const costPerUnit = form.costPrice ? (Number(form.costPrice) / unitsPerPack).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/products', form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[14px] max-w-[480px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-lg font-display font-semibold">Add Shop Item</h3>
            <p className="text-sm text-muted mt-0.5">Non-medicine products — toiletries, drinks, and the like.</p>
          </div>
          <button className="text-lg bg-transparent border-none cursor-pointer text-muted" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="p-6" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}

          <div className={field}>
            <label className={fieldLabel}>
              Product Name <span className="text-danger">*</span>
            </label>
            <input
              className={`${fieldInput} w-full mt-1.5`}
              placeholder="e.g. Colgate Toothpaste 100ml"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={field}>
              <label className={fieldLabel}>Category</label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. Toiletries"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              />
            </div>
            <div className={field}>
              <label className={fieldLabel}>Sold Per</label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. piece, bottle"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={field}>
              <label className={fieldLabel}>Units per Pack</label>
              <input
                type="number"
                min="1"
                className={`${fieldInput} w-full mt-1.5`}
                value={form.unitsPerPack}
                onChange={(e) => set('unitsPerPack', e.target.value)}
              />
              <p className="text-[13px] text-muted mt-1">e.g. 24 if bought as a case of 24 bottles.</p>
            </div>
            <div className={field}>
              <label className={fieldLabel}>
                Reorder Level <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                value={form.reorderLevel}
                onChange={(e) => set('reorderLevel', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={field}>
              <label className={fieldLabel}>Packs Received</label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                value={form.stockQuantity}
                onChange={(e) => set('stockQuantity', e.target.value)}
              />
              {form.stockQuantity && (
                <p className="text-[13px] text-primary mt-1">
                  = {totalUnits.toLocaleString()} {form.unit || 'units'} in stock
                </p>
              )}
            </div>
            <div className={field}>
              <label className={fieldLabel}>Cost Price per Pack (KSh)</label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
              />
              {costPerUnit && <p className="text-[13px] text-muted mt-1">= KSh {costPerUnit} per {form.unit || 'unit'}</p>}
            </div>
          </div>

          <div className={field}>
            <label className={fieldLabel}>
              Selling Price (KSh, per {form.unit || 'unit'}) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className={`${fieldInput} w-full mt-1.5`}
              value={form.sellingPrice}
              onChange={(e) => set('sellingPrice', e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-border">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
