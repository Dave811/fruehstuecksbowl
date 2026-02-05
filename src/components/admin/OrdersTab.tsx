import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getNextMonday } from '@/utils/dateUtils'
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
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellübersicht</CardTitle>
        <div className="space-y-2 print:hidden">
          <Label>Lieferdatum (Montag)</Label>
          <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Montag wählen" />
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
