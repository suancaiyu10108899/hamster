import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<(Transaction & { part_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'scrap'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => {
    loadTransactions();
  }, [filter, page]);

  async function loadTransactions() {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*, part:parts(name)')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter !== 'all') {
      query = query.eq('type', filter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTransactions(
        data.map((t: any) => ({
          ...t,
          part_name: t.part?.name || '(已删除)',
        }))
      );
    }
    setLoading(false);
  }

  const filtered = search
    ? transactions.filter(
        (t) =>
          t.part_name?.toLowerCase().includes(search.toLowerCase()) ||
          t.operator.toLowerCase().includes(search.toLowerCase()) ||
          t.remark?.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const typeLabel = (type: string) => {
    switch (type) {
      case 'in': return { text: '入库', color: '#4caf50', bg: '#e8f5e9' };
      case 'out': return { text: '出库', color: '#f44336', bg: '#ffebee' };
      case 'scrap': return { text: '报废', color: '#9e9e9e', bg: '#f5f5f5' };
      case 'adjust': return { text: '调整', color: '#ff9800', bg: '#fff3e0' };
      default: return { text: type, color: '#888', bg: '#fafafa' };
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 操作日志</h1>
      </div>

      {/* 筛选栏 */}
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['all', 'in', 'out', 'scrap'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              border: '1px solid #ddd',
              background: filter === f ? '#4caf50' : '#fff',
              color: filter === f ? '#fff' : '#666',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? '全部' : f === 'in' ? '入库' : f === 'out' ? '出库' : '报废'}
          </button>
        ))}
        <input
          type="text"
          placeholder="搜索零件名/操作人/备注..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 120,
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid #ddd',
            fontSize: 13,
          }}
        />
      </div>

      {/* 列表 */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: 32 }}>加载中...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>暂无操作记录</p>
          </div>
        ) : (
          <>
            {filtered.map((tx) => {
              const tl = typeLabel(tx.type);
              return (
                <div
                  key={tx.id}
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: tl.bg,
                      color: tl.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tl.text}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.part_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {tx.operator} · {tx.quantity} 个
                      {tx.remark ? ` · ${tx.remark}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: '#ccc', whiteSpace: 'nowrap' }}>
                    {new Date(tx.created_at).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}

            {/* 分页 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← 上一页
              </button>
              <span style={{ fontSize: 13, color: '#999', lineHeight: '36px' }}>第 {page + 1} 页</span>
              <button
                className="btn btn-secondary"
                disabled={filtered.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页 →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}