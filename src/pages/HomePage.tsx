import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const navigate = useNavigate();
  const [totalParts, setTotalParts] = useState<number>(0);
  const [lowStock, setLowStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 一次性拉所有零件到前端统计
  async function fetchStatsSimple() {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('quantity, min_quantity');

      if (!error && data) {
        setTotalParts(data.length);
        setLowStock(data.filter(p => p.min_quantity !== null && p.quantity < p.min_quantity!).length);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStatsSimple();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>🐹 仓鼠</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/parts')}>
          <div className="stat-num">{loading ? '...' : totalParts}</div>
          <div className="stat-label">零件总数</div>
        </div>
        <div className="stat-card warning" onClick={() => navigate('/parts')}>
          <div className="stat-num">{loading ? '...' : lowStock}</div>
          <div className="stat-label">⚠️ 库存不足</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={() => navigate('/parts/new')}
        >
          ➕ 添加新零件
        </button>
      </div>

      <div style={{ padding: '20px 16px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
        {loading ? '加载中...' : totalParts === 0 ? '还没有零件，点上方按钮添加第一个' : `共 ${totalParts} 个零件`}
      </div>
    </div>
  );
}
