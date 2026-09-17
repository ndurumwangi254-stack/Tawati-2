import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import { fieldLabel, fieldInput, btn } from '../styles/ui'

export default function MedicineModal({ onClose, onSaved }) {
  const { data: categories } = useFetch(() => api.get('/categories'), [])
  const { data: suppliers } = useFetch(() => api.get('/suppliers'), [])

  const [form, setForm] = useState({
    brandName: '',
    genericName: '',
    manufacturer: '',
    category: '',
    unit: 'Tablet',
    unitsPerPack: 1,
    sellingPrice: '',
    reorderLevel: '',
    supplierId: '',
    costPrice: '',
    quantityReceived: '',
    expiry: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f, value) {
    setForm((prev) => ({ ...prev, [f]: value }))
  }

  const unitsPerPack = Number(form.unitsPerPack) || 1
  const totalUnits = (Number(form.quantityReceived) || 0) * unitsPerPack
  const costPerUnit = form.costPrice ? (Number(form.costPrice) / unitsPerPack).toFixed(2) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/medicines', form)
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save medicine')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-5 overflow-y-auto z-40" onClick={onClose}>
      <div className="bg-white rounded-[14px] max-w-[640px] w-full mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-7 py-5 border-b border-border">
          <div>
            <h3 className="text-xl font-display font-semibold">Register New Medication</h3>
            <p className="text-sm text-muted mt-0.5">Tawati Chemist Pharmaceutical Stock Registry</p>
          </div>
          <button className="text-lg bg-transparent border-none cursor-pointer text-muted" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="p-7" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}

          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label className={fieldLabel}>
                Brand / Product Name <span className="text-danger">*</span>
              </label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. Amoxicillin Capsules, Panadol"
                value={form.brandName}
                onChange={(e) => set('brandName', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Active Ingredient / Generic Name</label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. Paracetamol, Amoxicillin Trihydrate"
                value={form.genericName}
                onChange={(e) => set('genericName', e.target.value)}
                required
              />
            </div>

            <div>
              <label className={fieldLabel}>Therapeutic Category</label>
              <select
                className={`${fieldInput} w-full mt-1.5`}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select a category</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Distributor / Manufacturer</label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. Harleys Pharma Ltd"
                value={form.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
              />
            </div>

            <div>
              <label className={fieldLabel}>
                Dispense Unit <span className="text-danger">*</span>
              </label>
              <input
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. Tablet, Bottle"
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                required
              />
              <p className="text-[13px] text-muted mt-1">The unit you sell it in — e.g. one tablet.</p>
            </div>
            <div>
              <label className={fieldLabel}>Units per Pack</label>
              <input
                type="number"
                min="1"
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. 100"
                value={form.unitsPerPack}
                onChange={(e) => set('unitsPerPack', e.target.value)}
              />
              <p className="text-[13px] text-muted mt-1">
                e.g. 100 if bought as a box of 100 tablets. Leave as 1 if bought and sold the same way.
              </p>
            </div>

            <div>
              <label className={fieldLabel}>
                Expiry Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`${fieldInput} w-full mt-1.5`}
                value={form.expiry}
                onChange={(e) => set('expiry', e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel}>
                Min Reorder Level ({form.unit || 'units'}) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. 20"
                value={form.reorderLevel}
                onChange={(e) => set('reorderLevel', e.target.value)}
                required
              />
            </div>

            <div>
              <label className={fieldLabel}>Packs Received</label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. 5"
                value={form.quantityReceived}
                onChange={(e) => set('quantityReceived', e.target.value)}
              />
              {form.quantityReceived && (
                <p className="text-[13px] text-primary mt-1">
                  = {totalUnits.toLocaleString()} {form.unit || 'units'} in stock
                </p>
              )}
            </div>
            <div>
              <label className={fieldLabel}>Cost Price per Pack (KSh)</label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. 1000"
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
              />
              {costPerUnit && <p className="text-[13px] text-muted mt-1">= KSh {costPerUnit} per {form.unit || 'unit'}</p>}
            </div>

            <div>
              <label className={fieldLabel}>
                Selling Price (KSh, per {form.unit || 'unit'}) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className={`${fieldInput} w-full mt-1.5`}
                placeholder="e.g. 180"
                value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Supplier (first batch)</label>
              <select
                className={`${fieldInput} w-full mt-1.5`}
                value={form.supplierId}
                onChange={(e) => set('supplierId', e.target.value)}
              >
                <option value="">No supplier yet</option>
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-7 pt-5 border-t border-border">
            <button type="button" className={btn.secondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btn.primary} disabled={saving}>
              {saving ? 'Saving...' : 'Save to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
