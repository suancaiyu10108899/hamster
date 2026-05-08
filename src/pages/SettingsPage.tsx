import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Location } from '../types';
import { getLocationPath } from '../lib/helpers';

function getOperator(): string {
  return localStorage.getItem('hamster_operator') || '我';
}

export default function SettingsPage() {
  const [tab, setTab] = useState<'categories' | 'locations'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [clearingAll, setClearingAll] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    if (tab === 'categories') {
      const { data } = await supabase.from('categories').select('*').order('sort_order');
      if (data) setCategories(data);
    } else {
      const { data } = await supabase.from('locations').select('*').order('sort_order');
      if (data) setLocations(data);
    }
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormLabel('');
    setFormParentId(null);
  }

  function editCategory(cat: Category) {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormParentId(cat.parent_id);
  }

  function editLocation(loc: Location) {
    setEditingId(loc.id);
    setFormCode(loc.code);
    setFormLabel(loc.label || '');
    setFormParentId(loc.parent_id);
  }

  async function saveCategory() {
    if (!formName.trim()) {
      setToast('分类名称不能为空');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    if (editingId) {
      await supabase.from('categories').update({ name: formName.trim(), parent_id: formParentId }).eq('id', editingId);
    } else {
      await supabase.from('categories').insert({ name: formName.trim(), parent_id: formParentId });
    }
    resetForm();
    loadData();
  }

  async function saveLocation() {
    if (!formCode.trim() || !formLabel.trim()) {
      setToast('位置编码和标签不能为空');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    if (editingId) {
      const { error } = await supabase.from('locations').update({ code: formCode.trim(), label: formLabel.trim(), parent_id: formParentId }).eq('id', editingId);
      if (error) {
        setToast('保存失败: ' + error.message);
        setTimeout(() => setToast(''), 2000);
        return;
      }
    } else {
      const { error } = await supabase.from('locations').insert({ code: formCode.trim(), label: formLabel.trim(), parent_id: formParentId });
      if (error) {
        setToast('保存失败: ' + error.message);
        setTimeout(() => setToast(''), 2000);
        return;
      }
    }
    resetForm();
    loadData();
  }

  async function deleteCategory(id: string) {
    // Check if any parts use this category
    const { data: parts } = await supabase.from('parts').select('id').eq('category_id', id).limit(1);
    if (parts && parts.length > 0) {
      setToast('该分类下有零件，无法删除');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    if (!window.confirm('确定删除该分类？')) return;
    await supabase.from('categories').delete().eq('id', id);
    resetForm();
    loadData();
  }

  async function deleteLocation(id: string) {
    const { data: parts } = await supabase.from('parts').select('id').eq('location_id', id).limit(1);
    if (parts && parts.length > 0) {
      setToast('该位置下有零件，无法删除');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    if (!window.confirm('确定删除该位置？')) return;
    await supabase.from('locations').delete().eq('id', id);
    resetForm();
    loadData();
  }

  // Helper: get parent name for display
  function parentName(parentId: string | null): string {
    if (!parentId) return '';
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : '';
  }

  function parentLocationLabel(parentId: string | null): string {
    if (!parentId) return '';
    const parent = locations.find(l => l.id === parentId);
    return parent ? `${parent.code} ${parent.label || ''}` : '';
  }

  // 一键清空所有测试数据
  async function clearAllData() {
    const input = window.prompt(
      '⚠️ 此操作将永久删除所有数据，不可撤销！\n\n将清空：零件、交易流水、BOM、采购、分类、位置\n\n请输入"确认清空"以继续：'
    );
    if (input !== '确认清空') {
      setToast('已取消，未做任何修改');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    setClearingAll(true);
    setToast('🔄 正在清空所有数据...');

    try {
      // 按外键依赖顺序删除（先删子表，再删主表）
      await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchase_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bom_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('boms').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 重建默认分类
      const defaultCategories = [
        { name: '电阻', sort_order: 1 },
        { name: '电容', sort_order: 2 },
        { name: '电感', sort_order: 3 },
        { name: '二极管', sort_order: 4 },
        { name: '三极管', sort_order: 5 },
        { name: 'IC / 芯片', sort_order: 6 },
        { name: '连接器', sort_order: 7 },
        { name: '传感器', sort_order: 8 },
        { name: '其他', sort_order: 9 },
      ];
      await supabase.from('categories').insert(defaultCategories);

      // 重建默认仓库体系（复用一键初始化逻辑）
      const wh1 = { code: 'A1', label: '主仓库', parent_id: null };
      const wh2 = { code: 'B1', label: '备件仓库', parent_id: null };
      const { data: whData } = await supabase.from('locations').insert([wh1, wh2]).select('id');
      if (!whData || whData.length < 2) {
        setToast('⚠️ 数据已清空，但仓库重建失败，请手动初始化');
        setTimeout(() => setToast(''), 3000);
        return;
      }
      const wh1Id = whData[0].id;
      const wh2Id = whData[1].id;
      const children = [
        { code: 'A1-1', label: 'A1 1号货架', parent_id: wh1Id },
        { code: 'A1-2', label: 'A1 2号货架', parent_id: wh1Id },
        { code: 'A1-3', label: 'A1 3号货架', parent_id: wh1Id },
        { code: 'B1-1', label: 'B1 1号货架', parent_id: wh2Id },
        { code: 'B1-2', label: 'B1 2号货架', parent_id: wh2Id },
      ];
      const { data: shelves } = await supabase.from('locations').insert(children).select('id,code');
      if (shelves && shelves.length > 0) {
        const bins = [];
        for (const s of shelves) {
          for (let i = 1; i <= 4; i++) {
            bins.push({ code: `${s.code}-${String(i).padStart(2, '0')}`, label: `层${i}`, parent_id: s.id });
          }
        }
        await supabase.from('locations').insert(bins);
      }

      setToast('✅ 所有数据已清空，并重建了默认分类和仓库体系');
    } catch (e: any) {
      setToast('❌ 清空失败：' + e.message);
    } finally {
      setClearingAll(false);
      loadData();
      setTimeout(() => setToast(''), 3000);
    }
  }

  // 构建位置树（顶层 → 子级递归）
  const locationTree = useMemo(() => {
    const map = new Map<string, Location & { children: (Location & { children: any[] })[] }>();
    const roots: (Location & { children: any[] })[] = [];

    // 初始化所有节点
    for (const loc of locations) {
      map.set(loc.id, { ...loc, children: [] });
    }

    // 构建父子关系
    for (const loc of locations) {
      const node = map.get(loc.id)!;
      if (loc.parent_id && map.has(loc.parent_id)) {
        map.get(loc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [locations]);

  // 渲染树节点（递归）
  function renderLocationNode(node: Location & { children: any[] }, depth: number = 0): JSX.Element {
    const childParts = node.children && node.children.length > 0;
    return (
      <div key={node.id}>
        <div className="settings-item" style={{ paddingLeft: 12 + depth * 20 }}>
          <div className="settings-item-main" onClick={() => editLocation(node)}>
            <span className="settings-item-icon">{childParts ? '📁' : '📍'}</span>
            <div className="settings-item-info">
              <div className="settings-item-name">{node.code}</div>
              <div className="settings-item-meta">
                {node.label}
                {node.parent_id && (
                  <span style={{ color: '#aaa' }}>
                    {' · 路径: '}
                    {getLocationPath(node, locations)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="settings-item-delete"
            onClick={(e) => { e.stopPropagation(); deleteLocation(node.id); }}
            title="删除"
          >
            🗑️
          </button>
        </div>
        {childParts && node.children.map((child: any) => renderLocationNode(child, depth + 1))}
      </div>
    );
  }

  // 构建分类树
  const categoryTree = useMemo(() => {
    const map = new Map<string, Category & { children: (Category & { children: any[] })[] }>();
    const roots: (Category & { children: any[] })[] = [];

    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [categories]);

  function renderCategoryNode(node: Category & { children: any[] }, depth: number = 0): JSX.Element {
    const hasChildren = node.children && node.children.length > 0;
    return (
      <div key={node.id}>
        <div className="settings-item" style={{ paddingLeft: 12 + depth * 20 }}>
          <div className="settings-item-main" onClick={() => editCategory(node)}>
            <span className="settings-item-icon">{hasChildren ? '📁' : '📂'}</span>
            <div className="settings-item-info">
              <div className="settings-item-name">{node.name}</div>
              {node.parent_id && (
                <div className="settings-item-meta">父级: {parentName(node.parent_id)}</div>
              )}
            </div>
          </div>
          <button
            className="settings-item-delete"
            onClick={(e) => { e.stopPropagation(); deleteCategory(node.id); }}
            title="删除"
          >
            🗑️
          </button>
        </div>
        {hasChildren && node.children.map((child: any) => renderCategoryNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <h1>⚙️ 设置</h1>
      </div>
      <div style={{
        margin: '0 16px 12px',
        padding: '8px 14px',
        background: '#e3f2fd',
        borderLeft: '4px solid #2196f3',
        borderRadius: 6,
        fontSize: 13,
        color: '#1565c0',
        fontWeight: 500,
      }}>
        🔧 管理员专用功能
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === 'categories' ? 'active' : ''}`}
          onClick={() => { setTab('categories'); resetForm(); }}
        >
          📂 分类管理
        </button>
        <button
          className={`settings-tab ${tab === 'locations' ? 'active' : ''}`}
          onClick={() => { setTab('locations'); resetForm(); }}
        >
          📍 位置管理
        </button>
      </div>

      {/* 一键清空数据（始终可见，不受 tab 影响） */}
      <div className="settings-form" style={{ background: '#fff5f5', border: '2px solid #ff4444', margin: '0 16px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#cc0000', marginBottom: 8 }}>
          🚨 危险操作区
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          一键清空所有数据并重建默认分类和仓库体系。所有零件、交易、BOM、采购记录将被永久删除，不可撤销！
        </div>
        <button
          onClick={clearAllData}
          disabled={clearingAll}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: clearingAll ? '#ddd' : '#ff4444',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: clearingAll ? 'not-allowed' : 'pointer',
          }}
        >
          {clearingAll ? '🔄 正在清空...' : '💣 一键清空所有测试数据'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>
      ) : tab === 'categories' ? (
        <div>
          {/* Add/Edit form */}
          <div className="settings-form">
            <input
              className="form-input"
              type="text"
              placeholder="分类名称"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCategory()}
              autoFocus={!!editingId}
            />
            <select
              className="form-select"
              value={formParentId || ''}
              onChange={(e) => setFormParentId(e.target.value || null)}
              style={{ marginTop: 8 }}
            >
              <option value="">无父级（顶级）</option>
              {categories
                .filter(c => c.id !== editingId) // can't be own parent
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveCategory}>
                {editingId ? '💾 保存' : '➕ 添加分类'}
              </button>
              {editingId && (
                <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={resetForm}>取消</button>
              )}
            </div>
          </div>

          {/* Category list */}
          <div className="settings-list">
            {categories.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <p>还没有分类</p>
              </div>
            ) : (
              categoryTree.map(node => renderCategoryNode(node))
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* 一键初始化仓库体系 */}
          <div className="settings-form" style={{ background: '#f0f7ff', border: '1px solid #b3d4ff' }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              🚀 首次使用？一键创建常见的仓库-货架-层位结构。
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={async () => {
                if (!window.confirm('这将清空所有现有位置并创建示例仓库结构（仓库1/仓库2），确定继续？')) return;
                setLoading(true);
                // 删除所有现有位置
                await supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                // 创建仓库1、仓库2及子位置
                const wh1 = { code: 'A1', label: '主仓库', parent_id: null };
                const wh2 = { code: 'B1', label: '备件仓库', parent_id: null };
                const { data: whData } = await supabase.from('locations').insert([wh1, wh2]).select('id');
                const wh1Id = whData?.[0]?.id;
                const wh2Id = whData?.[1]?.id;
                if (!wh1Id || !wh2Id) {
                  setToast('初始化失败：无法创建仓库');
                  setLoading(false);
                  setTimeout(() => setToast(''), 2000);
                  return;
                }
                const children = [
                  { code: 'A1-1', label: 'A1 1号货架', parent_id: wh1Id },
                  { code: 'A1-2', label: 'A1 2号货架', parent_id: wh1Id },
                  { code: 'A1-3', label: 'A1 3号货架', parent_id: wh1Id },
                  { code: 'B1-1', label: 'B1 1号货架', parent_id: wh2Id },
                  { code: 'B1-2', label: 'B1 2号货架', parent_id: wh2Id },
                ];
                const { data: shelves } = await supabase.from('locations').insert(children).select('id,code');
                if (!shelves || shelves.length === 0) {
                  setToast('初始化失败：无法创建货架');
                  setLoading(false);
                  setTimeout(() => setToast(''), 2000);
                  return;
                }
                const bins = [];
                for (const s of shelves) {
                  for (let i = 1; i <= 4; i++) {
                    bins.push({ code: `${s.code}-${String(i).padStart(2, '0')}`, label: `层${i}`, parent_id: s.id });
                  }
                }
                await supabase.from('locations').insert(bins);
                setLoading(false);
                loadData();
                setToast('✅ 仓库体系初始化完成！');
                setTimeout(() => setToast(''), 2000);
              }}
            >
              🏭 一键初始化仓库体系
            </button>
          </div>

          {/* Add/Edit form */}
          <div className="settings-form">
            <input
              className="form-input"
              type="text"
              placeholder="位置编码（如 A-01-03）"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveLocation()}
              autoFocus={!!editingId}
            />
            <input
              className="form-input"
              type="text"
              placeholder="标签说明（如 A架1层第3格）"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveLocation()}
              style={{ marginTop: 8 }}
            />
            <select
              className="form-select"
              value={formParentId || ''}
              onChange={(e) => setFormParentId(e.target.value || null)}
              style={{ marginTop: 8 }}
            >
              <option value="">无父级（根位置）</option>
              {locations
                .filter(l => l.id !== editingId)
                .map(l => (
                  <option key={l.id} value={l.id}>{l.code} {l.label}</option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveLocation}>
                {editingId ? '💾 保存' : '➕ 添加位置'}
              </button>
              {editingId && (
                <button className="btn" style={{ background: '#eee', color: '#333' }} onClick={resetForm}>取消</button>
              )}
            </div>
          </div>

          {/* Location list */}
          <div className="settings-list">
            {locations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <p>还没有位置</p>
              </div>
            ) : (
              locationTree.map(node => renderLocationNode(node))
            )}
          </div>
        </div>
      )}
    </div>
  );
}