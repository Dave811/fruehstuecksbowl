import { useState, useEffect, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
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
  order_items: { quantity: number; ingredients: { name: string; layers: { name: string; sort_order: number } | null } | null }[]
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
        order_items ( quantity, ingredients ( name, layers ( name, sort_order ) ) )
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

  type LayerBlock = { layerName: string; sortOrder: number; items: string[] }

  function getOrderLayers(order: OrderForSlip): LayerBlock[] {
    const byLayer = new Map<string, { sortOrder: number; items: string[] }>()
    for (const oi of order.order_items ?? []) {
      const layer = oi.ingredients?.layers
      const name = oi.ingredients?.name ?? '?'
      const q = oi.quantity > 1 ? ` ${oi.quantity}x` : ''
      const key = layer?.name ?? 'Sonstiges'
      const so = layer?.sort_order ?? 99
      if (!byLayer.has(key)) byLayer.set(key, { sortOrder: so, items: [] })
      byLayer.get(key)!.items.push(name + q)
    }
    const sorted = Array.from(byLayer.entries())
      .map(([layerName, { sortOrder, items }]) => ({ layerName, sortOrder, items }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const basisFromOrder = sorted.find(b => b.layerName === 'Basis')
    if (basisFromOrder) {
      if (basisLabel !== '—') {
        basisFromOrder.items = [basisLabel, ...basisFromOrder.items]
      }
      return sorted
    }
    if (basisLabel !== '—') {
      return [{ layerName: 'Basis', sortOrder: -1, items: [basisLabel] }, ...sorted]
    }
    return sorted
  }

  function generatePdf() {
    if (flatOrdersForPdf.length === 0) return
    const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })
    const pageW = doc.getPageWidth()
    const pageH = doc.getPageHeight()
    const margin = 18
    const contentW = pageW - 2 * margin
    const contentH = pageH - 2 * margin
    const slipsPerPage = 3
    const slipW = contentW / slipsPerPage
    const slipH = contentH
    const pad = 12
    const innerW = slipW - 2 * pad
    const lineHeight = 11
    const lineHeightSection = 13
    const fontSize = 9
    const fontSizeHead = 10
    const fontSizeTitle = 12
    const headerFill: [number, number, number] = [248, 248, 250]
    const sectionGap = 8

    const drawCutLines = (y0: number, y1: number) => {
      doc.setLineDashPattern([4, 4], 0)
      doc.setDrawColor(160, 160, 160)
      for (let i = 1; i < slipsPerPage; i++) {
        const x = margin + i * slipW
        doc.line(x, y0, x, y1)
      }
      doc.setLineDashPattern([], 0)
      doc.setDrawColor(0, 0, 0)
    }

    const totalPages = Math.ceil(flatOrdersForPdf.length / slipsPerPage)

    for (let p = 0; p < totalPages; p++) {
      if (p > 0) doc.addPage('a4', 'l')
      const y0 = margin
      const y1 = margin + slipH
      drawCutLines(y0, y1)

      for (let col = 0; col < slipsPerPage; col++) {
        const orderIndex = p * slipsPerPage + col
        if (orderIndex >= flatOrdersForPdf.length) break
        const order = flatOrdersForPdf[orderIndex]
        const x = margin + col * slipW
        const slipX = x + pad
        let slipY = y0 + pad
        const slipBottom = y0 + slipH - pad

        doc.setDrawColor(0, 0, 0)
        doc.rect(x, y0, slipW, slipH)

        const maxTextW = innerW

        // —— Kopf: Wer, Wann, Klasse, Allergien (umrandeter Block)
        const headerH = 54
        const headerTop = slipY
        doc.setFillColor(...headerFill)
        doc.rect(slipX - 2, headerTop - 2, innerW + 4, headerH + 4)
        doc.setDrawColor(200, 200, 200)
        doc.rect(slipX - 2, headerTop - 2, innerW + 4, headerH + 4)
        doc.setDrawColor(0, 0, 0)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(fontSizeTitle)
        const name = (order.customers?.name ?? '?').slice(0, 28)
        doc.text(name, slipX, headerTop + 10)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSizeHead)
        doc.text(`Datum: ${formatDate(order.delivery_date)}`, slipX, headerTop + 22)
        doc.text(`Klasse / Raum: ${(order.room ?? '—').trim() || '—'}`, slipX, headerTop + 34)
        doc.text(`Allergien: ${order.allergies?.trim() || '—'}`, slipX, headerTop + 46)
        slipY = headerTop + headerH + sectionGap

        // —— Ebenen: Basis, dann weitere (visuell getrennt)
        const layers = getOrderLayers(order)
        for (const block of layers) {
          if (slipY > slipBottom - 20) break
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(fontSizeHead)
          doc.setDrawColor(0, 0, 0)
          doc.text(block.layerName, slipX, slipY + 2)
          slipY += lineHeightSection - 2
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(fontSize)
          const text = block.items.join(', ')
          const lines = doc.splitTextToSize(text, maxTextW)
          doc.text(lines, slipX, slipY + 2)
          slipY += lines.length * lineHeight + 4
          doc.setDrawColor(220, 220, 220)
          doc.line(slipX, slipY, slipX + innerW, slipY)
          doc.setDrawColor(0, 0, 0)
          slipY += sectionGap
        }
      }
    }

    doc.save(`Bestellzettel_${deliveryDate || 'Datum'}.pdf`)
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
                        {layerBlocks.map(({ layerName, items }) => (
                          <li key={layerName}>
                            <strong>{layerName}:</strong> {items.length ? items.join(', ') : '—'}
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
