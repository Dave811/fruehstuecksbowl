import { useState } from 'react'

const ADMIN_STORAGE = 'bowl_admin_ok'

function AdminGate({ children }: { children: React.ReactNode }) {
  const [pw, setPw] = useState('')
  const [ok, setOk] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem(ADMIN_STORAGE) === '1')
  const expected = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123'
  console.log('[AdminGate] VITE_ADMIN_PASSWORD from env:', import.meta.env.VITE_ADMIN_PASSWORD, '→ expected:', expected)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === expected) {
      localStorage.setItem(ADMIN_STORAGE, '1')
      setOk(true)
    }
  }

  if (ok) return <>{children}</>
  return (
    <div className="card">
      <h2>Admin-Zugang</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="admin-pw">Passwort</label>
          <input id="admin-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Passwort" />
        </div>
        <button type="submit" className="btn">Anmelden</button>
      </form>
    </div>
  )
}

import LayersTab from '../components/admin/LayersTab'
import IngredientsTab from '../components/admin/IngredientsTab'
import OrdersTab from '../components/admin/OrdersTab'
import SettingsTab from '../components/admin/SettingsTab'
import OrderSlipsTab from '../components/admin/OrderSlipsTab'
import ShoppingListTab from '../components/admin/ShoppingListTab'

export default function AdminPage() {
  const [tab, setTab] = useState('orders')

  return (
    <AdminGate>
      <div className="admin-page">
        <h1>Admin</h1>
        <div className="tabs no-print">
          <button type="button" className={tab === 'layers' ? 'active' : ''} onClick={() => setTab('layers')}>Ebenen</button>
          <button type="button" className={tab === 'ingredients' ? 'active' : ''} onClick={() => setTab('ingredients')}>Zutaten</button>
          <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Bestellübersicht</button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Einstellungen</button>
          <button type="button" className={tab === 'slips' ? 'active' : ''} onClick={() => setTab('slips')}>Bestellzettel</button>
          <button type="button" className={tab === 'shopping' ? 'active' : ''} onClick={() => setTab('shopping')}>Einkaufsliste</button>
        </div>
        {tab === 'layers' && <LayersTab />}
        {tab === 'ingredients' && <IngredientsTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'slips' && <OrderSlipsTab />}
        {tab === 'shopping' && <ShoppingListTab />}
      </div>
    </AdminGate>
  )
}
