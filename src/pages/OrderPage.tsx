import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types'
import { getNextMonday } from '../utils/dateUtils'
import OrderForm from '../components/OrderForm'
import MyOrder from '../components/MyOrder'

const STORAGE_KEY = 'bowl_customer'

function getStoredCustomer(): { customerId: string; name: string } | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    const data = JSON.parse(s) as { customerId: string; name: string }
    return data.customerId && data.name ? data : null
  } catch {
    return null
  }
}

function setStoredCustomer(customerId: string, name: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ customerId, name }))
}

export default function OrderPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [stored, setStored] = useState<{ customerId: string; name: string } | null>(() => getStoredCustomer())
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!stored) return
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('customers').select('*').eq('id', stored!.customerId).single()
      if (!cancelled && data) setCustomer(data as Customer)
    }
    load()
    return () => { cancelled = true }
  }, [stored])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Bitte Namen angeben.')
      return
    }
    if (!dob) {
      setError('Bitte Geburtsdatum angeben.')
      return
    }
    const dateStr = dob
    setLoading(true)
    const { data: existing } = await supabase.from('customers').select('id, name, date_of_birth').eq('name', name.trim()).eq('date_of_birth', dateStr).maybeSingle()
    let c: Customer
    if (existing) {
      c = existing as Customer
    } else {
      const { data: inserted, error: insErr } = await supabase.from('customers').insert({ name: name.trim(), date_of_birth: dateStr }).select('id, name, date_of_birth').single()
      if (insErr || !inserted) {
        setError('Fehler beim Anlegen. Bitte erneut versuchen.')
        setLoading(false)
        return
      }
      c = inserted as Customer
    }
    setStoredCustomer(c.id, c.name)
    setStored({ customerId: c.id, name: c.name })
    setCustomer(c)
    setLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setStored(null)
    setCustomer(null)
    setName('')
    setDob('')
  }

  if (stored && customer) {
    return (
      <div className="order-page">
        <p className="muted">Eingeloggt als <strong>{customer.name}</strong></p>
        <button type="button" className="btn btn-secondary no-print" onClick={handleLogout} style={{ marginBottom: '1rem' }}>
          Anderer Nutzer / Abmelden
        </button>
        <OrderForm customerId={customer.id} deliveryDate={getNextMonday()} onSaved={() => {}} />
        <MyOrder customerId={customer.id} deliveryDate={getNextMonday()} />
      </div>
    )
  }

  return (
    <div className="order-page">
      <h1>Bestellung Frühstücksbowl</h1>
      <p className="muted">Gib deinen Namen und dein Geburtsdatum ein, um zu bestellen oder deine Bestellung zu sehen.</p>
      <form onSubmit={handleLogin} className="card">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" autoComplete="name" />
        </div>
        <div className="form-group">
          <label htmlFor="dob">Geburtsdatum</label>
          <input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
        </div>
        {error && <p style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{error}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Wird geladen …' : 'Weiter'}
        </button>
      </form>
    </div>
  )
}
