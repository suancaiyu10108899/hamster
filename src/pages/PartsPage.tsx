import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Part, Location } from '@/types';
import { getLocationPath, getTopLevelLocation, exportPartsCSV } from '@/lib/helpers';

export default function PartsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [parts, setParts] = useState<Part[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState(searchParams.get('warehouse') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configReady, setConfigReady] = useState(true);

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTargetLocationId, setBatchTargetLocationId] = useState('');
  const [batchMoving, setBatchMoving] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchOutQty, setBatchOutQty] = useState(1);
  const [batchOuting, setBatchOuting] = useState(false);
  const [batchScrapping, setBatchScrapping] = useState(false);

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

  // 顶层仓库列表（用于下拉筛选）
  const topLevelLocations = allLocations.filter((l) => !l.parent_id);

  // 按顶级仓库筛选零件（搜索范围覆盖该仓库下所有子位置）
  const filtered = parts.filter((p) => {
    // 仓库筛选
    if (warehouseFilter) {
      const topLoc = getTopLevelLocation(p.location, allLocations);
      if (!topLoc || topLoc.id !== warehouseFilter) return false;
    }
    // 搜索筛选
    const s = search.toLowerCase();
    if (!s) return true;
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

  // 切换单个零件选中状态
  function toggleSelect(partId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }

  // 全选 / 取消全选
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  // 批量移动零件
  async function batchMove() {
    if (!batchTargetLocationId || selectedIds.size === 0) return;
    setBatchMoving(true);
    try {
      const ids = Array.from(selectedIds);
      const { error: err } = await supabase
        .from('parts')
        .update({ location_id: batchTargetLocationId })
        .in('id', ids);

      if (err) {
        alert('移动失败：' + err.message);
      } else {
        setSelectedIds(new Set());
        setBatchTargetLocationId('');
        loadParts();
      }
    } catch (e: any) {
      alert('移动失败：' + e.message);
    } finally {
      setBatchMoving(false);
    }
  }

  // 批量删除零件
  async function batchDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = window.confirm(`确定要删除 ${count} 个零件吗？\n\n此操作不可撤销，将同时删除以下关联数据：\n• 操作日志 (transactions)\n• 自定义字段 (custom_fields)\n• BOM 明细 (bom_items)\n• 采购明细 (purchase_items)\n• 替代组成员 (part_group_members)`);
    if (!confirmed) return;

    setBatchDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error: err } = await supabase
        .from('parts')
        .delete()
        .in('id', ids);

      if (err) {
        alert('删除失败：' + err.message);
      } else {
        setSelectedIds(new Set());
        setBatchTargetLocationId('');
        loadParts();
      }
    } catch (e: any) {
      alert('删除失败：' + e.message);
    } finally {
      setBatchDeleting(false);
    }
  }

  function getOperator(): string {
    return localStorage.getItem('hamster_operator') || '我';
  }

  // 批量报废：选中零件库存归零 + 写入 scrap 记录
  async function batchScrap() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = window.confirm(
      `确定要报废 ${count} 个零件的全部库存吗？\n\n此操作不可撤销，将把每个选中零件的库存归零并记录报废。`
    );
    if (!confirmed) return;

    setBatchScrapping(true);
    const selectedParts = parts.filter((p) => selectedIds.has(p.id));
    const now = new Date().toISOString();
    const operator = getOperator();
    const txRows: { part_id: string; type: string; quantity: number; operator: string; remark: string }[] = [];
    const skipped: string[] = [];

    for (const p of selectedParts) {
      if (p.quantity <= 0) {
        skipped.push(p.name);
        continue;
      }
      txRows.push({
        part_id: p.id,
        type: 'scrap',
        quantity: p.quantity,
        operator,
        remark: '批量报废',
      });
    }

    try {
      // 批量归零库存
      const ids = Array.from(selectedIds);
      await supabase.from('parts').update({ quantity: 0, updated_at: now }).in('id', ids);

      // 批量写交易记录
      if (txRows.length > 0) {
        await supabase.from('transactions').insert(txRows);
      }
    } catch (e: any) {
      alert('报废失败：' + e.message);
      return;
    } finally {
      setBatchScrapping(false);
    }

    let msg = `✅ 已报废 ${txRows.length} 个零件的库存（共 ${txRows.reduce((s, t) => s + t.quantity, 0)} 个单位）`;
    if (skipped.length > 0) {
      msg += `\n\n⚠️ 以下零件库存为 0，已跳过：\n${skipped.join('、')}`;
    }
    alert(msg);
    setSelectedIds(new Set());
    setBatchTargetLocationId('');
    loadParts();
  }

  // 批量出库：选中零件统一扣减数量 + 写 out 记录
  async function batchCheckout() {
    if (selectedIds.size === 0 || batchOutQty <= 0) return;
    const qty = batchOutQty;
    const confirmed = window.confirm(
      `确定对 ${selectedIds.size} 个零件各出库 ${qty} 个单位吗？\n\n库存不足的零件将被跳过。`
    );
    if (!confirmed) return;

    setBatchOuting(true);
    const selectedParts = parts.filter((p) => selectedIds.has(p.id));
    const now = new Date().toISOString();
    const operator = getOperator();
    const txRows: { part_id: string; type: string; quantity: number; operator: string; remark: string }[] = [];
    const updates: { id: string; newQty: number }[] = [];
    const skipped: string[] = [];

    for (const p of selectedParts) {
      if (p.quantity < qty) {
        skipped.push(`${p.name}（库存${p.quantity}）`);
        continue;
      }
      updates.push({ id: p.id, newQty: p.quantity - qty });
      txRows.push({
        part_id: p.id,
        type: 'out',
        quantity: qty,
        operator,
        remark: `批量出库 ×${qty}`,
      });
    }

    try {
      // 逐个更新库存（Supabase 不支持批量不同值 update）
      for (const u of updates) {
        await supabase.from('parts').update({ quantity: u.newQty, updated_at: now }).eq('id', u.id);
      }

      // 批量写交易记录
      if (txRows.length > 0) {
        await supabase.from('transactions').insert(txRows);
      }
    } catch (e: any) {
      alert('出库失败：' + e.message);
      return;
    } finally {
      setBatchOuting(false);
    }

    let msg = `✅ 已对 ${updates.length} 个零件各出库 ${qty} 个单位`;
    if (skipped.length > 0) {
      msg += `\n\n⚠️ 以下零件库存不足，已跳过：\n${skipped.join('\n')}`;
    }
    alert(msg);
    setSelectedIds(new Set());
    setBatchTargetLocationId('');
    setBatchOutQty(1);
    loadParts();
  }

  // 递归构建位置缩进选项
  function buildLocationOptions(locs: Location[], parentId: string | null = null, depth: number = 0): JSX.Element[] {
    const children = locs.filter((l) => l.parent_id === parentId);
    const result: JSX.Element[] = [];
    for (const loc of children) {
      const prefix = depth > 0 ? '│　'.repeat(depth - 1) + (depth === 1 ? '├─ ' : '├─ ') : '';
      result.push(
        <option key={loc.id} value={loc.id}>
          {prefix}{loc.label || loc.code}
        </option>
      );
      result.push(...buildLocationOptions(locs, loc.id, depth + 1));
    }
    return result;
  }

  const locationTreeOptions = useMemo(() => buildLocationOptions(allLocations), [allLocations]);

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

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="page-header">
        <h1>📦 零件</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            onClick={() => navigate('/import')}
            style={{ background: '#e3f2fd', color: '#1565c0', border: '1px solid #bbdefb' }}
            title="批量导入（管理员）"
          >
            📥 批量导入
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => exportPartsCSV(filtered, allLocations)}
            title="导出为 CSV（包含筛选结果）"
          >
            📤 导出
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/parts/new')}>
            ➕ 添加
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索名称、型号、厂家、分类、位置..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {topLevelLocations.length > 0 && (
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            style={{ marginTop: 8 }}
          >
            <option value="">🏢 全部仓库</option>
            {topLevelLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                🏢 {loc.label || loc.code}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div style={{ padding: '8px 16px', color: '#ff6b35', fontSize: 14 }}>{error}</div>}

      {/* 仓库标题栏：筛选某个仓库后显示醒目标识 */}
      {warehouseFilter && (() => {
        const currentWarehouse = topLevelLocations.find((l) => l.id === warehouseFilter);
        if (!currentWarehouse) return null;
        return (
          <div style={{
            margin: '0 16px 8px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 10,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>🏢 正在浏览：{currentWarehouse.label || currentWarehouse.code}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>共 {filtered.length} 个零件</div>
            </div>
            <button
              onClick={() => setWarehouseFilter('')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕ 清除筛选
            </button>
          </div>
        );
      })()}

      {/* 批量操作栏 */}
      {hasSelection && (
        <div style={{
          margin: '0 16px 8px',
          padding: '10px 14px',
          background: '#f0f4ff',
          border: '1px solid #c3d5ff',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
            ✅ 已选 {selectedIds.size} 个零件
          </span>
          <span style={{ fontSize: 11, color: '#999' }}>⚠️ 管理功能</span>
          <select
            value={batchTargetLocationId}
            onChange={(e) => setBatchTargetLocationId(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          >
            <option value="">选择目标仓库/位置...</option>
            {locationTreeOptions}
          </select>
          <button
            className="btn btn-primary"
            disabled={!batchTargetLocationId || batchMoving}
            onClick={batchMove}
            style={{ fontSize: 13, padding: '6px 14px' }}
          >
            {batchMoving ? '移动中...' : '📦 批量移动'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { setSelectedIds(new Set()); setBatchTargetLocationId(''); }}
            style={{ fontSize: 13, padding: '6px 14px' }}
          >
            取消选择
          </button>
          {/* 批量出库：数量输入 + 按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 6, padding: '2px 6px', border: '1px solid #ddd' }}>
            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>出库数量</span>
            <input
              type="number"
              min={1}
              value={batchOutQty}
              onChange={(e) => setBatchOutQty(parseInt(e.target.value) || 1)}
              style={{ width: 52, padding: '4px 4px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
            />
            <button
              onClick={batchCheckout}
              disabled={batchOuting || batchOutQty <= 0}
              style={{
                fontSize: 13,
                padding: '6px 12px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                opacity: (batchOuting || batchOutQty <= 0) ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {batchOuting ? '出库中...' : `📤 批量出库 (${selectedIds.size})`}
            </button>
          </div>
          <button
            onClick={batchScrap}
            disabled={batchScrapping}
            style={{
              fontSize: 13,
              padding: '6px 14px',
              background: '#9e9e9e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              opacity: batchScrapping ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {batchScrapping ? '报废中...' : `🗑️ 批量报废 (${selectedIds.size})`}
          </button>
          <button
            className="btn btn-danger"
            disabled={batchDeleting}
            onClick={batchDelete}
            style={{ fontSize: 13, padding: '6px 14px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            {batchDeleting ? '删除中...' : `💥 删除 (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* 全选/取消全选栏 */}
      {filtered.length > 0 && (
        <div style={{
          margin: '0 16px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#666',
        }}>
          <label style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
            />
            {selectedIds.size === filtered.length ? '取消全选' : '全选当前列表'}
          </label>
          <span>({filtered.length} 个)</span>
        </div>
      )}

      {filtered.length === 0 && search && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>没有找到匹配的零件</p>
        </div>
      )}

      <div className="parts-list">
        {filtered.map((part) => (
          <div
            key={part.id}
            className={`part-card ${(part.min_quantity != null && part.quantity <= part.min_quantity) ? 'low-stock' : ''}`}
            style={{ position: 'relative' }}
          >
            {/* 复选框 */}
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(part.id)}
                onChange={() => toggleSelect(part.id)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            {/* 可点击区域 */}
            <div
              onClick={() => navigate(`/parts/${part.id}`)}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                paddingLeft: 36,
                cursor: 'pointer',
              }}
            >
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
          </div>
        ))}
      </div>
    </div>
  );
}