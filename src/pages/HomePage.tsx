import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

function getOperator(): string {
  return localStorage.getItem('hamster_operator') || '';
}

export default function HomePage() {
  const navigate = useNavigate();
  const [totalParts, setTotalParts] = useState<number>(0);
  const [lowStock, setLowStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showNickname, setShowNickname] = useState(false);
  const [nickname, setNickname] = useState(getOperator());

  const fetchStatsSimple = useCallback(async () => {
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
  }, []);

  function saveNickname() {
    if (nickname.trim()) {
      localStorage.setItem('hamster_operator', nickname.trim());
      setShowNickname(false);
    }
  }

  useEffect(() => {
    fetchStatsSimple();
  }, [fetchStatsSimple]);

  // Realtime subscription: auto-refresh stats when parts change
  useEffect(() => {
    const channel = supabase
      .channel('homepage-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts' },
        () => {
          fetchStatsSimple();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatsSimple]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>🐹 仓鼠</h1>
        <div
          className="operator-badge"
          onClick={() => { setNickname(getOperator()); setShowNickname(true); }}
          title="点击设置昵称"
        >
          {getOperator() ? (getOperator().length > 3 ? getOperator().slice(0, 3) + '…' : getOperator()) : '👤 我'}
        </div>
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

      {/* Nickname panel */}
      {showNickname && (
        <div className="panel" onClick={(e) => e.target === e.currentTarget && setShowNickname(false)}>
          <div className="panel-title">👤 设置昵称</div>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            出入库记录会带上你的昵称，方便区分是谁操作的
          </p>
          <div className="form-group">
            <input
              className="form-input"
              type="text"
              placeholder="例如：老张 / 小李"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
            />
          </div>
          <div className="panel-actions">
            <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setShowNickname(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveNickname}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}
