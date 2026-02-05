import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Order, OrderItem, Ingredient, Layer } from '../types'
import { formatDate } from '../utils/dateUtils'

interface OrderWithItems extends Order {
  order_items?: (OrderItem & { ingredients?: (Ingredient & { layers?: Layer | null }) | null })[]
}

interface MyOrderProps {
  customerId: string
  deliveryDate: string
}

export default function MyOrder({ customerId, deliveryDate }: MyOrderProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: orderData } = await supabase.from('orders').select('*').eq('customer_id', customerId).eq('delivery_date', deliveryDate).maybeSingle()
      if (!orderData) {
        setLoading(false)
        return
      }
      const { data: items } = await supabase.from('order_items').select(`
        id, order_id, ingredient_id, quantity,
        ingredients ( id, name, layer_id, layers ( id, name, sort_order ) )
      `).eq('order_id', (orderData as Order).id)
      setOrder({ ...(orderData as Order), order_items: (items ?? []) as unknown as OrderWithItems['order_items'] })
      setLoading(false)
    }
    load()
  }, [customerId, deliveryDate])

  if (loading) return <p className="muted">Lade Bestellung …</p>
  if (!order || !order.order_items?.length) return null

  const byLayer: Record<string, { name: string; sort_order: number; items: { name: string; quantity: number }[] }> = {}
  for (const oi of order.order_items) {
    const ing = (oi as { ingredients?: (Ingredient & { layers?: Layer | null }) | null }).ingredients
    if (!ing) continue
    const layer = ing.layers
    const layerId = layer?.id ?? 'other'
    if (!byLayer[layerId]) {
      byLayer[layerId] = { name: layer?.name ?? 'Sonstiges', sort_order: layer?.sort_order ?? 99, items: [] }
    }
    byLayer[layerId].items.push({ name: ing.name, quantity: oi.quantity })
  }
  const sorted = Object.entries(byLayer).sort((a, b) => a[1].sort_order - b[1].sort_order)

  return (
    <div className="card">
      <h2>Meine Bestellung</h2>
      <p className="muted">{formatDate(deliveryDate)}</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sorted.map(([, g]) => (
          <li key={g.name} style={{ marginBottom: '0.5rem' }}>
            <strong>{g.name}:</strong>{' '}
            {g.items.map(i => (i.quantity > 1 ? `${i.name} (${i.quantity})` : i.name)).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  )
}
