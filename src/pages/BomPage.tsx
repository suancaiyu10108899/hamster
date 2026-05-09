import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Bom, BomItem, Part, BomParsedRow } from '@/types';

// CSV 解析：自动识别列名
function parseBomCSV(csv: string): { partName: string; modelNumber: string; quantity: number }[] {
  const lines = csv
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return [];

  // 解析表头，找到「名称」「型号」「数量」列
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const nameIdx = header.findIndex(h => /名称|零件|name|part/i.test(h));
  const modelIdx = header.findIndex(h => /型号|规格|model|spec/i.test(h));
  const qtyIdx = header.findIndex(h => /数量|用量|quantity|qty/i.test(h));

  if (nameIdx === -1 || qtyIdx === -1) return [];

  const rows: { partName: string; modelNumber: string; quantity: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const name = cols[nameIdx] || '';
    const model = modelIdx !== -1 ? (cols[modelIdx] || '') : '';
    const qty = parseInt(cols[qtyIdx], 10);

    if (name && !isNaN(qty) && qty > 0) {
      rows.push({ partName: name, modelNumber: model, quantity: qty });
    }
  }

  return rows;
}

export default function BomPage() {
  const navigate = useNavigate();
  const [boms, setBoms] = useState<Bom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新建 / 编辑状态
  const [showCreate, setShowCreate] = useState(false);
  const [bomName, setBomName] = useState('');
  const [bomDesc, setBomDesc] = useState('');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<BomParsedRow[]>([]);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBoms();
  }, []);

  async function loadBoms() {
    setLoading(true);
    setError('');

    // 加载 BOM + 每个 BOM 的零件数量
    const { data, error: err } = await supabase
      .from('boms')
      .select('*, bom_items(count)')
      .order('created_at', { ascending: false });

    if (err) {
      setError('加载 BOM 失败：' + err.message);
    } else {
      setBoms((data || []) as Bom[]);
    }
    setLoading(false);
  }

  // 解析 CSV 并自动匹配零件
  async function handleParseCSV() {
    if (!csvText.trim()) return;

    setParsing(true);
    setError('');

    // 加载所有零件
    const { data: parts } = await supabase
      .from('parts')
      .select('id, name, model_number, quantity, unit');

    const partList = (parts || []) as Part[];
    setAllParts(partList);

    const rows = parseBomCSV(csvText);
    const parsed: BomParsedRow[] = rows.map(r => {
      // 自动匹配：先按「名称」精确匹配，再按「名称+型号」精确匹配，然后模糊匹配
      let matched: Part | null = null;
      let confident = false;

      // 精确匹配：名称 + 型号都一致
      if (r.modelNumber) {
        matched = partList.find(
          p => p.name.toLowerCase() === r.partName.toLowerCase() &&
               p.model_number?.toLowerCase() === r.modelNumber.toLowerCase()
        ) || null;
        if (matched) confident = true;
      }

      // 仅按名称匹配
      if (!matched) {
        matched = partList.find(
          p => p.name.toLowerCase() === r.partName.toLowerCase()
        ) || null;
        if (matched) confident = true;
      }

      // 模糊匹配
      if (!matched) {
        matched = partList.find(
          p => p.name.toLowerCase().includes(r.partName.toLowerCase()) ||
               r.partName.toLowerCase().includes(p.name.toLowerCase())
        ) || null;
      }

      return { partName: r.partName, modelNumber: r.modelNumber, quantity: r.quantity, matchedPart: matched, matchConfident: confident };
    });

    setParsedRows(parsed);
    setParsing(false);
  }

  // 单元格编辑：零件名、型号、数量
  function updateParsedRow(index: number, field: 'partName' | 'modelNumber' | 'quantity', value: string) {
    const updated = [...parsedRows];
    const row = { ...updated[index] };

    if (field === 'quantity') {
      row.quantity = parseInt(value, 10) || 0;
    } else if (field === 'partName') {
      row.partName = value;
      // 重新匹配
      row.matchedPart = allParts.find(
        p => p.name.toLowerCase() === value.toLowerCase()
      ) || null;
      row.matchConfident = !!row.matchedPart;
    } else {
      row.modelNumber = value;
      // 重新匹配（名称+型号）
      if (row.modelNumber) {
        const m = allParts.find(
          p => p.name.toLowerCase() === row.partName.toLowerCase() &&
               p.model_number?.toLowerCase() === row.modelNumber.toLowerCase()
        ) || null;
        if (m) { row.matchedPart = m; row.matchConfident = true; }
      }
    }

    updated[index] = row;
    setParsedRows(updated);
  }

  async function handleSaveBom() {
    if (!bomName.trim()) {
      alert('请输入 BOM 名称');
      return;
    }
    if (parsedRows.length === 0) {
      alert('没有可保存的行（请先解析 CSV）——粘贴 CSV 后点击「解析并匹配」');
      return;
    }

    setSaving(true);
    setError('');

    // 创建 BOM
    const { data: bom, error: bomErr } = await supabase
      .from('boms')
      .insert({ name: bomName.trim(), description: bomDesc.trim() || null })
      .select()
      .single();

    if (bomErr || !bom) {
      setError('创建 BOM 失败：' + (bomErr?.message || '未知错误'));
      setSaving(false);
      return;
    }

    // 批量插入明细（所有行都保存，匹配不到的 part_id 为 null）
    const items = parsedRows.map((r, i) => ({
      bom_id: bom.id,
      part_id: r.matchedPart?.id ?? null,
      quantity: r.quantity,
      sort_order: i,
    }));

    const { error: itemsErr } = await supabase
      .from('bom_items')
      .insert(items);

    if (itemsErr) {
      setError('保存 BOM 明细失败：' + itemsErr.message);
      setSaving(false);
      return;
    }

    const unmatchedCount = parsedRows.filter(r => !r.matchedPart).length;

    setSaving(false);
    setShowCreate(false);
    resetForm();
    loadBoms();

    if (unmatchedCount > 0) {
      alert(`✅ BOM 已保存！\n\n⚠️ 有 ${unmatchedCount} 个零件未匹配到库存，出库时会跳过。\n稍后补充零件信息后可重新编辑 BOM。`);
    }
  }

  function resetForm() {
    setBomName('');
    setBomDesc('');
    setCsvText('');
    setParsedRows([]);
    setAllParts([]);
  }

  // 清空 CSV 粘贴区
  function clearPasteArea() {
    setCsvText('');
    setParsedRows([]);
  }

  async function deleteBom(id: string, name: string) {
    if (!confirm(`确定删除 BOM「${name}」？`)) return;

    const { error: err } = await supabase
      .from('boms')
      .delete()
      .eq('id', id);

    if (err) {
      setError('删除失败：' + err.message);
    } else {
      setBoms(prev => prev.filter(b => b.id !== id));
    }
  }

  // 一键清空所有测试 BOM（正式使用前清理）
  async function clearAllBoms() {
    if (!confirm('⚠️ 这将删除所有 BOM 数据，不可恢复！\n确定要清空全部 BOM 吗？')) return;

    const { error: err } = await supabase
      .from('boms')
      .delete()
      .neq('id', ''); // 删除所有行

    if (err) {
      setError('清空失败：' + err.message);
    } else {
      setBoms([]);
      alert('✅ 已清空所有 BOM');
    }
  }

  const matchedCount = parsedRows.filter(r => r.matchedPart).length;
  const confidentCount = parsedRows.filter(r => r.matchConfident).length;

  // 计算每个 BOM 的零件数（从 bom_items count 获取）
  function getItemCount(bom: Bom): number {
    return (bom as any).bom_items?.[0]?.count ?? 0;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 BOM 物料清单</h1>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowCreate(true); }}
        >
          ＋ 新建 BOM
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* BOM 列表 */}
      {!showCreate && (
        <div>
          {loading ? (
            <div className="loading">加载中...</div>
          ) : boms.length === 0 ? (
            <div className="empty-state">
              <p>暂无 BOM 模板</p>
              <p className="text-muted">点击「新建 BOM」粘贴 CSV 快速创建</p>
            </div>
          ) : (
            <div className="bom-grid">
              {boms.map(bom => (
                <div
                  key={bom.id}
                  className="bom-card"
                  onClick={() => navigate(`/bom/${bom.id}/checkout`)}
                >
                  <div className="bom-card-body">
                    <div className="bom-card-header">
                      <span className="bom-card-title">{bom.name}</span>
                      <span className="bom-badge">{getItemCount(bom)} 个零件</span>
                    </div>
                    {bom.description && (
                      <span className="bom-card-desc">{bom.description}</span>
                    )}
                    <div className="bom-card-footer">
                      <span className="bom-date">
                        {new Date(bom.created_at).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </span>
                      <span className="bom-action-hint">点击出库 →</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger bom-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBom(bom.id, bom.name);
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新建/编辑 BOM */}
      {showCreate && (
        <div className="card">
          <h2>新建 BOM</h2>

          <div className="form-group">
            <label>BOM 名称 *</label>
            <input
              type="text"
              className="input"
              placeholder="例如：飞镖机 v2.0"
              value={bomName}
              onChange={e => setBomName(e.target.value)}
            />
            {!bomName.trim() && (
              <span className="field-hint">必填，请输入 BOM 名称</span>
            )}
          </div>

          <div className="form-group">
            <label>描述（可选）</label>
            <input
              type="text"
              className="input"
              placeholder="简短说明"
              value={bomDesc}
              onChange={e => setBomDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>粘贴 CSV（必含「名称」和「数量」列，可选「型号」列）</label>
            <button
              className="btn"
              style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 13, marginBottom: 8 }}
              onClick={() => {
                const template = '名称,型号,数量\nM3x12螺丝,M3*12 12.9级,20\nMG90S舵机,360度,2\n杜邦线,母对母20cm,10\n同步带,GT2-6mm闭口-200mm,4';
                const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'hamster-bom-template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              📥 下载CSV模板
            </button>
            <div className="paste-row">
              <textarea
                className="input textarea"
                rows={6}
                placeholder={`名称,型号,数量
M3*10螺丝,,20
MG90S舵机,360度,2
杜邦线,母对母20cm,10`}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
              />
              {csvText.trim() && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#f5f5f5', color: '#999' }}
                  onClick={clearPasteArea}
                  title="清空粘贴区"
                >
                  🗑️ 清空
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleParseCSV}
              disabled={parsing || !csvText.trim()}
            >
              {parsing ? '解析中...' : '🔍 解析并匹配'}
            </button>
          </div>

          {/* 解析结果表格 */}
          {parsedRows.length > 0 && (
            <div className="form-group">
              <div className="match-summary">
                共 {parsedRows.length} 行，
                <span className="text-success">精确匹配 {confidentCount}</span> 个，
                <span className={matchedCount > confidentCount ? 'text-warning' : ''}>
                  待确认 {parsedRows.length - confidentCount} 个
                </span>
              </div>

              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>零件名称</th>
                      <th>型号</th>
                      <th>数量</th>
                      <th>匹配结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row.matchConfident ? '' : 'row-warning'}>
                        <td>
                          <input
                            className="input input-sm"
                            value={row.partName}
                            onChange={e => updateParsedRow(i, 'partName', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input input-sm"
                            value={row.modelNumber}
                            onChange={e => updateParsedRow(i, 'modelNumber', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="input input-sm"
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={e => updateParsedRow(i, 'quantity', e.target.value)}
                            style={{ width: 60 }}
                          />
                        </td>
                        <td>
                          {row.matchedPart ? (
                            <span className="matched-part">
                              {row.matchConfident ? '✅' : '⚠️'} {row.matchedPart.name}
                              {row.matchedPart.model_number && ` (${row.matchedPart.model_number})`}
                              <span className="text-muted"> 库存: {row.matchedPart.quantity}</span>
                            </span>
                          ) : (
                            <span className="text-danger">❌ 未匹配</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSaveBom}
              disabled={saving}
            >
              {saving ? '保存中...' : `💾 保存 BOM（${matchedCount} 个零件）`}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowCreate(false); resetForm(); }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <style>{`
        .bom-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bom-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #fff;
        }
        .bom-card:hover {
          border-color: #6366f1;
          box-shadow: 0 2px 12px rgba(99, 102, 241, 0.12);
        }
        .bom-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bom-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bom-card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        .bom-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 12px;
          background: #eef2ff;
          color: #6366f1;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .bom-card-desc {
          font-size: 13px;
          color: #6b7280;
        }
        .bom-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bom-date {
          font-size: 12px;
          color: #9ca3af;
        }
        .bom-action-hint {
          font-size: 12px;
          color: #6366f1;
          font-weight: 500;
        }
        .bom-delete-btn {
          flex-shrink: 0;
          margin-left: 12px;
        }
        .matched-part { font-size: 14px; }
        .match-summary {
          margin-bottom: 12px;
          font-size: 14px;
          color: #666;
        }
        .text-success { color: #22c55e; font-weight: 600; }
        .text-warning { color: #f59e0b; font-weight: 600; }
        .text-danger { color: #ef4444; }
        .row-warning { background: #fef9e7; }
        .field-hint {
          font-size: 12px;
          color: #f59e0b;
          margin-top: 4px;
          display: block;
        }
        .input-sm {
          padding: 4px 8px;
          font-size: 13px;
        }
        .textarea {
          min-height: 100px;
          font-family: monospace;
          font-size: 13px;
        }
        .paste-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .paste-row textarea {
          flex: 1;
        }
        .paste-row .btn-sm {
          flex-shrink: 0;
          margin-top: 0;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
}