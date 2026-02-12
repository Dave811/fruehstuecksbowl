import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ingredient, Layer } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'
import { Sketch } from '@uiw/react-color'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'

const SELECTION_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'display_only', label: 'Nur Anzeige (feste Basis)' },
  { value: 'single', label: 'Einfach Auswahl' },
  { value: 'multiple', label: 'Mehrfachauswahl' },
] as const

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]'

const DEFAULT_ICON_COLOR = '#8db600'

function getIconUrlColor(url: string): string {
  if (!url?.trim()) return DEFAULT_ICON_COLOR
  const m = url.match(/[?&]color=([0-9a-fA-F]{3,6})/)
  if (!m) return DEFAULT_ICON_COLOR
  const hex = m[1]
  return '#' + (hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex)
}

function setIconUrlColor(url: string, hex: string): string {
  const value = hex.replace(/^#/, '')
  if (!url?.trim()) return url
  const without = url.replace(/[?&]color=[0-9a-fA-F]{3,6}/gi, '').replace(/\?&/, '?').replace(/\?$/, '')
  const sep = without.includes('?') ? '&' : '?'
  return without + sep + 'color=' + value
}

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
  default_quantity: '' as number | '',
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

  function getAvailableIngredientsByLayer(layerId: string): Ingredient[] {
    return ingredients.filter(i => i.layer_id === layerId && i.is_available !== false).sort((a, b) => a.sort_order - b.sort_order)
  }

  function getUnavailableIngredients(): Ingredient[] {
    return ingredients.filter(i => i.is_available === false).sort((a, b) => a.sort_order - b.sort_order)
  }

  function getNextSortOrderForLayer(layerId: string): number {
    const ings = getAvailableIngredientsByLayer(layerId)
    return ings.length
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
      default_quantity: form.default_quantity === '' ? 0 : Math.max(0, Number(form.default_quantity) || 0),
    }
    if (editing?.id) {
      await supabase.from('ingredients').update(payload).eq('id', editing.id)
    } else {
      if (!payload.layer_id) return
      await supabase.from('ingredients').insert(payload)
    }
    setEditing(null)
    setForm({ ...emptyIngredientForm, layer_id: availableLayers[0]?.id ?? layers[0]?.id ?? '', sort_order: 0 })
    load()
  }

  async function removeIngredient(id: string) {
    if (!confirm('Zutat löschen?')) return
    await supabase.from('ingredients').delete().eq('id', id)
    load()
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return

    const availableLayers = layers.filter(l => l.is_available !== false).sort((a, b) => a.sort_order - b.sort_order)
    const unavailableLayers = layers.filter(l => l.is_available === false).sort((a, b) => a.sort_order - b.sort_order)
    const layerId = draggableId.startsWith('layer-') ? draggableId.slice(6) : null

    if (layerId && (source.droppableId === 'layers' || source.droppableId === 'layers-unavailable') && (destination.droppableId === 'layers' || destination.droppableId === 'layers-unavailable')) {
      if (source.droppableId === 'layers' && destination.droppableId === 'layers-unavailable') {
        await supabase.from('layers').update({ is_available: false, sort_order: 1000 + unavailableLayers.length }).eq('id', layerId)
        load()
        return
      }
      if (source.droppableId === 'layers-unavailable' && destination.droppableId === 'layers') {
        const toIdx = destination.index
        const newOrder = [...availableLayers]
        const layer = unavailableLayers.find(l => l.id === layerId) ?? layers.find(l => l.id === layerId)
        if (!layer) return
        newOrder.splice(toIdx, 0, layer)
        for (let i = 0; i < newOrder.length; i++) {
          await supabase.from('layers').update({ sort_order: i, is_available: true }).eq('id', newOrder[i].id)
        }
        load()
        return
      }
      if (source.droppableId === 'layers-unavailable' && destination.droppableId === 'layers-unavailable') {
        if (source.index === destination.index) return
        const reordered = [...unavailableLayers]
        const [removed] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, removed)
        for (let i = 0; i < reordered.length; i++) {
          await supabase.from('layers').update({ sort_order: 1000 + i }).eq('id', reordered[i].id)
        }
        load()
        return
      }
      if (source.droppableId === 'layers' && destination.droppableId === 'layers') {
        const fromIdx = source.index
        const toIdx = destination.index
        if (fromIdx === toIdx) return
        const reordered = [...availableLayers]
        const [removed] = reordered.splice(fromIdx, 1)
        reordered.splice(toIdx, 0, removed)
        for (let i = 0; i < reordered.length; i++) {
          await supabase.from('layers').update({ sort_order: i }).eq('id', reordered[i].id)
        }
        load()
        return
      }
    }

    const GLOBAL_UNAV = 'ingredients-unavailable'

    if (destination.droppableId === GLOBAL_UNAV) {
      if (source.droppableId.startsWith('ing-') && source.droppableId !== GLOBAL_UNAV) {
        const layerId = source.droppableId.replace(/^ing-/, '')
        const listSource = getAvailableIngredientsByLayer(layerId)
        const dragged = listSource[source.index]
        if (!dragged) return
        const unav = getUnavailableIngredients()
        await supabase.from('ingredients').update({ is_available: false, sort_order: 1000 + unav.length }).eq('id', dragged.id)
        const listAv = listSource.filter(ing => ing.id !== dragged.id)
        for (let i = 0; i < listAv.length; i++) {
          await supabase.from('ingredients').update({ sort_order: i }).eq('id', listAv[i].id)
        }
        load()
        return
      }
      if (source.droppableId === GLOBAL_UNAV && destination.droppableId === GLOBAL_UNAV) {
        const listUnav = getUnavailableIngredients()
        const [removed] = listUnav.splice(source.index, 1)
        listUnav.splice(destination.index, 0, removed)
        for (let i = 0; i < listUnav.length; i++) {
          await supabase.from('ingredients').update({ sort_order: 1000 + i }).eq('id', listUnav[i].id)
        }
        load()
        return
      }
    }

    if (source.droppableId === GLOBAL_UNAV && destination.droppableId.startsWith('ing-') && destination.droppableId !== GLOBAL_UNAV) {
      const layerId = destination.droppableId.replace(/^ing-/, '')
      const listUnav = getUnavailableIngredients()
      const dragged = listUnav[source.index]
      if (!dragged) return
      const listDest = getAvailableIngredientsByLayer(layerId)
      const toIdx = destination.index
      const newOrder = [...listDest]
      newOrder.splice(toIdx, 0, dragged)
      for (let i = 0; i < newOrder.length; i++) {
        await supabase.from('ingredients').update({ sort_order: i, is_available: true, layer_id: layerId }).eq('id', newOrder[i].id)
      }
      load()
      return
    }

    if (source.droppableId.startsWith('ing-') && destination.droppableId.startsWith('ing-') && source.droppableId !== GLOBAL_UNAV && destination.droppableId !== GLOBAL_UNAV) {
      const sourceLayerId = source.droppableId.replace(/^ing-/, '')
      const destLayerId = destination.droppableId.replace(/^ing-/, '')
      const listSource = getAvailableIngredientsByLayer(sourceLayerId)
      const dragged = listSource[source.index]
      if (!dragged) return
      const listDest = getAvailableIngredientsByLayer(destLayerId)
      if (sourceLayerId === destLayerId) {
        const reordered = [...listSource]
        const [removed] = reordered.splice(source.index, 1)
        reordered.splice(destination.index, 0, removed)
        for (let i = 0; i < reordered.length; i++) {
          await supabase.from('ingredients').update({ sort_order: i }).eq('id', reordered[i].id)
        }
      } else {
        const newOrder = [...listDest]
        newOrder.splice(destination.index, 0, dragged)
        for (let i = 0; i < newOrder.length; i++) {
          await supabase.from('ingredients').update({ layer_id: destLayerId, sort_order: i }).eq('id', newOrder[i].id)
        }
      }
      load()
    }
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
      default_quantity: (i as { default_quantity?: number | null }).default_quantity ?? '',
    })
  }

  function resetIngredientForm() {
    setEditing(null)
    setForm({ ...emptyIngredientForm, layer_id: availableLayers[0]?.id ?? layers[0]?.id ?? '', sort_order: 0 })
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

  const availableLayers = [...layers].filter(l => l.is_available !== false).sort((a, b) => a.sort_order - b.sort_order)
  const unavailableLayers = [...layers].filter(l => l.is_available === false).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Card className="mb-4 w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="min-w-0">
        <CardTitle className="truncate">Ebenen & Zutaten</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Ebenen bearbeiten, Zutaten pro Ebene hinzufügen und sortieren. Reihenfolge wird beim Hinzufügen automatisch gesetzt.</p>
      </CardHeader>
      <CardContent className="space-y-6 min-w-0">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="mb-0">Icon (URL)</Label>
                  <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
                    <a href="https://icons8.com/icons" target="_blank" rel="noopener noreferrer" title="Icons8: Icon wählen, dann Bildadresse kopieren und hier einfügen">
                      Icon suchen (Icons8)
                    </a>
                  </Button>
                </div>
                <Input value={layerForm.icon_url} onChange={e => setLayerForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://…" className="min-h-[44px]" />
                {layerForm.icon_url.trim() && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground mb-0">Icon-Farbe</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-9 w-14 rounded border border-input cursor-pointer shrink-0"
                          style={{ backgroundColor: getIconUrlColor(layerForm.icon_url) }}
                          title="Farbe des Icons (Icons8)"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <Sketch
                          color={getIconUrlColor(layerForm.icon_url)}
                          onChange={(color) => setLayerForm(f => ({ ...f, icon_url: setIconUrlColor(f.icon_url, color.hex) }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => { saveLayer(); }}>Speichern</Button>
                <Button type="button" variant="outline" onClick={resetLayerForm}>Abbrechen</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingredient add/edit form */}
        <details open={!!editing || !!form.layer_id} className="space-y-3">
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
                  {availableLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reihenfolge (wird beim Hinzufügen automatisch gesetzt)</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} className="min-h-[44px] w-24" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="mb-0">Icon (URL)</Label>
                  <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
                    <a href="https://icons8.com/icons" target="_blank" rel="noopener noreferrer" title="Icons8: Icon wählen, dann Bildadresse kopieren und hier einfügen">
                      Icon suchen (Icons8)
                    </a>
                  </Button>
                </div>
                <Input value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://…" className="min-h-[44px]" />
                {form.icon_url.trim() && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground mb-0">Icon-Farbe</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-9 w-14 rounded border border-input cursor-pointer shrink-0"
                          style={{ backgroundColor: getIconUrlColor(form.icon_url) }}
                          title="Farbe des Icons (Icons8)"
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <Sketch
                          color={getIconUrlColor(form.icon_url)}
                          onChange={(color) => setForm(f => ({ ...f, icon_url: setIconUrlColor(f.icon_url, color.hex) }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
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
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Vorauswahl</Label>
                <Input type="number" min={0} className="h-9 w-20" value={form.default_quantity} onChange={e => setForm(f => ({ ...f, default_quantity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0) }))} placeholder="0" />
                <span className="text-xs text-muted-foreground">(nur Mehrfach-/Mengen-Ebenen)</span>
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

        {/* Layers and ingredients: available (left) | Nicht verfügbar (right) */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-[1fr_280px]">
            <Droppable droppableId="layers" type="layer">
              {(layersProvided) => (
                <div
                  ref={layersProvided.innerRef}
                  {...layersProvided.droppableProps}
                  className="space-y-6 min-w-0"
                >
                  <p className="text-sm font-medium text-muted-foreground">Verfügbare Ebenen (im Bestellformular sichtbar)</p>
                  {availableLayers.map((layer, layerIndex) => {
                    const ings = getAvailableIngredientsByLayer(layer.id)
                    return (
                      <Draggable key={layer.id} draggableId={`layer-${layer.id}`} index={layerIndex}>
                        {(layerProvided, layerSnapshot) => (
                          <section
                            ref={layerProvided.innerRef}
                            {...layerProvided.draggableProps}
                            className={cn(
                              'rounded-lg border border-border p-4 space-y-3 transition-opacity min-h-[4rem]',
                              layerSnapshot.isDragging && 'opacity-60 shadow-md'
                            )}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 rounded-md p-2 -m-2">
                              <div className="flex items-center gap-2 shrink-0 min-w-0" {...layerProvided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" aria-hidden />
                                {layer.icon_url && <img src={layer.icon_url} alt="" className="h-6 w-6 object-contain rounded shrink-0" />}
                                <strong className="text-foreground truncate">{layer.name}</strong>
                                <span className="text-muted-foreground text-sm shrink-0">(Reihe {layer.sort_order}, {SELECTION_OPTIONS.find(o => o.value === layer.selection_type)?.label ?? layer.selection_type})</span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button type="button" variant="outline" size="sm" onClick={() => startEditLayer(layer)}>Ebene bearbeiten</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => removeLayer(layer.id)}>Ebene löschen</Button>
                                <Button type="button" size="sm" onClick={() => startAddForLayer(layer.id)}>Zutat hinzufügen</Button>
                              </div>
                            </div>
                            <Droppable droppableId={`ing-${layer.id}`} type="ingredient">
                              {(ingProvided, ingSnapshot) => (
                                <ul
                                  ref={ingProvided.innerRef}
                                  {...ingProvided.droppableProps}
                                  className={cn(
                                    'list-none p-0 m-0 space-y-1 min-h-[8px] rounded-md transition-colors',
                                    ingSnapshot.isDraggingOver && 'bg-primary/5'
                                  )}
                                >
                                  {ings.map((ing, ingIndex) => (
                                    <Draggable key={ing.id} draggableId={ing.id} index={ingIndex}>
                                      {(ingProvided, ingSnapshot) => (
                                        <li
                                          ref={ingProvided.innerRef}
                                          {...ingProvided.draggableProps}
                                          {...ingProvided.dragHandleProps}
                                          className={cn(
                                            'flex items-center gap-2 py-2 px-2 rounded-md cursor-grab active:cursor-grabbing',
                                            editing?.id === ing.id && 'bg-primary/10',
                                            ingSnapshot.isDragging && 'opacity-60 shadow-sm'
                                          )}
                                        >
                                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                                          {ing.icon_url && <img src={ing.icon_url} alt="" className="h-5 w-5 object-contain rounded shrink-0" />}
                                          <span className="font-medium min-w-0 truncate">{ing.name}</span>
                                          <div className="flex gap-1 ml-auto shrink-0">
                                            <Button type="button" variant="outline" size="sm" onClick={() => startEditIngredient(ing)}>Bearbeiten</Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => removeIngredient(ing.id)}>Löschen</Button>
                                          </div>
                                        </li>
                                      )}
                                    </Draggable>
                                  ))}
                                  {ingProvided.placeholder}
                                </ul>
                              )}
                            </Droppable>
                            {ings.length === 0 && (
                              <p className="text-muted-foreground text-sm">Noch keine Zutaten. „Zutat hinzufügen“ klicken.</p>
                            )}
                          </section>
                        )}
                      </Draggable>
                    )
                  })}
                  {layersProvided.placeholder}
                </div>
              )}
            </Droppable>

            <div className="flex flex-col gap-4 min-w-0">
              <Droppable droppableId="layers-unavailable" type="layer">
                {(unavProvided) => (
                  <div
                    ref={unavProvided.innerRef}
                    {...unavProvided.droppableProps}
                    className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 min-h-[100px] min-w-0 flex flex-col"
                  >
                    <p className="text-sm font-medium text-muted-foreground mb-2">Nicht verfügbar (Ebenen)</p>
                    <p className="text-xs text-muted-foreground mb-2">Ebenen hierher ziehen, um sie im Bestellformular auszublenden.</p>
                    <ul className="list-none p-0 m-0 space-y-2 flex-1">
                      {unavailableLayers.map((layer, idx) => (
                        <Draggable key={layer.id} draggableId={`layer-${layer.id}`} index={idx}>
                          {(prov, snap) => (
                            <li
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={cn(
                                'flex items-center gap-2 py-2 px-2 rounded-md border border-border bg-background cursor-grab active:cursor-grabbing',
                                snap.isDragging && 'opacity-60 shadow-sm'
                              )}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                              {layer.icon_url && <img src={layer.icon_url} alt="" className="h-5 w-5 object-contain rounded shrink-0" />}
                              <span className="font-medium text-sm truncate">{layer.name}</span>
                            </li>
                          )}
                        </Draggable>
                      ))}
                    </ul>
                    {unavProvided.placeholder}
                  </div>
                )}
              </Droppable>

              <Droppable droppableId="ingredients-unavailable" type="ingredient">
                {(ingUnavProvided, ingUnavSnapshot) => (
                  <div
                    ref={ingUnavProvided.innerRef}
                    {...ingUnavProvided.droppableProps}
                    className={cn(
                      'rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 min-h-[100px] min-w-0 flex flex-col',
                      ingUnavSnapshot.isDraggingOver && 'bg-muted/50'
                    )}
                  >
                    <p className="text-sm font-medium text-muted-foreground mb-2">Nicht verfügbar (Zutaten)</p>
                    <p className="text-xs text-muted-foreground mb-2">Zutaten hierher ziehen, um sie im Bestellformular auszublenden.</p>
                    <ul className="list-none p-0 m-0 space-y-1.5 flex-1">
                      {getUnavailableIngredients().map((ing, idx) => {
                        const layer = layers.find(l => l.id === ing.layer_id)
                        return (
                          <Draggable key={ing.id} draggableId={ing.id} index={idx}>
                            {(prov, snap) => (
                              <li
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={cn(
                                  'flex items-center gap-2 py-1.5 px-2 rounded-md border border-border bg-background cursor-grab active:cursor-grabbing text-muted-foreground',
                                  snap.isDragging && 'opacity-60 shadow-sm'
                                )}
                              >
                                <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
                                {ing.icon_url && <img src={ing.icon_url} alt="" className="h-4 w-4 object-contain rounded shrink-0" />}
                                <span className="text-sm truncate">{ing.name}</span>
                                {layer && <span className="text-xs text-muted-foreground/80 truncate">({layer.name})</span>}
                                <div className="ml-auto shrink-0 flex gap-0.5">
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); startEditIngredient(ing); }}>Bearbeiten</Button>
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); removeIngredient(ing.id); }}>Löschen</Button>
                                </div>
                              </li>
                            )}
                          </Draggable>
                        )
                      })}
                    </ul>
                    {ingUnavProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>

        {!editingLayer && !addingLayer && (
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={startAddLayer}>
            Ebene hinzufügen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
