import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ingredient, Layer } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]'

export default function IngredientsTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null)
  const [form, setForm] = useState({
    name: '',
    layer_id: '',
    sort_order: 0,
    portion_amount: '' as number | '',
    portion_unit: '',
    package_amount: '' as number | '',
    package_unit: '',
    package_label: '',
    icon_url: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const [ingRes, layRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('sort_order'),
      supabase.from('layers').select('*').order('sort_order'),
    ])
    setIngredients((ingRes.data ?? []) as Ingredient[])
    setLayers((layRes.data ?? []) as Layer[])
    setLoading(false)
  }

  async function save() {
    const payload = {
      name: form.name,
      layer_id: form.layer_id || undefined,
      sort_order: form.sort_order,
      portion_amount: form.portion_amount === '' ? null : Number(form.portion_amount),
      portion_unit: form.portion_unit || null,
      package_amount: form.package_amount === '' ? null : Number(form.package_amount),
      package_unit: form.package_unit || null,
      package_label: form.package_label || null,
      icon_url: form.icon_url.trim() || null,
    }
    if (editing?.id) {
      await supabase.from('ingredients').update(payload).eq('id', editing.id)
    } else {
      if (!payload.layer_id) return
      await supabase.from('ingredients').insert(payload)
    }
    setEditing(null)
    setForm({ name: '', layer_id: layers[0]?.id ?? '', sort_order: 0, portion_amount: '', portion_unit: '', package_amount: '', package_unit: '', package_label: '', icon_url: '' })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Zutat löschen?')) return
    await supabase.from('ingredients').delete().eq('id', id)
    load()
  }

  function startEdit(i: Ingredient) {
    setEditing(i)
    setForm({
      name: i.name,
      layer_id: i.layer_id,
      sort_order: i.sort_order,
      portion_amount: i.portion_amount ?? '',
      portion_unit: i.portion_unit ?? '',
      package_amount: i.package_amount ?? '',
      package_unit: i.package_unit ?? '',
      package_label: i.package_label ?? '',
      icon_url: i.icon_url ?? '',
    })
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Zutaten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input className="min-h-[48px]" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Skir" required />
          </div>
          <div className="space-y-2">
            <Label>Ebene</Label>
            <select className={cn(selectClass)} value={form.layer_id} onChange={e => setForm(f => ({ ...f, layer_id: e.target.value }))} required>
              <option value="">— wählen —</option>
              {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Reihenfolge</Label>
            <Input type="number" className="min-h-[48px]" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="mb-0">Icon / Bild (URL)</Label>
              <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
                <a href="https://icons8.com/icons" target="_blank" rel="noopener noreferrer" title="Icons8: Icon wählen, dann Bildadresse kopieren und hier einfügen">
                  Icon suchen (Icons8)
                </a>
              </Button>
            </div>
            <Input className="min-h-[48px]" value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://… oder leer lassen" />
            {form.icon_url.trim() && (
              <img src={form.icon_url.trim()} alt="" className="h-10 w-10 object-contain rounded border border-border" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
          </div>
          <details className="space-y-4">
            <summary className="cursor-pointer font-medium text-muted-foreground">Einkaufsliste (Portion / Packung)</summary>
            <div className="mt-2 space-y-4 pl-2">
              <div className="space-y-2">
                <Label>Portion (Menge)</Label>
                <Input type="number" className="min-h-[48px]" value={form.portion_amount} onChange={e => setForm(f => ({ ...f, portion_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Portion (Einheit)</Label>
                <Input className="min-h-[48px]" value={form.portion_unit} onChange={e => setForm(f => ({ ...f, portion_unit: e.target.value }))} placeholder="g" />
              </div>
              <div className="space-y-2">
                <Label>Packung (Menge)</Label>
                <Input type="number" className="min-h-[48px]" value={form.package_amount} onChange={e => setForm(f => ({ ...f, package_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="500" />
              </div>
              <div className="space-y-2">
                <Label>Packung (Bezeichnung)</Label>
                <Input className="min-h-[48px]" value={form.package_label} onChange={e => setForm(f => ({ ...f, package_label: e.target.value }))} placeholder="500g Becher" />
              </div>
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="submit" className="min-h-[48px]">{editing ? 'Speichern' : 'Hinzufügen'}</Button>
            {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ name: '', layer_id: layers[0]?.id ?? '', sort_order: 0, portion_amount: '', portion_unit: '', package_amount: '', package_unit: '', package_label: '', icon_url: '' }); }}>Abbrechen</Button>}
          </div>
        </form>
        <ul className="list-none p-0 border-t border-border pt-4 space-y-2">
          {ingredients.map(i => {
            const layerName = layers.find(l => l.id === i.layer_id)?.name ?? '?'
            return (
              <li key={i.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-foreground flex items-center gap-2">
                  {i.icon_url && <img src={i.icon_url} alt="" className="h-6 w-6 object-contain rounded" />}
                  <strong>{i.name}</strong> ({layerName}) {i.portion_amount != null && <small className="text-muted-foreground">{i.portion_amount}{i.portion_unit} → {i.package_amount}{i.package_unit ?? ''} {i.package_label}</small>}</span>
                <span className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(i)}>Bearbeiten</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => remove(i.id)}>Löschen</Button>
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
