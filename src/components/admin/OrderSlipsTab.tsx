import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getNextMonday } from '../../utils/dateUtils'
import { formatDate } from '../../utils/dateUtils'

type OrderForSlip = {
  id: string
  delivery_date: string
  customers: { name: string } | null
  order_items: { quantity: number; ingredients: { name: string; layers: { name: string; sort_order: number } | null } | null }[]
}

export default function OrderSlipsTab() {
  const [deliveryDate, setDeliveryDate] = useState(getNextMonday())
  const [orders, setOrders] = useState<OrderForSlip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date,
        customers ( name ),
        order_items ( quantity, ingredients ( name, layers ( name, sort_order ) ) )
      `).eq('delivery_date', deliveryDate).order('created_at')
      setOrders((data ?? []) as unknown as OrderForSlip[])
      setLoading(false)
    }
    load()
  }, [deliveryDate])

  function printSlips() {
    window.print()
  }

  const byLayer = (order: OrderForSlip) => {
    const map: Record<string, { sort_order: number; items: string[] }> = {}
    for (const oi of order.order_items ?? []) {
      const layer = oi.ingredients?.layers
      const name = oi.ingredients?.name ?? '?'
      const q = oi.quantity > 1 ? ` ${oi.quantity}x` : ''
      const key = layer?.name ?? 'Sonstiges'
      const so = layer?.sort_order ?? 99
      if (!map[key]) map[key] = { sort_order: so, items: [] }
      map[key].items.push(name + q)
    }
    return Object.entries(map).sort((a, b) => a[1].sort_order - b[1].sort_order)
  }

  if (loading) return <p>Lade …</p>

  return (
    <div className="card">
      <h2>Bestellzettel</h2>
      <p className="muted">Mehrere Zettel pro A4-Seite. Drucken mit Browser-Druck (Strg+P).</p>
      <div className="form-group no-print">
        <label>Lieferdatum (Montag)</label>
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
      </div>
      <button type="button" className="btn no-print" onClick={printSlips} style={{ marginBottom: '1rem' }}>
        Drucken
      </button>
      <div className="slips-print">
        {orders.map(o => (
          <div key={o.id} className="slip-card">
            <div className="slip-name">{o.customers?.name ?? '?'}</div>
            <div className="slip-date">{formatDate(o.delivery_date)}</div>
            <ul className="slip-list">
              {byLayer(o).map(([layerName, { items }]) => (
                <li key={layerName}><strong>{layerName}:</strong> {items.join(', ')}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
