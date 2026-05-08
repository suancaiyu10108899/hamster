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

  // 批量删除状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [filter, page]);

  useEffect(() => {
    // 翻页/筛选时清空选中
    setSelectedIds(new Set());
  }, [filter, page, search]);

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

  function toggleSelect(txId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  }

  async function batchDelete() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `确定要删除 ${selectedIds.size} 条操作记录吗？\n\n⚠️ 此操作不可撤销，删除后零件库存数量将恢复为删除前状态。\n建议使用「报废」类型来记录正常淘汰。`
    );
    if (!confirmed) return;

    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error: err } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);

      if (err) {
        alert('删除失败：' + err.message);
      } else {
        setSelectedIds(new Set());
        loadTransactions();
      }
    } catch (e: any) {
      alert('删除失败：' + e.message);
    } finally {
      setBatchDeleting(false);
    }
  }

  const hasSelection = selectedIds.size > 0;

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

      {/* 全选/批量操作栏 */}
      {filtered.length > 0 && (
        <div style={{
          margin: '0 16px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          color: '#666',
          flexWrap: 'wrap',
        }}>
          <label style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
            />
            {selectedIds.size === filtered.length ? '取消全选' : '全选当前列表'}
          </label>
          <span>({filtered.length} 条)</span>
          {hasSelection && (
            <>
              <span style={{ fontWeight: 600, color: '#f44336' }}>
                ✅ 已选 {selectedIds.size} 条
              </span>
              <button
                onClick={batchDelete}
                disabled={batchDeleting}
                style={{
                  padding: '4px 14px',
                  borderRadius: 6,
                  background: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                  opacity: batchDeleting ? 0.6 : 1,
                }}
              >
                {batchDeleting ? '删除中...' : `🗑️ 批量删除 (${selectedIds.size})`}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: '#f5f5f5',
                  color: '#666',
                  border: '1px solid #ddd',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                取消选择
              </button>
            </>
          )}
        </div>
      )}

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
                    border: selectedIds.has(tx.id) ? '2px solid #f44336' : '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* 复选框 */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    style={{ width: 17, height: 17, cursor: 'pointer', flexShrink: 0 }}
                  />
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