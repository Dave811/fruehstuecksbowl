import { Routes, Route, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import OrderPage from '@/pages/OrderPage'
import AdminPage from '@/pages/AdminPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="print:hidden bg-card px-4 py-4 sm:px-6 flex items-center justify-between border-b border-border">
        <NavLink to="/" className="font-bold text-lg text-foreground no-underline">
          Frühstücksbowl
        </NavLink>
        <nav className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'bg-accent text-accent-foreground' : '') + ' no-underline'}>
              Bestellen
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'bg-accent text-accent-foreground' : '') + ' no-underline'}>
              Admin
            </NavLink>
          </Button>
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-[600px] w-full mx-auto print:max-w-none print:p-0 bg-background">
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
