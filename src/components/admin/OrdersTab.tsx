import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/dateUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type OrderRow = {
  id: string
  delivery_date: string
  customer_id: string
  room: string | null
  allergies: string | null
  customers: { name: string } | null
  order_items: { ingredient_id: string; quantity: number; ingredients: { name: string; layers: { name: string } | null } | null }[]
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRoom, setFilterRoom] = useState('')
  const [filterAllergies, setFilterAllergies] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date, customer_id, room, allergies,
        customers ( name ),
        order_items ( ingredient_id, quantity, ingredients ( name, layers ( name ) ) )
      `).order('delivery_date').order('room')
      if (!cancelled) {
        setOrders((data ?? []) as unknown as OrderRow[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const roomsList = useMemo(() => {
    const set = new Set<string>()
    for (const o of orders) {
      if (o.room?.trim()) set.add(o.room.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [orders])

  const filteredOrders = useMemo(() => {
    let list = orders
    if (filterRoom) {
      list = list.filter(o => (o.room ?? '').trim() === filterRoom)
    }
    if (filterAllergies.trim()) {
      const q = filterAllergies.trim().toLowerCase()
      list = list.filter(o => (o.allergies ?? '').toLowerCase().includes(q))
    }
    return list
  }, [orders, filterRoom, filterAllergies])

  const byDate = useMemo(() => {
    const map = new Map<string, OrderRow[]>()
    for (const o of filteredOrders) {
      const list = map.get(o.delivery_date) ?? []
      list.push(o)
      map.set(o.delivery_date, list)
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    return entries.map(([date, dateOrders]) => [
      date,
      [...dateOrders].sort((a, b) => (a.room ?? '').localeCompare(b.room ?? '')),
    ] as [string, OrderRow[]])
  }, [filteredOrders])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellübersicht</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Alle Bestellungen, sortiert nach Datum und Raum. Filter optional.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4 print:hidden">
          <div className="space-y-2 min-w-[140px]">
            <Label htmlFor="filter-room">Raum / Klasse</Label>
            <select
              id="filter-room"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
            >
              <option value="">Alle</option>
              {roomsList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 min-w-[160px]">
            <Label htmlFor="filter-allergies">Allergien (Suche)</Label>
            <Input
              id="filter-allergies"
              type="text"
              value={filterAllergies}
              onChange={e => setFilterAllergies(e.target.value)}
              placeholder="z. B. Nüsse"
              className="min-h-[44px]"
            />
          </div>
        </div>

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
                      {(o.room ?? o.allergies) && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {o.room && <span>Raum: {o.room}</span>}
                          {o.room && o.allergies && ' · '}
                          {o.allergies && <span>Allergien: {o.allergies}</span>}
                        </p>
                      )}
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
