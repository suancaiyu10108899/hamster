import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PartsPage from './pages/PartsPage';
import PartDetailPage from './pages/PartDetailPage';
import PartFormPage from './pages/PartFormPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import TransactionsPage from './pages/TransactionsPage';
import PurchasesPage from './pages/PurchasesPage';

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
          </Routes>
        </main>

        <nav className="bottom-nav">
          <a href="/" className="nav-item">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">首页</span>
          </a>
          <a href="/parts" className="nav-item">
            <span className="nav-icon">🔩</span>
            <span className="nav-label">零件</span>
          </a>
          <a href="/transactions" className="nav-item">
            <span className="nav-icon">📋</span>
            <span className="nav-label">日志</span>
          </a>
          <a href="/purchases" className="nav-item">
            <span className="nav-icon">💰</span>
            <span className="nav-label">采购</span>
          </a>
          <a href="/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">设置</span>
          </a>
        </nav>
      </div>
    </BrowserRouter>
  );
}