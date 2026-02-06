import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ingredient, Layer } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

const SELECTION_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'display_only', label: 'Nur Anzeige (feste Basis)' },
  { value: 'single', label: 'Einfach Auswahl' },
  { value: 'multiple', label: 'Mehrfachauswahl' },
] as const

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]'

const emptyIngredientForm = {
  name: '',
  layer_id: '',
  sort_order: 0,
  portion_amount: '' as number | '',
  portion_unit: '',
  package_amount: '' as number | '',
  package_unit: '',
  package_label: '',
  icon_url: '',
  allow_delete: false,
  allow_add_more: false,
  max_quantity: '' as number | '',
}

const emptyLayerForm = {
  name: '',
  sort_order: 0,
  selection_type: 'single' as Layer['selection_type'],
  quantity_options: '',
  icon_url: '',
}

export default function IngredientsTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null)
  const [form, setForm] = useState(emptyIngredientForm)
  const [editingLayer, setEditingLayer] = useState<Partial<Layer> | null>(null)
  const [addingLayer, setAddingLayer] = useState(false)
  const [layerForm, setLayerForm] = useState(emptyLayerForm)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null)

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

  function getIngredientsByLayer(layerId: string): Ingredient[] {
    return ingredients.filter(i => i.layer_id === layerId).sort((a, b) => a.sort_order - b.sort_order)
  }

  function getNextSortOrderForLayer(layerId: string): number {
    const ings = getIngredientsByLayer(layerId)
    if (ings.length === 0) return 0
    return Math.max(...ings.map(i => i.sort_order), -1) + 1
  }

  function startAddForLayer(layerId: string) {
    setEditing(null)
    setForm({
      ...emptyIngredientForm,
      layer_id: layerId,
      sort_order: getNextSortOrderForLayer(layerId),
    })
  }

  async function saveIngredient() {
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
      allow_delete: form.allow_delete,
      allow_add_more: form.allow_add_more,
      max_quantity: form.max_quantity === '' ? null : (Number(form.max_quantity) || null),
    }
    if (editing?.id) {
      await supabase.from('ingredients').update(payload).eq('id', editing.id)
    } else {
      if (!payload.layer_id) return
      await supabase.from('ingredients').insert(payload)
    }
    setEditing(null)
    setForm({ ...emptyIngredientForm, layer_id: layers[0]?.id ?? '', sort_order: 0 })
    load()
  }

  async function removeIngredient(id: string) {
    if (!confirm('Zutat löschen?')) return
    await supabase.from('ingredients').delete().eq('id', id)
    load()
  }

  async function handleIngredientDrop(draggedId: string, targetIngId: string, targetLayerId: string) {
    const dragged = ingredients.find(i => i.id === draggedId)
    if (!dragged) return
    if (dragged.layer_id === targetLayerId) {
      const list = getIngredientsByLayer(targetLayerId)
      const fromIdx = list.findIndex(i => i.id === draggedId)
      const toIdx = list.findIndex(i => i.id === targetIngId)
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
      const reordered = list.filter(i => i.id !== draggedId)
      reordered.splice(toIdx, 0, dragged)
      for (let i = 0; i < reordered.length; i++) {
        await supabase.from('ingredients').update({ sort_order: i }).eq('id', reordered[i].id)
      }
    } else {
      const newOrder = getNextSortOrderForLayer(targetLayerId)
      await supabase.from('ingredients').update({ layer_id: targetLayerId, sort_order: newOrder }).eq('id', draggedId)
    }
    load()
  }

  async function reorderLayers(draggedLayerId: string, targetLayerId: string) {
    if (draggedLayerId === targetLayerId) return
    const sorted = [...layers].sort((a, b) => a.sort_order - b.sort_order)
    const fromIdx = sorted.findIndex(l => l.id === draggedLayerId)
    const toIdx = sorted.findIndex(l => l.id === targetLayerId)
    if (fromIdx < 0 || toIdx < 0) return
    const reordered = sorted.filter(l => l.id !== draggedLayerId)
    reordered.splice(toIdx, 0, sorted[fromIdx])
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('layers').update({ sort_order: i }).eq('id', reordered[i].id)
    }
    load()
  }

  function startEditIngredient(i: Ingredient) {
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
      allow_delete: i.allow_delete ?? false,
      allow_add_more: i.allow_add_more ?? false,
      max_quantity: i.max_quantity ?? '',
    })
  }

  function resetIngredientForm() {
    setEditing(null)
    setForm({ ...emptyIngredientForm, layer_id: layers[0]?.id ?? '', sort_order: 0 })
  }

  // --- Layer ---
  async function saveLayer() {
    if (editingLayer?.id) {
      await supabase.from('layers').update({
        name: layerForm.name,
        sort_order: layerForm.sort_order,
        selection_type: layerForm.selection_type,
        quantity_options: layerForm.quantity_options || null,
        icon_url: layerForm.icon_url.trim() || null,
      }).eq('id', editingLayer.id)
    } else if (addingLayer) {
      await supabase.from('layers').insert({
        name: layerForm.name,
        sort_order: layerForm.sort_order,
        selection_type: layerForm.selection_type,
        quantity_options: layerForm.quantity_options || null,
        icon_url: layerForm.icon_url.trim() || null,
      })
    }
    setEditingLayer(null)
    setAddingLayer(false)
    setLayerForm(emptyLayerForm)
    load()
  }

  async function removeLayer(id: string) {
    if (!confirm('Ebene wirklich löschen? Alle Zutaten der Ebene werden mitgelöscht.')) return
    await supabase.from('layers').delete().eq('id', id)
    load()
  }

  function startEditLayer(l: Layer) {
    setAddingLayer(false)
    setEditingLayer(l)
    setLayerForm({ name: l.name, sort_order: l.sort_order, selection_type: l.selection_type, quantity_options: l.quantity_options ?? '', icon_url: l.icon_url ?? '' })
  }

  function startAddLayer() {
    setEditingLayer(null)
    setAddingLayer(true)
    setLayerForm({ ...emptyLayerForm, sort_order: layers.length })
  }

  function resetLayerForm() {
    setEditingLayer(null)
    setAddingLayer(false)
    setLayerForm(emptyLayerForm)
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  const sortedLayers = [...layers].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Ebenen & Zutaten</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Ebenen bearbeiten, Zutaten pro Ebene hinzufügen und sortieren. Reihenfolge wird beim Hinzufügen automatisch gesetzt.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layer add/edit form */}
        {(editingLayer || addingLayer) && (
          <Card className="border-muted bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{editingLayer ? 'Ebene bearbeiten' : 'Neue Ebene'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={layerForm.name} onChange={e => setLayerForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Sauce" className="min-h-[44px]" />
                </div>
                <div className="space-y-2">
                  <Label>Reihenfolge</Label>
                  <Input type="number" value={layerForm.sort_order} onChange={e => setLayerForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} className="min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Auswahlmodus</Label>
                <select className={cn(selectClass)} value={layerForm.selection_type} onChange={e => setLayerForm(f => ({ ...f, selection_type: e.target.value as Layer['selection_type'] }))}>
                  {SELECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Icon (URL)</Label>
                <Input value={layerForm.icon_url} onChange={e => setLayerForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://…" className="min-h-[44px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => { saveLayer(); }}>Speichern</Button>
                <Button type="button" variant="outline" onClick={resetLayerForm}>Abbrechen</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingredient add/edit form */}
        <details open={!!editing || (!!form.name && !!form.layer_id)} className="space-y-3">
          <summary className="cursor-pointer font-medium">
            {editing ? 'Zutat bearbeiten' : 'Zutat hinzufügen'}
          </summary>
          <form onSubmit={e => { e.preventDefault(); saveIngredient(); }} className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Skir" required className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Ebene</Label>
                <select className={cn(selectClass)} value={form.layer_id} onChange={e => setForm(f => ({ ...f, layer_id: e.target.value }))} required>
                  <option value="">— wählen —</option>
                  {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reihenfolge (wird beim Hinzufügen automatisch gesetzt)</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} className="min-h-[44px] w-24" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label className="mb-0">Icon (URL)</Label>
                <Input value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://…" className="min-h-[44px]" />
              </div>
              {form.icon_url.trim() && <img src={form.icon_url.trim()} alt="" className="h-10 w-10 object-contain rounded border" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allow_delete} onChange={e => setForm(f => ({ ...f, allow_delete: e.target.checked }))} className="w-4 h-4 rounded border-input" />
                <span className="text-sm">Button „Entfernen“</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allow_add_more} onChange={e => setForm(f => ({ ...f, allow_add_more: e.target.checked }))} className="w-4 h-4 rounded border-input" />
                <span className="text-sm">Button „Mehr“</span>
              </label>
              <div className="flex items-center gap-2">
                <Label className="mb-0 text-sm">Max. Anzahl</Label>
                <Input type="number" min={1} className="h-9 w-20" value={form.max_quantity} onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="—" />
              </div>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Einkaufsliste (Portion / Packung)</summary>
              <div className="grid gap-2 sm:grid-cols-2 pt-2">
                <div><Label className="text-xs">Portion</Label><Input value={form.portion_amount} onChange={e => setForm(f => ({ ...f, portion_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="100" className="h-9" /></div>
                <div><Label className="text-xs">Einheit</Label><Input value={form.portion_unit} onChange={e => setForm(f => ({ ...f, portion_unit: e.target.value }))} placeholder="g" className="h-9" /></div>
                <div><Label className="text-xs">Packung Menge</Label><Input value={form.package_amount} onChange={e => setForm(f => ({ ...f, package_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="500" className="h-9" /></div>
                <div><Label className="text-xs">Packung Bezeichnung</Label><Input value={form.package_label} onChange={e => setForm(f => ({ ...f, package_label: e.target.value }))} placeholder="500g" className="h-9" /></div>
              </div>
            </details>
            <div className="flex gap-2">
              <Button type="submit" className="min-h-[44px]">{editing ? 'Speichern' : 'Hinzufügen'}</Button>
              {editing && <Button type="button" variant="outline" onClick={resetIngredientForm}>Abbrechen</Button>}
            </div>
          </form>
        </details>

        {/* Layers and ingredients grouped */}
        <div className="space-y-6 border-t border-border pt-4">
          {sortedLayers.map(layer => {
            const ings = getIngredientsByLayer(layer.id)
            return (
              <section key={layer.id} className={cn('rounded-lg border border-border p-4 space-y-3 transition-opacity', draggingLayerId === layer.id && 'opacity-60')}>
                <div
                  className={cn('flex items-center justify-between flex-wrap gap-2 rounded-md p-2 -m-2 transition-colors', dragOverLayerId === layer.id && 'bg-primary/10 ring-2 ring-primary/30')}
                  onDragOver={e => {
                    const isLayerDrag = e.dataTransfer.types.includes('application/x-layer-id')
                    if (!isLayerDrag) {
                      setDragOverLayerId(null)
                      return
                    }
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverId(null)
                    if (draggingLayerId === layer.id) return
                    setDragOverLayerId(layer.id)
                  }}
                  onDragLeave={() => setDragOverLayerId(null)}
                  onDrop={e => {
                    if (!e.dataTransfer.types.includes('application/x-layer-id')) return
                    e.preventDefault()
                    setDragOverLayerId(null)
                    const layerId = e.dataTransfer.getData('application/x-layer-id')
                    if (layerId) reorderLayers(layerId, layer.id)
                  }}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/x-layer-id', layer.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingLayerId(layer.id)
                        setDragOverId(null)
                      }}
                      onDragEnd={() => setDraggingLayerId(null)}
                      className="cursor-grab active:cursor-grabbing touch-none"
                      title="Ebene verschieben"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    {layer.icon_url && <img src={layer.icon_url} alt="" className="h-6 w-6 object-contain rounded" />}
                    <strong className="text-foreground">{layer.name}</strong>
                    <span className="text-muted-foreground text-sm">(Reihe {layer.sort_order}, {SELECTION_OPTIONS.find(o => o.value === layer.selection_type)?.label ?? layer.selection_type})</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEditLayer(layer)}>Ebene bearbeiten</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeLayer(layer.id)}>Ebene löschen</Button>
                    <Button type="button" size="sm" onClick={() => startAddForLayer(layer.id)}>Zutat hinzufügen</Button>
                  </div>
                </div>
                <ul className="list-none p-0 m-0 space-y-1">
                  {ings.map((ing) => (
                    <li
                      key={ing.id}
                      draggable
                      data-ingredient-id={ing.id}
                      data-layer-id={layer.id}
                      className={cn(
                        'flex items-center gap-2 py-2 px-2 rounded-md cursor-grab active:cursor-grabbing',
                        editing?.id === ing.id && 'bg-primary/10',
                        dragOverId === ing.id && 'ring-2 ring-primary bg-primary/5',
                        draggingId === ing.id && 'opacity-60'
                      )}
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', ing.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingId(ing.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={e => {
                        if (e.dataTransfer.types.includes('application/x-layer-id')) return
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverId(ing.id)
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={e => {
                        e.preventDefault()
                        setDragOverId(null)
                        const id = e.dataTransfer.getData('text/plain')
                        if (id && id !== ing.id) handleIngredientDrop(id, ing.id, layer.id)
                      }}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      {ing.icon_url && <img src={ing.icon_url} alt="" className="h-5 w-5 object-contain rounded shrink-0" />}
                      <span className="font-medium min-w-0 truncate">{ing.name}</span>
                      <div className="flex gap-1 ml-auto shrink-0">
                        <Button type="button" variant="outline" size="sm" onClick={() => startEditIngredient(ing)}>Bearbeiten</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeIngredient(ing.id)}>Löschen</Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {ings.length === 0 && (
                  <p className="text-muted-foreground text-sm">Noch keine Zutaten. „Zutat hinzufügen“ klicken.</p>
                )}
              </section>
            )
          })}
        </div>

        {!editingLayer && !addingLayer && (
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={startAddLayer}>
            Ebene hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
