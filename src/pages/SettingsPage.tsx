import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Location } from '../types';

function getOperator(): string {
  return localStorage.getItem('hamster_operator') || '我';
}

export default function SettingsPage() {
  const [tab, setTab] = useState<'categories' | 'locations'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

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

  return (
    <div className="page" style={{ padding: 0 }}>
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <h1>⚙️ 设置</h1>
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
              categories.map(c => (
                <div key={c.id} className="settings-item">
                  <div className="settings-item-main" onClick={() => editCategory(c)}>
                    <span className="settings-item-icon">📂</span>
                    <div className="settings-item-info">
                      <div className="settings-item-name">{c.name}</div>
                      {c.parent_id && (
                        <div className="settings-item-meta">父级: {parentName(c.parent_id)}</div>
                      )}
                    </div>
                  </div>
                  <button
                    className="settings-item-delete"
                    onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div>
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
              locations.map(l => (
                <div key={l.id} className="settings-item">
                  <div className="settings-item-main" onClick={() => editLocation(l)}>
                    <span className="settings-item-icon">📍</span>
                    <div className="settings-item-info">
                      <div className="settings-item-name">{l.code}</div>
                      <div className="settings-item-meta">
                        {l.label}
                        {l.parent_id && ` · 父级: ${parentLocationLabel(l.parent_id)}`}
                      </div>
                    </div>
                  </div>
                  <button
                    className="settings-item-delete"
                    onClick={(e) => { e.stopPropagation(); deleteLocation(l.id); }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}