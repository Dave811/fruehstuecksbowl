import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import LayersTab from '@/components/admin/LayersTab'
import IngredientsTab from '@/components/admin/IngredientsTab'
import OrdersTab from '@/components/admin/OrdersTab'
import SettingsTab from '@/components/admin/SettingsTab'
import OrderSlipsTab from '@/components/admin/OrderSlipsTab'
import ShoppingListTab from '@/components/admin/ShoppingListTab'

type AdminSection = 'layers' | 'ingredients' | 'orders' | 'settings' | 'slips' | 'shopping'

const ADMIN_STORAGE = 'bowl_admin_ok'

function AdminGate({ children }: { children: React.ReactNode }) {
  const [pw, setPw] = useState('')
  const [ok, setOk] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem(ADMIN_STORAGE) === '1')
  const expected = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === expected) {
      localStorage.setItem(ADMIN_STORAGE, '1')
      setOk(true)
    }
  }

  if (ok) return <>{children}</>
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Admin-Zugang</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-pw">Passwort</Label>
            <Input
              id="admin-pw"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Passwort"
              className="min-h-[48px]"
            />
          </div>
          <Button type="submit" variant="default" className="min-h-[48px]">
            Anmelden
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const sections: { id: AdminSection; label: string }[] = [
  { id: 'layers', label: 'Ebenen' },
  { id: 'ingredients', label: 'Zutaten' },
  { id: 'orders', label: 'Bestellübersicht' },
  { id: 'settings', label: 'Einstellungen' },
  { id: 'slips', label: 'Bestellzettel' },
  { id: 'shopping', label: 'Einkaufsliste' },
]

export default function AdminPage() {
  const [active, setActive] = useState<AdminSection>('orders')

  return (
    <AdminGate>
      <div>
        <h1 className="mt-0 mb-4 text-2xl font-semibold">Admin</h1>
        <NavigationMenu viewport={false} className="print:hidden w-full">
          <NavigationMenuList className="mb-4 grid w-full grid-cols-1 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 [&>*]:min-h-[44px]">
            {sections.map(({ id, label }) => (
              <NavigationMenuItem key={id}>
                <NavigationMenuLink asChild>
                  <button
                    type="button"
                    className={navigationMenuTriggerStyle() + ' min-h-[44px] w-full justify-center data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:hover:bg-primary-hover data-[active=true]:hover:text-primary-foreground data-[active=true]:focus:bg-primary data-[active=true]:focus:text-primary-foreground'}
                    data-active={active === id}
                    onClick={() => setActive(id)}
                  >
                    {label}
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="mt-0">
          {active === 'layers' && <LayersTab />}
          {active === 'ingredients' && <IngredientsTab />}
          {active === 'orders' && <OrdersTab />}
          {active === 'settings' && <SettingsTab />}
          {active === 'slips' && <OrderSlipsTab />}
          {active === 'shopping' && <ShoppingListTab />}
        </div>
      </div>
    </AdminGate>
  )
}
