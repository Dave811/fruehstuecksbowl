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
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [step, setStep] = useState<'form' | 'summary'>('form')
  const [room, setRoom] = useState('')
  const [allergies, setAllergies] = useState('')
  const [selection, setSelection] = useState<SelectionState>({})

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
      for (const it of items as { ingredient_id: string; quantity: number }[]) {
        const ing = ingredients.find(i => i.id === it.ingredient_id)
        if (!ing) continue
        const layer = layers.find(l => l.id === ing.layer_id)
        if (!layer) continue
        if (layer.selection_type === 'single') {
          sel[layer.id] = [it.ingredient_id]
        } else if ((layer.selection_type === 'multiple' || layer.selection_type === 'quantity') && it.quantity > 0) {
          if (!sel[layer.id]) sel[layer.id] = []
          for (let q = 0; q < it.quantity; q++) sel[layer.id].push(it.ingredient_id)
        }
      }
      setSelection(s => ({ ...s, ...sel }))
    }
    loadOrder()
  }, [customerId, deliveryDate, ingredients.length, layers.length])

  const closed = isOrderClosedForDelivery(deliveryDate, cutoff.weekday, cutoff.hour, cutoff.minute)
  const layersSelectable = layers.filter(l => l.selection_type !== 'none' && l.selection_type !== 'display_only')
  const layersForDisplay = layers.filter(l => l.selection_type !== 'none')
  const getIngredientsForLayer = (layerId: string) => ingredients.filter(i => i.layer_id === layerId)

  function setLayerSelection(layerId: string, type: string, value: string | { op: 'add' | 'removeOne' | 'removeAll'; ingId: string }) {
    if (type === 'single') {
      setSelection(s => ({ ...s, [layerId]: value ? [value as string] : [] }))
    } else if (type === 'multiple') {
      const v = value as { op: 'add' | 'removeOne' | 'removeAll'; ingId: string }
      setSelection(s => {
        const arr = (s[layerId] ?? []).slice()
        if (v.op === 'add') arr.push(v.ingId)
        else if (v.op === 'removeAll') return { ...s, [layerId]: arr.filter(id => id !== v.ingId) }
        else if (v.op === 'removeOne') {
          const i = arr.indexOf(v.ingId)
          if (i >= 0) arr.splice(i, 1)
          return { ...s, [layerId]: arr }
        }
        return { ...s, [layerId]: arr }
      })
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
      if (layer.selection_type === 'single') {
        for (const id of selection[layer.id] ?? []) items.push({ order_id: orderId, ingredient_id: id, quantity: 1 })
      } else if (layer.selection_type === 'multiple' || layer.selection_type === 'quantity') {
        const arr = selection[layer.id] ?? []
        const counts: Record<string, number> = {}
        for (const id of arr) counts[id] = (counts[id] ?? 0) + 1
        for (const [id, q] of Object.entries(counts)) items.push({ order_id: orderId, ingredient_id: id, quantity: q })
      }
    }
    if (items.length) await supabase.from('order_items').insert(items)
    setSaving(false)
    setStep('form')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 4000)
    onSaved?.()
  }

  const summaryByLayer = (() => {
    const result: { layerName: string; layerIconUrl?: string | null; items: string[] }[] = []
    const sorted = [...layersForDisplay].sort((a, b) => a.sort_order - b.sort_order)
    for (const layer of sorted) {
      const ings = getIngredientsForLayer(layer.id)
      const items: string[] = []
      if (layer.selection_type === 'display_only') {
        items.push(...ings.map(i => i.name))
      } else if (layer.selection_type === 'single') {
        for (const id of selection[layer.id] ?? []) {
          const ing = ings.find(i => i.id === id)
          if (ing) items.push(ing.name)
        }
      } else if (layer.selection_type === 'multiple' || layer.selection_type === 'quantity') {
        const arr = selection[layer.id] ?? []
        const counts: Record<string, number> = {}
        for (const id of arr) counts[id] = (counts[id] ?? 0) + 1
        for (const ing of ings) {
          const q = counts[ing.id] ?? 0
          if (q > 0) items.push(q > 1 ? `${ing.name} ${q}x` : ing.name)
        }
      }
      result.push({ layerName: layer.name, layerIconUrl: layer.icon_url, items })
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
            {summaryByLayer.map(({ layerName, layerIconUrl, items }) => (
              <div key={layerName}>
                <dt className="text-muted-foreground flex items-center gap-2">
                  {layerIconUrl && <img src={layerIconUrl} alt="" className="h-4 w-4 object-contain" />}
                  {layerName}
                </dt>
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
          <p className="text-muted-foreground text-sm font-normal mt-1">
            Du kannst deine Bestellung bis zum Abgabeschluss bearbeiten. Änderungen einfach vornehmen und erneut abschicken.
          </p>
          {savedSuccess && (
            <p className="text-green-600 dark:text-green-400 text-sm font-medium mt-2" role="alert">
              Bestellung gespeichert. Du kannst weitere Änderungen vornehmen.
            </p>
          )}
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
                  <Label className="text-foreground font-medium flex items-center gap-2">
                    {layer.icon_url && <img src={layer.icon_url} alt="" className="h-5 w-5 object-contain" />}
                    Feste Basis (nicht veränderbar)
                  </Label>
                  <p className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground min-h-[44px] flex items-center gap-2 flex-wrap">
                    {ings.map(i => (
                      <span key={i.id} className="flex items-center gap-1.5">
                        {i.icon_url && <img src={i.icon_url} alt="" className="h-4 w-4 object-contain" />}
                        {i.name}
                      </span>
                    ))}
                  </p>
                </div>
              )
            }
            return (
              <div key={layer.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {layer.icon_url && <img src={layer.icon_url} alt="" className="h-5 w-5 object-contain" />}
                  {layer.name}
                </Label>
                {layer.selection_type === 'single' && (
                  <div className="flex flex-col gap-1">
                    {ings.map(ing => {
                      const isSelected = (selection[layer.id] ?? []).includes(ing.id)
                      return (
                        <div key={ing.id} className="flex items-center gap-2 min-h-[44px] flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input type="radio" name={layer.id} value={ing.id} checked={isSelected} onChange={() => setLayerSelection(layer.id, 'single', ing.id)} className="w-4 h-4" />
                            {ing.icon_url && <img src={ing.icon_url} alt="" className="h-5 w-5 object-contain shrink-0" />}
                            <span>{ing.name}</span>
                          </label>
                          {isSelected && ing.allow_delete && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setLayerSelection(layer.id, 'single', '')}>
                              Entfernen
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {(layer.selection_type === 'multiple' || layer.selection_type === 'quantity') && (
                  <div className="flex flex-col gap-1">
                    {ings.map(ing => {
                      const arr = selection[layer.id] ?? []
                      const count = arr.filter(id => id === ing.id).length
                      const maxQ = ing.max_quantity ?? 999
                      const atMax = count >= maxQ
                      const showDelete = (ing.allow_delete ?? true) && count > 0
                      const showMore = (ing.allow_add_more ?? true)
                      return (
                        <div key={ing.id} className="flex items-center gap-2 min-h-[44px] flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 shrink">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-input"
                              checked={count > 0}
                              onChange={() => {
                                if (count > 0) setLayerSelection(layer.id, 'multiple', { op: 'removeAll', ingId: ing.id })
                                else setLayerSelection(layer.id, 'multiple', { op: 'add', ingId: ing.id })
                              }}
                            />
                            {ing.icon_url && <img src={ing.icon_url} alt="" className="h-5 w-5 object-contain shrink-0" />}
                            <span className="text-foreground">{ing.name}</span>
                          </label>
                          <div className="flex items-center gap-0 border border-input rounded-md overflow-hidden bg-background">
                            {showDelete && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 rounded-none border-0 border-r border-input"
                                onClick={() => setLayerSelection(layer.id, 'multiple', count === 1 ? { op: 'removeAll', ingId: ing.id } : { op: 'removeOne', ingId: ing.id })}
                                title="Löschen / weniger"
                              >
                                −
                              </Button>
                            )}
                            <span className="min-w-[2rem] text-center py-1.5 text-sm font-medium" aria-live="polite">
                              {count}
                            </span>
                            {showMore && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 rounded-none border-0 border-l border-input"
                                onClick={() => setLayerSelection(layer.id, 'multiple', { op: 'add', ingId: ing.id })}
                                title="Mehr"
                                disabled={atMax}
                              >
                                +
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
