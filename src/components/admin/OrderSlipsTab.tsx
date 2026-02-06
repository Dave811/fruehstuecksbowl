import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { renderOrderSlipsPdf } from '@/components/admin/OrderSlipsDocument'
import type { Layer, Ingredient } from '@/types'
import { getNextDeliveryDay, formatDate, isDeliverableDate } from '@/utils/dateUtils'
import DatePicker from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type OrderForSlip = {
  id: string
  delivery_date: string
  room: string | null
  allergies: string | null
  customers: { name: string } | null
  order_items: { quantity: number; ingredients: { name: string; icon_url?: string | null; layers: { name: string; sort_order: number; icon_url?: string | null } | null } | null }[]
}

export default function OrderSlipsTab() {
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryWeekday, setDeliveryWeekday] = useState(0)
  const [pausedDeliveryDates, setPausedDeliveryDates] = useState<string[]>([])
  const [orders, setOrders] = useState<OrderForSlip[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadDefault() {
      const { data } = await supabase.from('app_settings').select('key, value')
      const m: Record<string, string> = {}
      for (const row of data ?? []) m[row.key] = row.value ?? ''
      const weekday = parseInt(m.delivery_weekday ?? '0', 10)
      const paused = (m.paused_delivery_dates ?? '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      if (!cancelled) {
        setDeliveryWeekday(weekday)
        setPausedDeliveryDates(paused)
        setDeliveryDate(d => d || getNextDeliveryDay(weekday, paused))
      }
    }
    loadDefault()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadLayersAndIngredients() {
      const [layRes, ingRes] = await Promise.all([
        supabase.from('layers').select('*').order('sort_order'),
        supabase.from('ingredients').select('*').order('sort_order'),
      ])
      if (!cancelled) {
        setLayers((layRes.data ?? []) as Layer[])
        setIngredients((ingRes.data ?? []) as Ingredient[])
      }
    }
    loadLayersAndIngredients()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!deliveryDate) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('orders').select(`
        id, delivery_date, room, allergies,
        customers ( name ),
        order_items ( quantity, ingredients ( name, icon_url, layers ( name, sort_order, icon_url ) ) )
      `).eq('delivery_date', deliveryDate).order('room').order('created_at')
      if (!cancelled) {
        setOrders((data ?? []) as unknown as OrderForSlip[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [deliveryDate])

  const basisLabel = useMemo(() => {
    const displayLayer = layers.find(l => l.selection_type === 'display_only')
    if (!displayLayer) return '—'
    const ings = ingredients.filter(i => i.layer_id === displayLayer.id)
    return ings.length ? ings.map(i => i.name).join(', ') : '—'
  }, [layers, ingredients])

  const byRoom = useMemo(() => {
    const map = new Map<string, OrderForSlip[]>()
    for (const o of orders) {
      const key = (o.room ?? '').trim() || '—'
      const list = map.get(key) ?? []
      list.push(o)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [orders])

  const flatOrdersForPdf = useMemo(
    () => byRoom.flatMap(([, roomOrders]) => roomOrders),
    [byRoom]
  )

  function printSlips() {
    window.print()
  }

  function getExtrasList(order: OrderForSlip): string[] {
    const items: string[] = []
    for (const oi of order.order_items ?? []) {
      const name = oi.ingredients?.name ?? '?'
      const q = oi.quantity > 1 ? ` ${oi.quantity}x` : ''
      items.push(name + q)
    }
    return items
  }

  type LayerBlock = { layerName: string; sortOrder: number; layerIconUrl?: string | null; items: { text: string; icon_url?: string | null }[] }

  function getOrderLayers(order: OrderForSlip): LayerBlock[] {
    const byLayer = new Map<string, { sortOrder: number; layerIconUrl?: string | null; items: { text: string; icon_url?: string | null }[] }>()
    for (const oi of order.order_items ?? []) {
      const layer = oi.ingredients?.layers
      const name = oi.ingredients?.name ?? '?'
      const q = oi.quantity > 1 ? ` ${oi.quantity}x` : ''
      const key = layer?.name ?? 'Sonstiges'
      const so = layer?.sort_order ?? 99
      if (!byLayer.has(key)) byLayer.set(key, { sortOrder: so, layerIconUrl: layer?.icon_url, items: [] })
      byLayer.get(key)!.items.push({ text: name + q, icon_url: oi.ingredients?.icon_url })
    }
    const sorted = Array.from(byLayer.entries())
      .map(([layerName, { sortOrder, layerIconUrl, items }]) => ({ layerName, sortOrder, layerIconUrl, items }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const basisFromOrder = sorted.find(b => b.layerName === 'Basis')
    if (basisFromOrder) {
      if (basisLabel !== '—') {
        basisFromOrder.items = [{ text: basisLabel }, ...basisFromOrder.items]
      }
      return sorted
    }
    if (basisLabel !== '—') {
      return [{ layerName: 'Basis', sortOrder: -1, items: [{ text: basisLabel }] }, ...sorted]
    }
    return sorted
  }

  const slipsDataForPdf = useMemo(() => {
    return flatOrdersForPdf.map(order => ({
      order: {
        id: order.id,
        delivery_date: order.delivery_date,
        room: order.room,
        allergies: order.allergies,
        customers: order.customers,
      },
      layers: getOrderLayers(order).map(({ layerName, layerIconUrl, items }) => ({
        layerName,
        layerIconUrl: layerIconUrl ?? undefined,
        items: items.map(i => ({ text: i.text, icon_url: i.icon_url ?? undefined })),
      })),
    }))
  }, [flatOrdersForPdf, basisLabel])

  async function generatePdf() {
    if (flatOrdersForPdf.length === 0) return
    const blob = await renderOrderSlipsPdf(slipsDataForPdf, formatDate)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Bestellzettel_${deliveryDate || 'Datum'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Bestellübersicht (PDF/Druck)</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Sortierung nach Raum/Klasse. „PDF erstellen“: Querformat, 3 Zettel pro Seite, Umrandung und gestrichelte Schneidelinien. „Drucken“: Browser-Druck (Strg+P).</p>
        <div className="space-y-2 print:hidden">
          <Label>Lieferdatum</Label>
          <DatePicker
            value={deliveryDate}
            onChange={setDeliveryDate}
            placeholder="Datum wählen"
            disabled={(date) => !isDeliverableDate(date, deliveryWeekday, new Set(pausedDeliveryDates))}
            modifiers={{
              deliverable: (date) => isDeliverableDate(date, deliveryWeekday, new Set(pausedDeliveryDates)),
            }}
            modifiersClassNames={{
              deliverable: 'deliverable-day',
            }}
          />
          {deliveryDate && (
            <p className="text-muted-foreground text-sm pt-1">
              Gewählt: {formatDate(deliveryDate)}
            </p>
          )}
        </div>
        <div className="print:hidden flex flex-wrap gap-2 mb-4">
          <Button type="button" className="min-h-[48px]" onClick={generatePdf} disabled={flatOrdersForPdf.length === 0}>
            PDF erstellen
          </Button>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={printSlips}>
            Drucken
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 print:space-y-4">
          {byRoom.map(([roomName, roomOrders]) => (
            <section key={roomName} className="break-inside-avoid print:break-inside-avoid">
              <h3 className="text-lg font-bold text-foreground mb-3 print:text-base print:mb-2">
                Raum / Klasse: {roomName}
              </h3>
              <ul className="list-none p-0 m-0 space-y-3 print:space-y-2">
                {roomOrders.map(o => {
                  const layerBlocks = getOrderLayers(o)
                  return (
                    <li
                      key={o.id}
                      className="border border-border rounded-lg p-3 print:border-black print:p-2 print:text-sm"
                    >
                      <div className="font-bold text-foreground">{o.customers?.name ?? '?'}</div>
                      <div className="text-muted-foreground text-sm mt-0.5">
                        {formatDate(o.delivery_date)}
                        {o.room && ` · ${o.room}`}
                      </div>
                      {o.allergies?.trim() && (
                        <p className="text-sm mt-1"><strong>Allergien:</strong> {o.allergies}</p>
                      )}
                      <ul className="m-0 mt-2 pl-4 list-disc text-sm">
                        {layerBlocks.map(({ layerName, layerIconUrl, items }) => (
                          <li key={layerName}>
                            <strong className="flex items-center gap-1.5">
                              {layerIconUrl && <img src={layerIconUrl} alt="" className="h-3.5 w-3.5 object-contain inline" />}
                              {layerName}:
                            </strong>{' '}
                            {items.length ? items.map((i, idx) => (
                              <span key={idx}>
                                {idx > 0 && ', '}
                                <span className="inline-flex items-center gap-1">
                                  {i.icon_url && <img src={i.icon_url} alt="" className="h-3 w-3 object-contain inline" />}
                                  {i.text}
                                </span>
                              </span>
                            )) : '—'}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
