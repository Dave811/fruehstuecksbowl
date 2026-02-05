import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Layer, Ingredient } from '../types'
import { getNextMonday } from '../utils/dateUtils'
import { isOrderClosedForDelivery } from '../utils/dateUtils'

type SelectionState = Record<string, string[]>
/** layerId -> ingredientId -> quantity */
type QuantityState = Record<string, Record<string, number>>

interface OrderFormProps {
  customerId: string
  deliveryDate: string
  onSaved?: () => void
}

export default function OrderForm({ customerId, deliveryDate, onSaved }: OrderFormProps) {
  const [layers, setLayers] = useState<Layer[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [cutoff, setCutoff] = useState({ weekday: 4, hour: 16, minute: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({})
  const [quantity, setQuantity] = useState<QuantityState>({}) // layerId -> { ingredientId: qty }

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
          if (key === 'order_cutoff_weekday') m.weekday = isNaN(v) ? 4 : v
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
      const { data: order } = await supabase.from('orders').select('id').eq('customer_id', customerId).eq('delivery_date', deliveryDate).maybeSingle()
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

  const layersFiltered = layers.filter(l => l.selection_type !== 'none')
  const getIngredientsForLayer = (layerId: string) =>
    ingredients.filter(i => i.layer_id === layerId)

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
      setQuantity(qty => ({
        ...qty,
        [layerId]: { ...(qty[layerId] ?? {}), [ingId]: q },
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (closed) return
    setSaving(true)
    const nextMon = deliveryDate || getNextMonday()
    const { data: orderData } = await supabase.from('orders').upsert(
      { customer_id: customerId, delivery_date: nextMon },
      { onConflict: 'customer_id,delivery_date' }
    ).select('id').single()
    if (!orderData) {
      setSaving(false)
      return
    }
    const orderId = (orderData as { id: string }).id
    await supabase.from('order_items').delete().eq('order_id', orderId)
    const items: { order_id: string; ingredient_id: string; quantity: number }[] = []
    for (const layer of layersFiltered) {
      const ings = getIngredientsForLayer(layer.id)
      if (layer.selection_type === 'single' || layer.selection_type === 'multiple') {
        const ids = selection[layer.id] ?? []
        for (const id of ids) items.push({ order_id: orderId, ingredient_id: id, quantity: 1 })
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
    onSaved?.()
  }

  if (loading) return <p>Wird geladen …</p>
  if (closed) {
    return (
      <div className="card">
        <h2>Bestellschluss vorbei</h2>
        <p className="muted">Für den nächsten Liefertermin können keine Bestellungen mehr aufgegeben werden.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Deine Bowl für {new Date(deliveryDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      {layersFiltered.map(layer => {
        const ings = getIngredientsForLayer(layer.id)
        if (!ings.length) return null
        return (
          <div key={layer.id} className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>{layer.name}</label>
            {layer.selection_type === 'single' && (
              <div className="options">
                {ings.map(ing => (
                  <label key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44 }}>
                    <input type="radio" name={layer.id} value={ing.id} checked={(selection[layer.id] ?? []).includes(ing.id)} onChange={() => setLayerSelection(layer.id, 'single', ing.id)} />
                    <span>{ing.name}</span>
                  </label>
                ))}
              </div>
            )}
            {layer.selection_type === 'multiple' && (
              <div className="options">
                {ings.map(ing => (
                  <label key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44 }}>
                    <input type="checkbox" value={ing.id} checked={(selection[layer.id] ?? []).includes(ing.id)} onChange={() => setLayerSelection(layer.id, 'multiple', ing.id)} />
                    <span>{ing.name}</span>
                  </label>
                ))}
              </div>
            )}
            {layer.selection_type === 'quantity' && layer.quantity_options != null && layer.quantity_options !== '' && (
              <div className="options">
                {ings.map(ing => (
                  <div key={ing.id} style={{ marginBottom: '0.5rem' }}>
                    <span style={{ marginRight: '0.5rem' }}>{ing.name}:</span>
                    {(layer.quantity_options as string).split(',').map(s => {
                      const n = parseInt(s.trim(), 10)
                      if (isNaN(n)) return null
                      const qMap = quantity[layer.id] ?? {}
                      const current = qMap[ing.id] ?? 0
                      return (
                        <button key={n} type="button" className={current === n ? 'btn active' : 'btn btn-secondary'} style={{ marginRight: '0.5rem', padding: '0.4rem 0.75rem' }} onClick={() => setLayerSelection(layer.id, 'quantity', [ing.id, n] as [string, number])}>
                          {String(n)}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <button type="submit" className="btn" disabled={saving}>
        {saving ? 'Wird gespeichert …' : 'Bestellung absenden'}
      </button>
    </form>
  )
}
