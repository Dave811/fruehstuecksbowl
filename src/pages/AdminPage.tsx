import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LayersTab from '@/components/admin/LayersTab'
import IngredientsTab from '@/components/admin/IngredientsTab'
import OrdersTab from '@/components/admin/OrdersTab'
import SettingsTab from '@/components/admin/SettingsTab'
import OrderSlipsTab from '@/components/admin/OrderSlipsTab'
import ShoppingListTab from '@/components/admin/ShoppingListTab'

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
          <Button type="submit" className="min-h-[48px]">Anmelden</Button>
        </form>
      </CardContent>
    </Card>
  )
}

const adminTabTriggerClass =
  'min-h-[44px] data-[state=active]:bg-card data-[state=active]:text-card-foreground data-[state=active]:shadow-sm'

export default function AdminPage() {
  return (
    <AdminGate>
      <div>
        <h1 className="mt-0 mb-4 text-2xl font-semibold">Admin</h1>
        <Tabs defaultValue="orders" className="print:hidden">
          <TabsList className="flex flex-nowrap h-auto gap-2 mb-4 p-1 bg-muted overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:[display:none] [&>*]:shrink-0">
            <TabsTrigger value="layers" className={adminTabTriggerClass}>Ebenen</TabsTrigger>
            <TabsTrigger value="ingredients" className={adminTabTriggerClass}>Zutaten</TabsTrigger>
            <TabsTrigger value="orders" className={adminTabTriggerClass}>Bestellübersicht</TabsTrigger>
            <TabsTrigger value="settings" className={adminTabTriggerClass}>Einstellungen</TabsTrigger>
            <TabsTrigger value="slips" className={adminTabTriggerClass}>Bestellzettel</TabsTrigger>
            <TabsTrigger value="shopping" className={adminTabTriggerClass}>Einkaufsliste</TabsTrigger>
          </TabsList>
          <TabsContent value="layers" className="mt-0"><LayersTab /></TabsContent>
          <TabsContent value="ingredients" className="mt-0"><IngredientsTab /></TabsContent>
          <TabsContent value="orders" className="mt-0"><OrdersTab /></TabsContent>
          <TabsContent value="settings" className="mt-0"><SettingsTab /></TabsContent>
          <TabsContent value="slips" className="mt-0"><OrderSlipsTab /></TabsContent>
          <TabsContent value="shopping" className="mt-0"><ShoppingListTab /></TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  )
}
