import { Routes, Route, NavLink } from 'react-router-dom'
import OrderPage from './pages/OrderPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="logo">Frühstücksbowl</NavLink>
        <nav>
          <NavLink to="/" end>Bestellen</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}
