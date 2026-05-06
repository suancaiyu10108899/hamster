import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PartsPage from './pages/PartsPage';
import PartDetailPage from './pages/PartDetailPage';
import PartFormPage from './pages/PartFormPage';

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
          <a href="/parts/new" className="nav-item">
            <span className="nav-icon">➕</span>
            <span className="nav-label">新增</span>
          </a>
        </nav>
      </div>
    </BrowserRouter>
  );
}