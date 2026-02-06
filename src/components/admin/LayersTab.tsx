import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Layer } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const SELECTION_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'display_only', label: 'Nur Anzeige (feste Basis)' },
  { value: 'single', label: 'Normal (einfach)' },
  { value: 'multiple', label: 'Normal: mehr' },
  { value: 'quantity', label: 'Menge (1,2,3 …)' },
] as const

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[48px]'

export default function LayersTab() {
  const [layers, setLayers] = useState<Layer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Layer> | null>(null)
  const [form, setForm] = useState({ name: '', sort_order: 0, selection_type: 'single' as Layer['selection_type'], quantity_options: '', icon_url: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('layers').select('*').order('sort_order')
    setLayers((data ?? []) as Layer[])
    setLoading(false)
  }

  async function save() {
    if (editing?.id) {
      await supabase.from('layers').update({
        name: form.name,
        sort_order: form.sort_order,
        selection_type: form.selection_type,
        quantity_options: form.quantity_options || null,
        icon_url: form.icon_url.trim() || null,
      }).eq('id', editing.id)
    } else {
      await supabase.from('layers').insert({
        name: form.name,
        sort_order: form.sort_order,
        selection_type: form.selection_type,
        quantity_options: form.quantity_options || null,
        icon_url: form.icon_url.trim() || null,
      })
    }
    setEditing(null)
    setForm({ name: '', sort_order: 0, selection_type: 'single', quantity_options: '', icon_url: '' })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Ebene wirklich löschen? Alle Zutaten der Ebene werden mitgelöscht.')) return
    await supabase.from('layers').delete().eq('id', id)
    load()
  }

  function startEdit(l: Layer) {
    setEditing(l)
    setForm({ name: l.name, sort_order: l.sort_order, selection_type: l.selection_type, quantity_options: l.quantity_options ?? '', icon_url: l.icon_url ?? '' })
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Ebenen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input className="min-h-[48px]" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Basis" required />
          </div>
          <div className="space-y-2">
            <Label>Reihenfolge</Label>
            <Input type="number" className="min-h-[48px]" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>Auswahlmodus</Label>
            <select className={cn(selectClass)} value={form.selection_type} onChange={e => setForm(f => ({ ...f, selection_type: e.target.value as Layer['selection_type'] }))}>
              {SELECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.selection_type === 'quantity' && (
            <div className="space-y-2">
              <Label>Mengenoptionen (z. B. 1,2,3)</Label>
              <Input className="min-h-[48px]" value={form.quantity_options} onChange={e => setForm(f => ({ ...f, quantity_options: e.target.value }))} placeholder="1,2,3" />
            </div>
          )}
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
          <div className="flex gap-2">
            <Button type="submit" className="min-h-[48px]">{editing ? 'Speichern' : 'Hinzufügen'}</Button>
            {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ name: '', sort_order: 0, selection_type: 'single', quantity_options: '', icon_url: '' }); }}>Abbrechen</Button>}
          </div>
        </form>
        <ul className="list-none p-0 m-0 border-t border-border pt-4 space-y-2">
          {layers.map(l => (
            <li key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-foreground flex items-center gap-2">
                {l.icon_url && <img src={l.icon_url} alt="" className="h-6 w-6 object-contain rounded" />}
                <strong>{l.name}</strong> (Reihe {l.sort_order}, {SELECTION_OPTIONS.find(o => o.value === l.selection_type)?.label ?? l.selection_type}{l.quantity_options ? `: ${l.quantity_options}` : ''})</span>
              <span className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(l)}>Bearbeiten</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => remove(l.id)}>Löschen</Button>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
