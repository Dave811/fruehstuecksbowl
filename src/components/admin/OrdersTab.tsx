import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getNextDeliveryDay, formatDate } from '@/utils/dateUtils'
import DatePicker from '@/components/DatePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type OrderRow = {
  id: string
  delivery_date: string
  customer_id: string
  customers: { name: string } | null
  order_items: { ingredient_id: string; quantity: number; ingredients: { name: string; layers: { name: string } | null } | null }[]
}

export default function OrdersTab() {
  const [deliveryDate, setDeliveryDate] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadDefault() {
      const { data } = await supabase.from('app_settings').select('key, value')
      const m: Record<string, string> = {}
      for (const row of data ?? []) m[row.key] = row.value ?? ''
      const weekday = parseInt(m.delivery_weekday ?? '0', 10)
      const paused = (m.paused_delivery_dates ?? '')
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean)
      const next = getNextDeliveryDay(weekday, paused)
      if (!cancelled) setDeliveryDate(d => d || next)
    }
    loadDefault()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!deliveryDate) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date, customer_id,
        customers ( name ),
        order_items ( ingredient_id, quantity, ingredients ( name, layers ( name ) ) )
      `).eq('delivery_date', deliveryDate).order('created_at')
      if (!cancelled) {
        setOrders((data ?? []) as unknown as OrderRow[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [deliveryDate])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellübersicht</CardTitle>
        <div className="space-y-2 print:hidden">
          <Label>Lieferdatum</Label>
          <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Datum wählen" />
          {deliveryDate && (
            <p className="text-muted-foreground text-sm pt-1">
              Gewählt: {formatDate(deliveryDate)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Lade …</p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-3">
            {orders.map(o => (
              <li key={o.id} className="py-3 border-b border-border last:border-0">
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
        )}
        {!loading && orders.length === 0 && <p className="text-muted-foreground text-sm">Keine Bestellungen für diesen Tag.</p>}
      </CardContent>
    </Card>
  )
}
