import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getNextMonday } from '../../utils/dateUtils'

type OrderRow = {
  id: string
  delivery_date: string
  customer_id: string
  customers: { name: string } | null
  order_items: { ingredient_id: string; quantity: number; ingredients: { name: string; layers: { name: string } | null } | null }[]
}

export default function OrdersTab() {
  const [deliveryDate, setDeliveryDate] = useState(getNextMonday())
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date, customer_id,
        customers ( name ),
        order_items ( ingredient_id, quantity, ingredients ( name, layers ( name ) ) )
      `).eq('delivery_date', deliveryDate).order('created_at')
      setOrders((data ?? []) as unknown as OrderRow[])
      setLoading(false)
    }
    load()
  }, [deliveryDate])

  return (
    <div className="card">
      <h2>Bestellübersicht</h2>
      <div className="form-group">
        <label>Lieferdatum (Montag)</label>
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
      </div>
      {loading ? <p>Lade …</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {orders.map(o => (
            <li key={o.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{o.customers?.name ?? '?'}</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                {o.order_items?.map((oi, idx) => (
                  <li key={idx}>
                    {oi.ingredients?.name ?? '?'} {oi.quantity > 1 ? `(${oi.quantity})` : ''}
                    {oi.ingredients?.layers?.name ? ` — ${oi.ingredients.layers.name}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {!loading && orders.length === 0 && <p className="muted">Keine Bestellungen für diesen Tag.</p>}
    </div>
  )
}
