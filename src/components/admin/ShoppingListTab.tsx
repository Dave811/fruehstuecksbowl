import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getNextMonday } from '../../utils/dateUtils'
import type { Ingredient } from '../../types'

type OrderItemRow = { ingredient_id: string; quantity: number }
type Agg = { count: number; ingredient: Ingredient }

export default function ShoppingListTab() {
  const [deliveryDate, setDeliveryDate] = useState(getNextMonday())
  const [items, setItems] = useState<OrderItemRow[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: orderData } = await supabase.from('orders').select('id').eq('delivery_date', deliveryDate)
      const orderIds = (orderData ?? []).map(o => (o as { id: string }).id)
      if (orderIds.length === 0) {
        setItems([])
        const { data: ing } = await supabase.from('ingredients').select('*')
        setIngredients((ing ?? []) as Ingredient[])
        setLoading(false)
        return
      }
      const { data: itemData } = await supabase.from('order_items').select('ingredient_id, quantity').in('order_id', orderIds)
      const { data: ing } = await supabase.from('ingredients').select('*')
      setItems((itemData ?? []) as OrderItemRow[])
      setIngredients((ing ?? []) as Ingredient[])
      setLoading(false)
    }
    load()
  }, [deliveryDate])

  const aggregated: Agg[] = []
  const byIng = new Map<string, number>()
  for (const it of items) {
    byIng.set(it.ingredient_id, (byIng.get(it.ingredient_id) ?? 0) + it.quantity)
  }
  for (const [ingredientId, count] of byIng) {
    const ing = ingredients.find(i => i.id === ingredientId)
    if (ing) aggregated.push({ count, ingredient: ing })
  }

  const lines = aggregated.map(({ count, ingredient }) => {
    const portion = ingredient.portion_amount ?? 1
    const unit = ingredient.portion_unit ?? ''
    const total = count * portion
    const pkgAmount = ingredient.package_amount
    const pkgLabel = ingredient.package_label ?? (ingredient.package_amount != null ? `${ingredient.package_amount}${ingredient.package_unit ?? ''}` : '')
    if (pkgAmount != null && pkgAmount > 0) {
      const packages = Math.ceil(total / pkgAmount)
      return { count, portion, unit, total, packages, pkgLabel, name: ingredient.name }
    }
    return { count, portion, unit, total, packages: null, pkgLabel: null, name: ingredient.name }
  })

  function printList() {
    window.print()
  }

  if (loading) return <p>Lade …</p>

  return (
    <div className="card">
      <h2>Einkaufsliste</h2>
      <p className="muted">Für den gewählten Liefermontag. Drucken mit Browser-Druck (Strg+P).</p>
      <div className="form-group no-print">
        <label>Lieferdatum (Montag)</label>
        <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
      </div>
      <button type="button" className="btn no-print" onClick={printList} style={{ marginBottom: '1rem' }}>
        Drucken
      </button>
      <ul className="shopping-list">
        {lines.map((line, idx) => (
          <li key={idx}>
            {line.count}× {line.portion}{line.unit} {line.name}
            {line.packages != null && line.pkgLabel && (
              <> → <strong>{line.packages}× {line.pkgLabel}</strong></>
            )}
          </li>
        ))}
      </ul>
      {lines.length === 0 && <p className="muted">Keine Bestellungen für diesen Tag.</p>}
    </div>
  )
}
