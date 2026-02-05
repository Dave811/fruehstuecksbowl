import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types'
import { getNextMonday } from '@/utils/dateUtils'
import OrderForm from '@/components/OrderForm'
import MyOrder from '@/components/MyOrder'
import DatePicker from '@/components/DatePicker'
import { DatePickerBirth } from '@/components/DatePickerBirth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const [deliveryDate, setDeliveryDate] = useState(getNextMonday())
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
      <div>
        <p className="text-muted-foreground text-sm mb-2">Eingeloggt als <strong className="text-foreground">{customer.name}</strong></p>
        <Button type="button" variant="outline" className="print:hidden mb-4 min-h-[48px]" onClick={handleLogout}>
          Anderer Nutzer / Abmelden
        </Button>
        <div className="print:hidden mb-4 space-y-2">
          <Label>Lieferdatum</Label>
          <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Datum wählen" />
        </div>
        <OrderForm customerId={customer.id} deliveryDate={deliveryDate} onSaved={() => {}} />
        <MyOrder customerId={customer.id} deliveryDate={deliveryDate} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mt-0 mb-4 text-2xl font-semibold">Bestellung Frühstücksbowl</h1>
      <p className="text-muted-foreground text-sm mb-4">Gib deinen Namen und dein Geburtsdatum ein, um zu bestellen oder deine Bestellung zu sehen.</p>
      <Card className="mb-4">
        <form onSubmit={handleLogin}>
          <CardHeader className="pb-4">
            <CardTitle className="sr-only">Anmelden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dein Name"
                autoComplete="name"
                className="min-h-[48px]"
              />
            </div>
            <DatePickerBirth id="dob" value={dob} onChange={setDob} placeholder="Geburtsdatum wählen" />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="min-h-[48px] w-full sm:w-auto" disabled={loading}>
              {loading ? 'Wird geladen …' : 'Weiter'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
