import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getNextMonday } from '@/utils/dateUtils'
import { formatDate } from '@/utils/dateUtils'
import DatePicker from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

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

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellzettel</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Mehrere Zettel pro A4-Seite. Drucken mit Browser-Druck (Strg+P).</p>
        <div className="space-y-2 print:hidden">
          <Label>Lieferdatum (Montag)</Label>
          <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Montag wählen" />
        </div>
        <Button type="button" className="print:hidden min-h-[48px] mb-4" onClick={printSlips}>
          Drucken
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 print:gap-3">
          {orders.map(o => (
            <div
              key={o.id}
              className="border border-border rounded-xl p-4 break-inside-avoid print:border-black print:p-2 print:text-sm"
            >
              <div className="font-bold text-lg text-foreground">{o.customers?.name ?? '?'}</div>
              <div className="text-muted-foreground text-sm mb-2">{formatDate(o.delivery_date)}</div>
              <ul className="m-0 pl-5 list-disc">
                {byLayer(o).map(([layerName, { items }]) => (
                  <li key={layerName}><strong>{layerName}:</strong> {items.join(', ')}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
