import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/dateUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OrderRow = {
  id: string
  delivery_date: string
  customer_id: string
  customers: { name: string } | null
  order_items: { ingredient_id: string; quantity: number; ingredients: { name: string; layers: { name: string } | null } | null }[]
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date, customer_id,
        customers ( name ),
        order_items ( ingredient_id, quantity, ingredients ( name, layers ( name ) ) )
      `).order('delivery_date').order('created_at')
      if (!cancelled) {
        setOrders((data ?? []) as unknown as OrderRow[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const byDate = useMemo(() => {
    const map = new Map<string, OrderRow[]>()
    for (const o of orders) {
      const list = map.get(o.delivery_date) ?? []
      list.push(o)
      map.set(o.delivery_date, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [orders])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellübersicht</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Alle Bestellungen, gruppiert nach Lieferdatum.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Lade …</p>
        ) : byDate.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine Bestellungen.</p>
        ) : (
          <div className="space-y-6">
            {byDate.map(([date, dateOrders]) => (
              <section key={date}>
                <h3 className="text-base font-semibold text-foreground mb-2">{formatDate(date)}</h3>
                <ul className="list-none p-0 m-0 space-y-3">
                  {dateOrders.map(o => (
                    <li key={o.id} className="py-2 pl-3 border-l-2 border-border">
                      <strong className="text-foreground">{o.customers?.name ?? '?'}</strong>
                      <ul className="mt-1 ml-4 p-0 text-sm text-muted-foreground">
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
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
