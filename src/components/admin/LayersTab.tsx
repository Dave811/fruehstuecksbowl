import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Layer } from '../../types'

const SELECTION_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'single', label: 'Normal (einfach)' },
  { value: 'multiple', label: 'Normal: mehr' },
  { value: 'quantity', label: 'Menge (1,2,3 …)' },
] as const

export default function LayersTab() {
  const [layers, setLayers] = useState<Layer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Layer> | null>(null)
  const [form, setForm] = useState({ name: '', sort_order: 0, selection_type: 'single' as Layer['selection_type'], quantity_options: '' })

  useEffect(() => {
    load()
  }, [])

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
      }).eq('id', editing.id)
    } else {
      await supabase.from('layers').insert({
        name: form.name,
        sort_order: form.sort_order,
        selection_type: form.selection_type,
        quantity_options: form.quantity_options || null,
      })
    }
    setEditing(null)
    setForm({ name: '', sort_order: 0, selection_type: 'single', quantity_options: '' })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Ebene wirklich löschen? Alle Zutaten der Ebene werden mitgelöscht.')) return
    await supabase.from('layers').delete().eq('id', id)
    load()
  }

  function startEdit(l: Layer) {
    setEditing(l)
    setForm({
      name: l.name,
      sort_order: l.sort_order,
      selection_type: l.selection_type,
      quantity_options: l.quantity_options ?? '',
    })
  }

  if (loading) return <p>Lade …</p>

  return (
    <div className="card">
      <h2>Ebenen</h2>
      <form onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="form-group">
          <label>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Basis" required />
        </div>
        <div className="form-group">
          <label>Reihenfolge</label>
          <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
        </div>
        <div className="form-group">
          <label>Auswahlmodus</label>
          <select value={form.selection_type} onChange={e => setForm(f => ({ ...f, selection_type: e.target.value as Layer['selection_type'] }))}>
            {SELECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {form.selection_type === 'quantity' && (
          <div className="form-group">
            <label>Mengenoptionen (z. B. 1,2,3)</label>
            <input value={form.quantity_options} onChange={e => setForm(f => ({ ...f, quantity_options: e.target.value }))} placeholder="1,2,3" />
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="submit" className="btn">{editing ? 'Speichern' : 'Hinzufügen'}</button>
          {editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm({ name: '', sort_order: 0, selection_type: 'single', quantity_options: '' }); }}>Abbrechen</button>}
        </div>
      </form>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {layers.map(l => (
          <li key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span><strong>{l.name}</strong> (Reihe {l.sort_order}, {SELECTION_OPTIONS.find(o => o.value === l.selection_type)?.label ?? l.selection_type}{l.quantity_options ? `: ${l.quantity_options}` : ''})</span>
            <span>
              <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem' }} onClick={() => startEdit(l)}>Bearbeiten</button>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => remove(l.id)}>Löschen</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
