import { useMemo, useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../api/client'
import { pageHeader, fieldLabel, btn, btnSm, banner, resultRow } from '../styles/ui'

export default function Dispense() {
  const { data: allMedicines, refetch: refetchMedicines } = useFetch(() => api.get('/medicines'), [])
  const { data: allProducts, refetch: refetchProducts } = useFetch(() => api.get('/products'), [])
  const { data: allPatients } = useFetch(() => api.get('/patients'), [])

  const [browseTab, setBrowseTab] = useState('medicines') // 'medicines' | 'products'
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([]) // { type: 'medicine' | 'product', id, qty }
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [patientQuery, setPatientQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [saleError, setSaleError] = useState('')
  const [saleComplete, setSaleComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const medicines = allMedicines || []
  const products = allProducts || []

  function stockOf(item, type) {
    return type === 'medicine' ? Number(item.stock) : Number(item.stock_quantity)
  }
  function priceOf(item) {
    return Number(item.selling_price)
  }
  function nameOf(item, type) {
    return type === 'medicine' ? item.brand_name : item.name
  }
  function findItem(type, id) {
    return (type === 'medicine' ? medicines : products).find((i) => i.id === id)
  }

  const visibleItems = useMemo(() => {
    const source = browseTab === 'medicines' ? medicines : products
    if (!query.trim()) return source
    const q = query.toLowerCase()
    return source.filter((i) =>
      browseTab === 'medicines'
        ? i.brand_name.toLowerCase().includes(q) || i.generic_name.toLowerCase().includes(q)
        : i.name.toLowerCase().includes(q)
    )
  }, [query, browseTab, medicines, products])

  const patientResults = useMemo(() => {
    if (!patientQuery.trim() || !allPatients) return []
    const q = patientQuery.toLowerCase()
    return allPatients.filter((p) => p.name.toLowerCase().includes(q))
  }, [patientQuery, allPatients])

  function addToCart(type, item) {
    if (stockOf(item, type) === 0) return
    setSaleComplete(false)
    setCart((prev) => {
      const existing = prev.find((c) => c.type === type && c.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.type === type && c.id === item.id ? { ...c, qty: Math.min(c.qty + 1, stockOf(item, type)) } : c
        )
      }
      return [...prev, { type, id: item.id, qty: 1 }]
    })
  }

  function updateQty(type, id, qty) {
    setCart((prev) => prev.map((c) => (c.type === type && c.id === id ? { ...c, qty } : c)))
  }

  function removeFromCart(type, id) {
    setCart((prev) => prev.filter((c) => !(c.type === type && c.id === id)))
  }

  const cartLines = cart
    .map((c) => {
      const item = findItem(c.type, c.id)
      if (!item) return null
      return { ...c, item, subtotal: priceOf(item) * c.qty }
    })
    .filter(Boolean)

  const total = cartLines.reduce((sum, l) => sum + l.subtotal, 0)
  const received = parseFloat(amountReceived) || 0
  const change = paymentMethod === 'cash' ? Math.max(received - total, 0) : 0
  const canComplete = cartLines.length > 0 && (paymentMethod === 'mpesa' || received >= total) && !submitting

  async function completeSale() {
    setSubmitting(true)
    setSaleError('')
    try {
      await api.post('/sales', {
        items: cartLines.map((l) =>
          l.type === 'medicine'
            ? { medicineId: l.id, quantity: l.qty }
            : { productId: l.id, quantity: l.qty }
        ),
        paymentMethod,
        patientId: selectedPatient?.id || null,
      })
      setSaleComplete(true)
      setCart([])
      setAmountReceived('')
      setSelectedPatient(null)
      refetchMedicines()
      refetchProducts()
    } catch (err) {
      setSaleError(err.message || "Sale didn't go through.")
    } finally {
      setSubmitting(false)
    }
  }

  async function quickAddUsual(patientSummary) {
    setSelectedPatient(patientSummary)
    setPatientQuery('')
    try {
      const full = await api.get(`/patients/${patientSummary.id}`)
      full.usualMedicines.forEach((um) => {
        const match = medicines.find((m) => m.generic_name === um.generic_name && stockOf(m, 'medicine') > 0)
        if (match) addToCart('medicine', match)
      })
    } catch {
      // If the lookup fails, the patient is still attached to the sale —
      // just without the usual-medicines shortcut for this visit.
    }
  }

  return (
    <>
      <div className={pageHeader}>
        <h1 className="text-[22px]">Dispense</h1>
      </div>

      {saleError && (
        <div className={banner.danger}>
          <div>
            <strong>Sale didn't go through.</strong> {saleError} Nothing was charged — your cart is still here.
          </div>
        </div>
      )}
      {saleComplete && <div className={banner.ok}>Sale completed.</div>}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        {/* Item browser */}
        <div className="bg-white border border-border rounded-[14px] p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary text-lg">⛓</span>
            <h3 className="text-lg font-display font-semibold">Select Items to Sell</h3>
          </div>
          <p className="text-sm text-muted mb-4">Click anything below to add it to the current sale.</p>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setBrowseTab('medicines')}
              className={`px-4 py-2 rounded-pill text-sm font-medium border ${
                browseTab === 'medicines' ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-borderStrong'
              }`}
            >
              💊 Medicines
            </button>
            <button
              onClick={() => setBrowseTab('products')}
              className={`px-4 py-2 rounded-pill text-sm font-medium border ${
                browseTab === 'products' ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-borderStrong'
              }`}
            >
              🧴 Shop Items
            </button>
          </div>

          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">⌕</span>
            <input
              className="w-full pl-8 pr-3 py-2.5 border border-borderStrong rounded-pill text-sm focus:outline focus:outline-2 focus:outline-primary"
              placeholder={browseTab === 'medicines' ? 'Search name, generic name...' : 'Search item name...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {visibleItems.length === 0 ? (
            <p className="text-sm text-muted">
              {browseTab === 'medicines' ? 'No medicines' : 'No shop items'} match "{query}".
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleItems.map((item) => {
                const type = browseTab === 'medicines' ? 'medicine' : 'product'
                const stock = stockOf(item, type)
                const reorder = item.reorder_level
                const stockColor = stock === 0 ? 'text-danger' : stock <= reorder ? 'text-warning' : 'text-muted'
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(type, item)}
                    disabled={stock === 0}
                    className="text-left border border-border rounded-[10px] p-4 hover:border-primary hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium">{nameOf(item, type)}</div>
                    <div className="text-sm text-muted mt-0.5">{type === 'medicine' ? item.generic_name : item.category || item.unit}</div>
                    <div className="flex justify-between items-end mt-3">
                      <span className="text-success font-semibold">KSh {item.selling_price}</span>
                      <span className={`text-sm ${stockColor}`}>{stock === 0 ? 'Out of stock' : `${stock} in stock`}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Dispensary tray */}
        <div className="bg-white border border-border rounded-[14px] overflow-hidden">
          <div className="bg-ink px-5 py-4 flex items-center gap-2.5">
            <span className="text-primary text-lg">🛒</span>
            <div>
              <div className="text-white font-medium">Dispensary Tray</div>
              <div className="text-gray-400 text-[13px]">{cartLines.length} item(s) staged for sale</div>
            </div>
          </div>

          <div className="p-5">
            {cartLines.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🛒</div>
                <p className="text-sm font-medium">The dispensary tray is empty</p>
                <p className="text-sm text-muted mt-1">Click on items from the left to add them.</p>
              </div>
            ) : (
              cartLines.map((l) => (
                <div className={resultRow} key={`${l.type}-${l.id}`}>
                  <div>
                    <div className="font-medium">{nameOf(l.item, l.type)}</div>
                    <div className="text-muted text-[13px] flex items-center gap-1.5">
                      KSh {l.item.selling_price} ×
                      <input
                        type="number"
                        min={1}
                        max={stockOf(l.item, l.type)}
                        value={l.qty}
                        onChange={(e) =>
                          updateQty(l.type, l.id, Math.max(1, Math.min(Number(e.target.value), stockOf(l.item, l.type))))
                        }
                        className="w-[50px] px-1.5 py-0.5 border border-borderStrong rounded"
                      />
                      {l.qty >= stockOf(l.item, l.type) && (
                        <span className="text-[13px] text-warning">only {stockOf(l.item, l.type)} left</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>KSh {l.subtotal}</span>
                    <button className={`${btn.secondary} ${btnSm}`} onClick={() => removeFromCart(l.type, l.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="mt-4">
              <label className={fieldLabel}>Customer / Patient Name</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">◎</span>
                <input
                  className="w-full pl-8 pr-3 py-2.5 border border-borderStrong rounded-md text-sm focus:outline focus:outline-2 focus:outline-primary"
                  placeholder="Walk-in Patient"
                  value={selectedPatient ? selectedPatient.name : patientQuery}
                  onChange={(e) => {
                    setSelectedPatient(null)
                    setPatientQuery(e.target.value)
                  }}
                />
              </div>
              {selectedPatient && (
                <p className="text-sm mt-2">
                  Attached: <strong>{selectedPatient.name}</strong>{' '}
                  <button className="text-sm text-muted underline ml-1" onClick={() => setSelectedPatient(null)}>
                    remove
                  </button>
                </p>
              )}
              {!selectedPatient && patientQuery && patientResults.length > 0 && (
                <div className="mt-2 border border-border rounded-md overflow-hidden">
                  {patientResults.map((p) => (
                    <div className={`${resultRow} px-3`} key={p.id}>
                      <div>
                        <div className="text-sm">{p.name}</div>
                        {p.is_chronic && <div className="text-[13px] text-muted">Chronic patient</div>}
                      </div>
                      <button className={`${btn.secondary} ${btnSm}`} onClick={() => quickAddUsual(p)}>
                        {p.is_chronic ? 'Quick add usual' : 'Attach'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className={fieldLabel}>Payment Method</label>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2.5 rounded-md text-sm font-medium border ${
                    paymentMethod === 'cash' ? 'bg-primary text-white border-primary' : 'bg-white text-ink border-borderStrong'
                  }`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`flex-1 py-2.5 rounded-md text-sm font-medium border ${
                    paymentMethod === 'mpesa' ? 'bg-primary text-white border-primary' : 'bg-white text-ink border-borderStrong'
                  }`}
                >
                  M-Pesa / Mobile
                </button>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <>
                <div className="mt-4">
                  <label className={fieldLabel} htmlFor="received">
                    Amount received (KSh)
                  </label>
                  <input
                    id="received"
                    type="number"
                    className="w-full mt-1.5 px-3 py-2.5 border border-borderStrong rounded-md text-sm"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className={resultRow}>
                  <span className="text-sm">Change due</span>
                  <strong>KSh {change}</strong>
                </div>
              </>
            )}

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <span className="font-medium">Total Payable:</span>
              <span className="text-2xl font-display font-bold text-success">KSh {total}</span>
            </div>

            <button className={`${btn.primary} w-full mt-4`} disabled={!canComplete} onClick={completeSale}>
              {submitting ? 'Completing...' : '✓ Complete Dispense'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
