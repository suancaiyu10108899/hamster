import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PartsPage from './pages/PartsPage';
import PartDetailPage from './pages/PartDetailPage';
import PartFormPage from './pages/PartFormPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import TransactionsPage from './pages/TransactionsPage';
import PurchasesPage from './pages/PurchasesPage';
import BomPage from './pages/BomPage';
import BomCheckoutPage from './pages/BomCheckoutPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/parts" element={<PartsPage />} />
            <Route path="/parts/:id" element={<PartDetailPage />} />
            <Route path="/parts/new" element={<PartFormPage />} />
            <Route path="/parts/:id/edit" element={<PartFormPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/bom" element={<BomPage />} />
            <Route path="/bom/:id/checkout" element={<BomCheckoutPage />} />
          </Routes>
        </main>

        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} end>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">首页</span>
          </NavLink>
          <NavLink to="/parts" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🔩</span>
            <span className="nav-label">零件</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📋</span>
            <span className="nav-label">日志</span>
          </NavLink>
          <NavLink to="/purchases" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">💰</span>
            <span className="nav-label">采购</span>
          </NavLink>
          <NavLink to="/bom" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📦</span>
            <span className="nav-label">BOM</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">设置</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}