import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Part, Location } from '@/types';
import { getLocationPath, getTopLevelLocation } from '@/lib/helpers';

function getOperator(): string {
  return localStorage.getItem('hamster_operator') || '';
}

function setOperator(val: string) {
  localStorage.setItem('hamster_operator', val);
}

export default function HomePage() {
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNickname, setShowNickname] = useState(false);
  const [nickname, setNickname] = useState(getOperator());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: partData }, { data: locData }] = await Promise.all([
      supabase
        .from('parts')
        .select('*, location:locations(code, label, parent_id)')
        .order('name'),
      supabase.from('locations').select('*').order('sort_order'),
    ]);
    if (partData) setParts(partData);
    if (locData) setAllLocations(locData);
    setLoading(false);
  }

  function saveNickname() {
    setOperator(nickname.trim());
    setShowNickname(false);
  }

  const totalParts = parts.length;
  const lowStockParts = parts.filter(
    (p) => p.min_quantity != null && p.quantity <= p.min_quantity
  );
  const lowStockCount = lowStockParts.length;

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
          <div className="stat-num">{loading ? '...' : lowStockCount}</div>
          <div className="stat-label">⚠️ 库存不足</div>
        </div>
      </div>

      <details className="help-card" open>
        <summary className="help-card-summary">📖 快速上手</summary>
        <div className="help-card-body">
          <div className="help-row">🔍 查找零件 → 底部「零件」搜索</div>
          <div className="help-row">📥 入库补货 → 点零件 → 点绿色入库</div>
          <div className="help-row">📤 取用出库 → 点零件 → 点红色出库</div>
          <div className="help-row">📋 批量出库 → 底部「BOM」→ 粘贴清单</div>
          <div className="help-row">🛒 查看采购 → 底部「采购」</div>
          <div className="help-row">⚙️ 管理位置分类 → 底部「设置」</div>
        </div>
      </details>

      {/* 按仓库统计 */}
      {!loading && (() => {
        const topLevelLocs = allLocations.filter((l) => !l.parent_id);
        if (topLevelLocs.length === 0) return null;
        const warehouseStats: { loc: Location; total: number; lowStock: number }[] = [];
        for (const topLoc of topLevelLocs) {
          let total = 0;
          let lowStock = 0;
          for (const p of parts) {
            const ptl = getTopLevelLocation(p.location, allLocations);
            if (ptl && ptl.id === topLoc.id) {
              total++;
              if (p.min_quantity != null && p.quantity <= p.min_quantity) lowStock++;
            }
          }
          warehouseStats.push({ loc: topLoc, total, lowStock });
        }
        if (warehouseStats.length === 0) return null;
        return (
          <div className="stats-grid" style={{ marginTop: 0, marginBottom: 12 }}>
            {warehouseStats.map((ws) => (
              <div
                key={ws.loc.id}
                className={`stat-card ${ws.lowStock > 0 ? 'warning' : ''}`}
                onClick={() => navigate(`/parts?warehouse=${ws.loc.id}`)}
              >
                <div className="stat-num" style={{ fontSize: 18 }}>🏢 {ws.loc.label || ws.loc.code}</div>
                <div className="stat-label">
                  共 {ws.total} 个零件{ws.lowStock > 0 ? ` · ⚠️ ${ws.lowStock} 不足` : ''}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 低库存预警列表 */}
      {!loading && lowStockParts.length > 0 && (
        <div className="alert-section">
          <div className="alert-header">⚠️ 库存预警 — 以下零件请及时补充</div>
          <div className="alert-list">
            {lowStockParts.map((p) => (
              <div
                key={p.id}
                className="alert-item"
                onClick={() => navigate(`/parts/${p.id}`)}
              >
                <div className="alert-item-info">
                  <span className="alert-item-name">{p.name}</span>
                  <span className="alert-item-location">{getLocationPath(p.location, allLocations)}</span>
                  {p.model_number && (
                    <span className="alert-item-model">{p.model_number}</span>
                  )}
                </div>
                <div className="alert-item-qty">
                  仅剩 <strong>{p.quantity}</strong> / 最低 {p.min_quantity}
                </div>
                <div className="alert-item-arrow">›</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/import')}>
            📥 批量导入
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/purchases')}>
            💰 采购记录
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/transactions')}>
            📋 操作日志
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
            ⚙️ 设置
          </button>
        </div>
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