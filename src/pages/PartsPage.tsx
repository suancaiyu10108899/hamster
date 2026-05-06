import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Part, Location } from '@/types';
import { getLocationPath } from '@/lib/helpers';

export default function PartsPage() {
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configReady, setConfigReady] = useState(true);

  useEffect(() => {
    loadParts();
    loadLocations();
  }, []);

  // Realtime subscription: auto-refresh when anyone adds/edits/deletes a part
  useEffect(() => {
    const channel = supabase
      .channel('parts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts' },
        () => {
          loadParts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadParts() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url || url === '') {
      setConfigReady(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('parts')
      .select('*, category:categories(name), location:locations(code, label, parent_id)')
      .order('name');

    if (err) {
      setError(err.message);
    } else {
      setParts(data || []);
    }
    setLoading(false);
  }

  async function loadLocations() {
    const { data } = await supabase.from('locations').select('*').order('sort_order');
    if (data) setAllLocations(data);
  }

  const filtered = parts.filter((p) => {
    const s = search.toLowerCase();
    if (!s) return true;
    // 跨级搜索：名称、型号、分类、厂家、条码、位置路径
    const locPath = getLocationPath(p.location, allLocations).toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.model_number && p.model_number.toLowerCase().includes(s)) ||
      p.category?.name?.toLowerCase().includes(s) ||
      (p.supplier && p.supplier.toLowerCase().includes(s)) ||
      (p.barcode && p.barcode.includes(s)) ||
      locPath.includes(s)
    );
  });

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>加载中...</div>;
  }

  if (!configReady) {
    return (
      <div className="page">
        <div className="page-header"><h1>📦 零件</h1></div>
        <div className="empty-state">
          <div className="empty-icon">🔌</div>
          <p>尚未配置 Supabase 连接</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>请在 Cloudflare Pages 环境变量中填入<br/>VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="page-header">
        <h1>📦 零件</h1>
        <button className="btn btn-primary" onClick={() => navigate('/parts/new')}>
          ➕ 添加
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索名称、型号、厂家、分类、位置..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div style={{ padding: '8px 16px', color: '#ff6b35', fontSize: 14 }}>{error}</div>}

      {filtered.length === 0 && search && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>没有找到匹配的零件</p>
        </div>
      )}

      <div className="parts-list">
        {filtered.map((part) => (
          <div key={part.id} className={`part-card ${(part.min_quantity != null && part.quantity <= part.min_quantity) ? 'low-stock' : ''}`} onClick={() => navigate(`/parts/${part.id}`)}>
            <div className="part-card-emoji">📌</div>
            <div className="part-card-info">
              <div className="part-card-name">{part.name}</div>
              <div className="part-card-meta">
                {part.model_number && <span>{part.model_number}</span>}
                <span>{part.category?.name || '未分类'}</span>
                <span>{getLocationPath(part.location, allLocations)}</span>
              </div>
            </div>
            <div className="part-card-qty">
              <div className={`qty-num ${(part.min_quantity != null && part.quantity <= part.min_quantity) ? 'low-stock' : ''}`}>
                {part.quantity}
              </div>
              <div className="qty-unit">{part.unit}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}