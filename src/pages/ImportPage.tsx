import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Part } from '../types';

interface ParsedRow {
  index: number;
  name: string;
  spec: string;
  qty: number;
  price: number | null;
  link: string;
  remark: string;
}

interface DuplicateCheck {
  rowIndex: number;
  parsed: ParsedRow;
  matchedPart: Part | null;
  matchReason: string;
}

type RowDecision = 'new' | 'merge' | 'skip';

export default function ImportPage() {
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCheck[]>([]);
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) {
        setCategories(data);
        const other = data.find((c) => c.name === '其他');
        if (other) setDefaultCategory(other.id);
      }
    });
  }, []);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[（(]/g, '(')
      .replace(/[）)]/g, ')')
      .replace(/[，,]/g, ',');

  const parsePaste = () => {
    setMessage(null);
    const lines = pasteText.split('\n').filter((l) => l.trim());

    const rows: ParsedRow[] = [];
    for (const line of lines) {
      const cols = line.split('\t').map((c) => c.trim());
      if (cols.length < 3) continue;
      if (!cols[0] || isNaN(Number(cols[0]))) continue; // 跳过非数据行

      const idx = parseInt(cols[0]);
      const name = cols[2] || '';
      const spec = cols[3] || '';
      const price = parseFloat(cols[4]) || null;
      const qty = parseInt(cols[5]) || 0;
      const link = cols[7] || '';
      const remark = cols[8] || '';

      if (!name || qty <= 0) continue;

      rows.push({ index: idx, name, spec, qty, price, link, remark });
    }

    setParsedRows(rows);
    setDecisions({});
    checkDuplicates(rows);
  };

  const checkDuplicates = async (rows: ParsedRow[]) => {
    const { data: allParts } = await supabase.from('parts').select('*');
    if (!allParts) return;

    const dupResults: DuplicateCheck[] = [];
    const initialDecisions: Record<number, RowDecision> = {};

    for (const row of rows) {
      let matchedPart: Part | null = null;
      let matchReason = '';

      // 1. 型号精确匹配（最高优先级）
      if (row.spec) {
        for (const p of allParts) {
          if (normalize(p.remark || '').includes(normalize(row.spec)) ||
              normalize(row.spec).includes(normalize(p.remark || ''))) {
            matchedPart = p;
            matchReason = `型号 "${row.spec}" 匹配到已有零件 "${p.name}"`;
            break;
          }
        }
      }

      // 2. 名称模糊匹配
      if (!matchedPart) {
        for (const p of allParts) {
          const nP = normalize(p.name);
          const nR = normalize(row.name);
          if (nP === nR || nP.includes(nR) || nR.includes(nP)) {
            matchedPart = p;
            matchReason = `名称相似: "${row.name}" → "${p.name}"`;
            break;
          }
        }
      }

      // 3. 型号归一化精确匹配
      if (!matchedPart && row.spec) {
        for (const p of allParts) {
          if (normalize(p.name).includes(normalize(row.spec))) {
            matchedPart = p;
            matchReason = `型号 "${row.spec}" 出现在已有零件 "${p.name}" 的名称中`;
            break;
          }
          if (normalize(row.name).includes(normalize(p.name.replace(/^[\w\d]+\s*/, '')))) {
            matchedPart = p;
            matchReason = `可能与 "${p.name}" 重复`;
            break;
          }
        }
      }

      if (matchedPart) {
        dupResults.push({ rowIndex: row.index, parsed: row, matchedPart, matchReason });
        initialDecisions[row.index] = 'merge';
      } else {
        initialDecisions[row.index] = 'new';
      }
    }

    setDuplicates(dupResults);
    setDecisions((prev) => ({ ...prev, ...initialDecisions }));
  };

  const handleDecisionChange = (rowIndex: number, decision: RowDecision) => {
    setDecisions((prev) => ({ ...prev, [rowIndex]: decision }));
  };

  const handleImport = async () => {
    setImporting(true);
    setMessage(null);
    const operator = localStorage.getItem('operator_nickname') || '无名';

    let success = 0;
    let errors: string[] = [];

    for (const row of parsedRows) {
      const decision = decisions[row.index] || 'new';

      try {
        if (decision === 'skip') continue;

        if (decision === 'merge') {
          // 找到匹配的已有零件，加到其库存
          const dup = duplicates.find((d) => d.rowIndex === row.index);
          if (!dup?.matchedPart) {
            // fallback: 创建新零件
            await createPart(row, operator);
            success++;
            continue;
          }

          // 更新库存
          const newQty = dup.matchedPart.quantity + row.qty;
          const { error: updateErr } = await supabase
            .from('parts')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', dup.matchedPart.id);

          if (updateErr) throw updateErr;

          // 记录流水
          const { error: txErr } = await supabase.from('transactions').insert({
            part_id: dup.matchedPart.id,
            type: 'in',
            quantity: row.qty,
            operator,
            remark: `批量导入 - 采购单${row.index}`,
          });

          if (txErr) throw txErr;
          success++;
        } else {
          // 创建新零件
          await createPart(row, operator);
          success++;
        }
      } catch (err: any) {
        errors.push(`[${row.index}] ${row.name}: ${err.message || '导入失败'}`);
      }
    }

    setImporting(false);
    if (errors.length === 0) {
      setMessage({ text: `成功导入 ${success} 个零件！`, type: 'success' });
      setPasteText('');
      setParsedRows([]);
      setDuplicates([]);
    } else {
      setMessage({
        text: `成功 ${success} 个，失败 ${errors.length} 个：\n${errors.join('\n')}`,
        type: 'error',
      });
    }
  };

  const createPart = async (row: ParsedRow, operator: string) => {
    const { data: newPart, error } = await supabase
      .from('parts')
      .insert({
        name: row.name,
        category_id: defaultCategory || null,
        quantity: row.qty,
        unit: '个',
        remark: [row.spec ? `型号:${row.spec}` : '', row.link || '', row.remark || '']
          .filter(Boolean)
          .join(' | '),
      })
      .select()
      .single();

    if (error) throw error;

    // 记录入库流水
    if (newPart) {
      const { error: txError } = await supabase.from('transactions').insert({
        part_id: newPart.id,
        type: 'in',
        quantity: row.qty,
        operator,
        remark: `批量导入 - 采购单${row.index}`,
      });
      if (txError) console.error('Transaction insert failed:', txError);
    }
  };

  const dupMap = new Map<number, DuplicateCheck>();
  duplicates.forEach((d) => dupMap.set(d.rowIndex, d));

  return (
    <div className="page">
      <div className="page-header">
        <h1>📥 批量导入</h1>
      </div>

      {message && (
        <div className={`toast`} style={{ position: 'relative', top: 0, marginBottom: 12, background: message.type === 'success' ? '#4caf50' : '#ff6b35' }}>
          {message.text}
        </div>
      )}

      {/* 粘贴区域 */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
          在 Excel 中选中采购数据行（不含表头），Ctrl+C 复制后粘贴到下方：
        </p>
        <textarea
          className="form-textarea"
          style={{ height: 120, fontSize: 13, fontFamily: 'monospace' }}
          placeholder={`示例粘贴格式：\n1\t备材\tFF螺杆支撑座\t[FF-12]\t10\t1\t10\thttps://...\t`}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          onPaste={(e) => {
            setTimeout(() => {
              const target = e.target as HTMLTextAreaElement;
              setPasteText(target.value);
            }, 0);
          }}
        />
        <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={parsePaste} disabled={!pasteText.trim()}>
          🔍 解析并预览
        </button>
      </div>

      {/* 预览表格 */}
      {parsedRows.length > 0 && (
        <>
          <div className="page-header">
            <h1>预览 ({parsedRows.length} 行)</h1>
          </div>

          <div style={{ overflowX: 'auto', padding: '0 16px' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa', textAlign: 'left', fontSize: 12, color: '#888' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>名称</th>
                  <th style={thStyle}>型号</th>
                  <th style={thStyle}>数量</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => {
                  const dup = dupMap.get(row.index);
                  const isDup = !!dup;
                  const decision = decisions[row.index] || 'new';

                  return (
                    <tr key={row.index} style={{ borderBottom: '1px solid #f0f0f0', background: isDup ? '#fff8e1' : 'transparent' }}>
                      <td style={tdStyle}>{row.index}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        {isDup && (
                          <div style={{ fontSize: 11, color: '#ff9800', marginTop: 2 }}>
                            ⚠️ {dup.matchReason}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: '#888' }}>{row.spec || '-'}</td>
                      <td style={tdStyle}>{row.qty}</td>
                      <td style={tdStyle}>
                        {isDup ? (
                          <span style={{ color: '#ff9800', fontSize: 12, fontWeight: 600 }}>⚠️ 疑似重复</span>
                        ) : (
                          <span style={{ color: '#4caf50', fontSize: 12, fontWeight: 600 }}>✅ 新零件</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={decision}
                          onChange={(e) => handleDecisionChange(row.index, e.target.value as RowDecision)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #ddd',
                            fontSize: 13,
                            background: '#fff',
                          }}
                        >
                          <option value="new">作为新零件</option>
                          {isDup && <option value="merge">合并到已有 ({dup.matchedPart?.name})</option>}
                          <option value="skip">跳过</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 导入按钮 */}
          <div style={{ padding: '16px' }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={handleImport}
              disabled={importing || parsedRows.length === 0}
            >
              {importing ? '导入中...' : `✅ 确认导入 ${parsedRows.filter((r) => decisions[r.index] !== 'skip').length} 个零件`}
            </button>
          </div>
        </>
      )}

      {/* 空状态 */}
      {parsedRows.length === 0 && !pasteText && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>粘贴 Excel 采购数据开始导入</p>
          <p style={{ fontSize: 12, color: '#ccc', marginTop: 8 }}>支持采购申请表格式</p>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 6px',
  verticalAlign: 'top',
};