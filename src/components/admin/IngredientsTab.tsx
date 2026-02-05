import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Ingredient, Layer } from '../../types'

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
  })

  useEffect(() => {
    load()
  }, [])

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
    }
    if (editing?.id) {
      await supabase.from('ingredients').update(payload).eq('id', editing.id)
    } else {
      if (!payload.layer_id) return
      await supabase.from('ingredients').insert(payload)
    }
    setEditing(null)
    setForm({ name: '', layer_id: layers[0]?.id ?? '', sort_order: 0, portion_amount: '', portion_unit: '', package_amount: '', package_unit: '', package_label: '' })
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
    })
  }

  if (loading) return <p>Lade …</p>

  return (
    <div className="card">
      <h2>Zutaten</h2>
      <form onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="form-group">
          <label>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Skir" required />
        </div>
        <div className="form-group">
          <label>Ebene</label>
          <select value={form.layer_id} onChange={e => setForm(f => ({ ...f, layer_id: e.target.value }))} required>
            <option value="">— wählen —</option>
            {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Reihenfolge</label>
          <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
        </div>
        <details>
          <summary>Einkaufsliste (Portion / Packung)</summary>
          <div className="form-group">
            <label>Portion (Menge)</label>
            <input type="number" value={form.portion_amount} onChange={e => setForm(f => ({ ...f, portion_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="100" />
          </div>
          <div className="form-group">
            <label>Portion (Einheit)</label>
            <input value={form.portion_unit} onChange={e => setForm(f => ({ ...f, portion_unit: e.target.value }))} placeholder="g" />
          </div>
          <div className="form-group">
            <label>Packung (Menge)</label>
            <input type="number" value={form.package_amount} onChange={e => setForm(f => ({ ...f, package_amount: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="500" />
          </div>
          <div className="form-group">
            <label>Packung (Bezeichnung)</label>
            <input value={form.package_label} onChange={e => setForm(f => ({ ...f, package_label: e.target.value }))} placeholder="500g Becher" />
          </div>
        </details>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="submit" className="btn">{editing ? 'Speichern' : 'Hinzufügen'}</button>
          {editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm({ name: '', layer_id: layers[0]?.id ?? '', sort_order: 0, portion_amount: '', portion_unit: '', package_amount: '', package_unit: '', package_label: '' }); }}>Abbrechen</button>}
        </div>
      </form>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {ingredients.map(i => {
          const layerName = layers.find(l => l.id === i.layer_id)?.name ?? '?'
          return (
            <li key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span><strong>{i.name}</strong> ({layerName}) {i.portion_amount != null && <small>{i.portion_amount}{i.portion_unit} → {i.package_amount}{i.package_unit ?? ''} {i.package_label}</small>}</span>
              <span>
                <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem', padding: '0.4rem 0.8rem' }} onClick={() => startEdit(i)}>Bearbeiten</button>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => remove(i.id)}>Löschen</button>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
