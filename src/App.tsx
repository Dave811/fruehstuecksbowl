import { lazy, Suspense } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const OrderPage = lazy(() => import('@/pages/OrderPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))

export default function App() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      <header className="print:hidden shrink-0 bg-header text-header-foreground px-4 py-4 sm:px-6 flex items-center justify-between border-b border-border">
        <NavLink to="/" className="font-bold text-lg text-black no-underline">
          Frühstücksbowl
        </NavLink>
        <nav className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                'no-underline ' + (isActive ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground' : 'bg-card text-black hover:bg-accent hover:text-black')
              }
            >
              Bestellen
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                'no-underline ' + (isActive ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground' : 'bg-card text-black hover:bg-accent hover:text-black')
              }
            >
              Admin
            </NavLink>
          </Button>
        </nav>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 max-w-[600px] w-full mx-auto print:max-w-none print:p-0 bg-background">
        <Suspense fallback={<p className="text-muted-foreground">Lade …</p>}>
          <Routes>
            <Route path="/" element={<OrderPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
