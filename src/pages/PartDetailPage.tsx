import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Part, Transaction } from '@/types';

function getOperator(): string {
  return localStorage.getItem('hamster_operator') || '我';
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [part, setPart] = useState<Part | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState<'in' | 'out' | 'scrap' | null>(null);
  const [txQty, setTxQty] = useState(1);
  const [txRemark, setTxRemark] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id) return;
    loadPart();
  }, [id]);

  // Realtime subscription: auto-refresh transactions when anyone adds one
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`part-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `part_id=eq.${id}` },
        () => {
          loadPart();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parts', filter: `id=eq.${id}` },
        () => {
          loadPart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function loadPart() {
    setLoading(true);
    const { data: partData } = await supabase
      .from('parts')
      .select('*, category:categories(name), location:locations(code, label)')
      .eq('id', id)
      .single();

    if (partData) setPart(partData);

    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('part_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txData) setTransactions(txData);
    setLoading(false);
  }

  async function doTransaction(type: 'in' | 'out' | 'scrap') {
    if (!part || txQty <= 0) return;

    const newQty = type === 'in' ? part.quantity + txQty : part.quantity - txQty;
    if (newQty < 0) {
      setToast('库存不足，无法' + (type === 'scrap' ? '报废' : '出库'));
      setTimeout(() => setToast(''), 2000);
      return;
    }

    // 更新库存
    const { error: updateErr } = await supabase
      .from('parts')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', part.id);

    if (updateErr) {
      setToast('更新失败: ' + updateErr.message);
      setTimeout(() => setToast(''), 2000);
      return;
    }

    // 记录流水
    await supabase.from('transactions').insert({
      part_id: part.id,
      type,
      quantity: txQty,
      operator: getOperator(),
      remark: txRemark || null,
    });

    setToast(type === 'in' ? `✅ 入库 +${txQty}` : type === 'out' ? `📤 出库 -${txQty}` : `🗑️ 报废 -${txQty}`);
    setTimeout(() => setToast(''), 2000);
    setShowPanel(null);
    setTxQty(1);
    setTxRemark('');
    loadPart();
  }

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>加载中...</div>;
  }

  if (!part) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <p>零件不存在</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/parts')}>返回列表</button>
        </div>
      </div>
    );
  }

  const lowStock = part.min_quantity != null && part.quantity <= part.min_quantity;

  return (
    <div className="page" style={{ padding: 0 }}>
      {toast && <div className="toast">{toast}</div>}

      {/* 顶部导航 */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>{part.name}</h1>
        <button className="btn" style={{ padding: '4px 8px', fontSize: 14 }} onClick={() => navigate(`/parts/${part.id}/edit`)}>
          ✏️
        </button>
      </div>

      {/* 库存概览 */}
      <div className="detail-card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, fontWeight: 700, color: lowStock ? '#ff6b35' : '#333' }}>
          {part.quantity}
        </h2>
        <p style={{ color: '#999', fontSize: 14 }}>{part.unit}</p>
        {lowStock && <p style={{ color: '#ff6b35', fontSize: 13, marginTop: 4 }}>⚠️ 低于最低库存 ({part.min_quantity})</p>}
      </div>

      {/* 出入库按钮 */}
      <div className="action-bar" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-success" onClick={() => setShowPanel('in')}>📥 入库</button>
        <button className="btn btn-danger" onClick={() => setShowPanel('out')}>📤 出库</button>
        <button className="btn" style={{ background: '#999', color: '#fff', minWidth: 'calc(33% - 8px)' }} onClick={() => setShowPanel('scrap')}>🗑️ 报废</button>
      </div>

      {/* 详细信息 */}
      <div className="detail-card">
        <div className="detail-row" style={{ display: 'block', textAlign: 'left', fontSize: '15px' }}>
          <span style={{ color: '#888', fontSize: '13px', display: 'block' }}>分类</span>
          <span style={{ fontWeight: 600 }}>{part.category?.name || '未分类'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">存放位置</span>
          <span className="detail-value">{part.location?.code || '未定位'} {part.location?.label || ''}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">最低库存</span>
          <span className="detail-value">{part.min_quantity ?? '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">单位</span>
          <span className="detail-value">{part.unit}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">厂家</span>
          <span className="detail-value">{part.supplier || '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">条码</span>
          <span className="detail-value">{part.barcode || '-'}</span>
        </div>
        {part.remark && (
          <div className="detail-row" style={{ display: 'block' }}>
            <span className="detail-label">备注</span>
            <p style={{ marginTop: 4, fontSize: 14 }}>{part.remark}</p>
          </div>
        )}
      </div>

      {/* 最近流水 */}
      {transactions.length > 0 && (
        <div className="detail-card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>📋 最近记录</h3>
          {transactions.map((tx) => (
            <div key={tx.id} className="detail-row" style={{ fontSize: 14 }}>
              <span>
                {tx.type === 'in' ? '📥' : tx.type === 'out' ? '📤' : '🔄'} {tx.type === 'in' ? '入库' : tx.type === 'out' ? '出库' : tx.type}
              </span>
              <span style={{ fontWeight: 600, color: tx.type === 'in' ? '#4caf50' : '#ff6b35' }}>
                {tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''}{tx.quantity}
              </span>
              <span style={{ color: '#999', fontSize: 12 }}>
                {new Date(tx.created_at).toLocaleDateString('zh-CN')}
              </span>
              <span style={{ color: '#bbb', fontSize: 11 }}>{tx.operator}</span>
            </div>
          ))}
        </div>
      )}

      {/* 出入库面板 */}
      {showPanel && (
        <div className="panel" onClick={(e) => e.target === e.currentTarget && setShowPanel(null)}>
          <div className="panel-title">
            {showPanel === 'in' ? '📥 入库' : showPanel === 'out' ? '📤 出库' : '🗑️ 报废'}
          </div>
          <div className="form-group">
            <label className="form-label">数量</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={txQty}
              onChange={(e) => setTxQty(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">备注（可选）</label>
            <input
              className="form-input"
              type="text"
              placeholder="如：备赛消耗、补充..."
              value={txRemark}
              onChange={(e) => setTxRemark(e.target.value)}
            />
          </div>
          <div className="panel-actions">
            <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={() => setShowPanel(null)}>取消</button>
            <button
              className={`btn ${showPanel === 'in' ? 'btn-success' : showPanel === 'out' ? 'btn-danger' : ''}`}
              style={showPanel === 'scrap' ? { background: '#999', color: '#fff' } : undefined}
              onClick={() => doTransaction(showPanel)}
            >
              确认{showPanel === 'in' ? '入库' : showPanel === 'out' ? '出库' : '报废'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}