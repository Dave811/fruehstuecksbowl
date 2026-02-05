import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getNextMonday, getNextDeliveryDay } from '@/utils/dateUtils'
import type { Ingredient } from '@/types'
import DatePicker from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type OrderItemRow = { ingredient_id: string; quantity: number }
type Agg = { count: number; ingredient: Ingredient }

export default function ShoppingListTab() {
  const [deliveryDate, setDeliveryDate] = useState(getNextMonday())
  const [items, setItems] = useState<OrderItemRow[]>([])
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
      if (!cancelled) setDeliveryDate(getNextDeliveryDay(weekday, paused))
    }
    loadDefault()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!deliveryDate) return
    let cancelled = false
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
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
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

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Einkaufsliste</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Für den gewählten Liefermontag. Drucken mit Browser-Druck (Strg+P).</p>
        <div className="space-y-2 print:hidden">
          <Label>Lieferdatum</Label>
          <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Datum wählen" />
        </div>
        <Button type="button" className="print:hidden min-h-[48px] mb-4" onClick={() => window.print()}>
          Drucken
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1">
          {lines.map((line, idx) => (
            <li key={idx}>
              {line.count}× {line.portion}{line.unit} {line.name}
              {line.packages != null && line.pkgLabel && (
                <> → <strong>{line.packages}× {line.pkgLabel}</strong></>
              )}
            </li>
          ))}
        </ul>
        {lines.length === 0 && <p className="text-muted-foreground text-sm">Keine Bestellungen für diesen Tag.</p>}
      </CardContent>
    </Card>
  )
}
