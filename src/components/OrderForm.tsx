import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Layer, Ingredient } from '@/types'
import { getNextMonday } from '@/utils/dateUtils'
import { isOrderClosedForDelivery } from '@/utils/dateUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const INFO_TEXT = 'Du nimmst heute mit deiner Bowl u. a. Eiweiß, Ballaststoffe und Superfoods zu dir (z. B. ca. 33 % Eiweiß).'

type SelectionState = Record<string, string[]>
type QuantityState = Record<string, Record<string, number>>

interface OrderFormProps {
  customerId: string
  customerName: string
  deliveryDate: string
  onSaved?: () => void
}

export default function OrderForm({ customerId, customerName, deliveryDate, onSaved }: OrderFormProps) {
  const [layers, setLayers] = useState<Layer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [cutoff, setCutoff] = useState({ weekday: 3, hour: 16, minute: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'form' | 'summary'>('form')
  const [room, setRoom] = useState('')
  const [allergies, setAllergies] = useState('')
  const [selection, setSelection] = useState<SelectionState>({})
  const [quantity, setQuantity] = useState<QuantityState>({})

  useEffect(() => {
    async function load() {
      const [layRes, ingRes, setRes] = await Promise.all([
        supabase.from('layers').select('*').order('sort_order'),
        supabase.from('ingredients').select('*').order('sort_order'),
        supabase.from('app_settings').select('key, value'),
      ])
      if (layRes.data) setLayers(layRes.data as Layer[])
      if (ingRes.data) setIngredients(ingRes.data as Ingredient[])
      if (setRes.data) {
        const m: Record<string, number> = {}
        for (const { key, value } of setRes.data) {
          const v = parseInt(value ?? '', 10)
          if (key === 'order_cutoff_weekday') m.weekday = isNaN(v) ? 3 : v
          if (key === 'order_cutoff_hour') m.hour = isNaN(v) ? 16 : v
          if (key === 'order_cutoff_minute') m.minute = isNaN(v) ? 0 : v
        }
        setCutoff(c => ({ ...c, ...m }))
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!customerId || !deliveryDate || ingredients.length === 0) return
    async function loadOrder() {
      const { data: order } = await supabase
        .from('orders')
        .select('id, room, allergies')
        .eq('customer_id', customerId)
        .eq('delivery_date', deliveryDate)
        .maybeSingle()
      if (order) {
        setRoom((order as { room?: string | null }).room ?? '')
        setAllergies((order as { allergies?: string | null }).allergies ?? '')
      } else {
        setRoom('')
        setAllergies('')
      }
      if (!order) return
      const { data: items } = await supabase.from('order_items').select('ingredient_id, quantity').eq('order_id', (order as { id: string }).id)
      if (!items?.length) return
      const sel: SelectionState = {}
      const qty: QuantityState = {}
      for (const it of items as { ingredient_id: string; quantity: number }[]) {
        const ing = ingredients.find(i => i.id === it.ingredient_id)
        if (!ing) continue
        const layer = layers.find(l => l.id === ing.layer_id)
        if (!layer) continue
        if (layer.selection_type === 'single' || layer.selection_type === 'multiple') {
          if (!sel[layer.id]) sel[layer.id] = []
          sel[layer.id].push(it.ingredient_id)
        } else if (layer.selection_type === 'quantity' && it.quantity > 0) {
          if (!qty[layer.id]) qty[layer.id] = {}
          qty[layer.id][it.ingredient_id] = it.quantity
        }
      }
      setSelection(s => ({ ...s, ...sel }))
      setQuantity(q => ({ ...q, ...qty }))
    }
    loadOrder()
  }, [customerId, deliveryDate, ingredients.length, layers.length])

  const closed = isOrderClosedForDelivery(deliveryDate, cutoff.weekday, cutoff.hour, cutoff.minute)
  const layersSelectable = layers.filter(l => l.selection_type !== 'none' && l.selection_type !== 'display_only')
  const layersForDisplay = layers.filter(l => l.selection_type !== 'none')
  const getIngredientsForLayer = (layerId: string) => ingredients.filter(i => i.layer_id === layerId)

  function setLayerSelection(layerId: string, type: string, value: string | string[] | number | [string, number]) {
    if (type === 'single') {
      setSelection(s => ({ ...s, [layerId]: value ? [value as string] : [] }))
    } else if (type === 'multiple') {
      setSelection(s => {
        const arr = (s[layerId] ?? []).slice()
        const v = value as string
        const i = arr.indexOf(v)
        if (i >= 0) arr.splice(i, 1)
        else arr.push(v)
        return { ...s, [layerId]: arr }
      })
    } else if (type === 'quantity') {
      const [ingId, q] = value as [string, number]
      setQuantity(qty => ({ ...qty, [layerId]: { ...(qty[layerId] ?? {}), [ingId]: q } }))
    }
  }

  function goToSummary() {
    if (!room.trim()) return
    setStep('summary')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (closed) return
    setSaving(true)
    const nextMon = deliveryDate || getNextMonday()
    const { data: orderData } = await supabase
      .from('orders')
      .upsert(
        { customer_id: customerId, delivery_date: nextMon, room: room.trim() || null, allergies: allergies.trim() || null },
        { onConflict: 'customer_id,delivery_date' }
      )
      .select('id')
      .single()
    if (!orderData) {
      setSaving(false)
      return
    }
    const orderId = (orderData as { id: string }).id
    await supabase.from('order_items').delete().eq('order_id', orderId)
    const items: { order_id: string; ingredient_id: string; quantity: number }[] = []
    for (const layer of layersSelectable) {
      const ings = getIngredientsForLayer(layer.id)
      if (layer.selection_type === 'single' || layer.selection_type === 'multiple') {
        for (const id of selection[layer.id] ?? []) items.push({ order_id: orderId, ingredient_id: id, quantity: 1 })
      } else if (layer.selection_type === 'quantity') {
        const qMap = quantity[layer.id] ?? {}
        for (const ing of ings) {
          const q = qMap[ing.id] ?? 0
          if (q > 0) items.push({ order_id: orderId, ingredient_id: ing.id, quantity: q })
        }
      }
    }
    if (items.length) await supabase.from('order_items').insert(items)
    setSaving(false)
    setStep('form')
    onSaved?.()
  }

  const summaryByLayer = (() => {
    const result: { layerName: string; items: string[] }[] = []
    const sorted = [...layersForDisplay].sort((a, b) => a.sort_order - b.sort_order)
    for (const layer of sorted) {
      const ings = getIngredientsForLayer(layer.id)
      const items: string[] = []
      if (layer.selection_type === 'display_only') {
        items.push(...ings.map(i => i.name))
      } else if (layer.selection_type === 'single' || layer.selection_type === 'multiple') {
        for (const id of selection[layer.id] ?? []) {
          const ing = ings.find(i => i.id === id)
          if (ing) items.push(ing.name)
        }
      } else if (layer.selection_type === 'quantity') {
        const qMap = quantity[layer.id] ?? {}
        for (const ing of ings) {
          const q = qMap[ing.id] ?? 0
          if (q > 0) items.push(q > 1 ? `${ing.name} ${q}x` : ing.name)
        }
      }
      result.push({ layerName: layer.name, items })
    }
    return result
  })()

  if (loading) return <p className="text-muted-foreground">Wird geladen …</p>
  if (closed) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Bestellschluss vorbei</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Für den nächsten Liefertermin können keine Bestellungen mehr aufgegeben werden.</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'summary') {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Bestellübersicht</CardTitle>
          <p className="text-muted-foreground text-sm font-normal">Bitte prüfe deine Angaben vor dem Absenden.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Raum / Klasse</dt>
              <dd className="font-medium text-foreground">{room}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Allergien / Unverträglichkeiten</dt>
              <dd className="font-medium text-foreground">{allergies || '—'}</dd>
            </div>
            {summaryByLayer.map(({ layerName, items }) => (
              <div key={layerName}>
                <dt className="text-muted-foreground">{layerName}</dt>
                <dd className="font-medium text-foreground">{items.length ? items.join(', ') : '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => setStep('form')}>
              Zurück
            </Button>
            <Button type="button" className="min-h-[48px]" disabled={saving} onClick={e => handleSubmit(e as unknown as React.FormEvent)}>
              {saving ? 'Wird gespeichert …' : 'Bestellung final abschicken'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4">
      <form onSubmit={e => { e.preventDefault(); goToSummary(); }}>
        <CardHeader>
          <CardTitle>
            Deine Bowl für {new Date(deliveryDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <p className="text-foreground font-medium min-h-[44px] flex items-center">{customerName}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Raum / Klasse</Label>
            <Input
              id="room"
              type="text"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="z. B. 3a, Raum 101"
              className="min-h-[48px]"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergien oder Unverträglichkeiten (optional)</Label>
            <Input
              id="allergies"
              type="text"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              placeholder="z. B. Nüsse, Laktose"
              className="min-h-[48px]"
            />
          </div>

          {layersForDisplay.map(layer => {
            const ings = getIngredientsForLayer(layer.id)
            if (!ings.length) return null
            if (layer.selection_type === 'display_only') {
              return (
                <div key={layer.id} className="space-y-2">
                  <Label className="text-foreground font-medium">Feste Basis (nicht veränderbar)</Label>
                  <p className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground min-h-[44px] flex items-center">
                    {ings.map(i => i.name).join(', ')}
                  </p>
                </div>
              )
            }
            return (
              <div key={layer.id} className="space-y-2">
                <Label>{layer.name}</Label>
                {layer.selection_type === 'single' && (
                  <div className="flex flex-col gap-1">
                    {ings.map(ing => (
                      <label key={ing.id} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                        <input type="radio" name={layer.id} value={ing.id} checked={(selection[layer.id] ?? []).includes(ing.id)} onChange={() => setLayerSelection(layer.id, 'single', ing.id)} className="w-4 h-4" />
                        <span>{ing.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {layer.selection_type === 'multiple' && (
                  <div className="flex flex-col gap-1">
                    {ings.map(ing => (
                      <label key={ing.id} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                        <input type="checkbox" value={ing.id} checked={(selection[layer.id] ?? []).includes(ing.id)} onChange={() => setLayerSelection(layer.id, 'multiple', ing.id)} className="w-4 h-4 rounded" />
                        <span>{ing.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {layer.selection_type === 'quantity' && layer.quantity_options != null && layer.quantity_options !== '' && (
                  <div className="flex flex-wrap items-center gap-2">
                    {ings.map(ing => (
                      <div key={ing.id} className="flex items-center gap-2 mb-2">
                        <span className="text-foreground">{ing.name}:</span>
                        {(layer.quantity_options as string).split(',').map(s => {
                          const n = parseInt(s.trim(), 10)
                          if (isNaN(n)) return null
                          const qMap = quantity[layer.id] ?? {}
                          const current = qMap[ing.id] ?? 0
                          const isActive = current === n
                          return (
                            <Button
                              key={n}
                              type="button"
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              className="min-h-[44px]"
                              onClick={() => setLayerSelection(layer.id, 'quantity', [ing.id, n] as [string, number])}
                            >
                              {String(n)}
                            </Button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            {INFO_TEXT}
          </div>

          <Button type="submit" className="min-h-[48px]" disabled={!room.trim()}>
            Zur Bestellübersicht
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
