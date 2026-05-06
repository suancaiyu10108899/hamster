import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, Part, PurchaseItem } from '../types';

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
  const [createPurchase, setCreatePurchase] = useState(true); // 默认生成采购记录
  const [purchaseRemark, setPurchaseRemark] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [purchaseIntent, setPurchaseIntent] = useState('采购');

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

    if (lines.length === 0) {
      setParsedRows([]);
      setMessage({ text: '❌ 未识别到有效数据。请从 Excel 复制采购数据行（不含表头）后粘贴。', type: 'error' });
      return;
    }

    const rows: ParsedRow[] = [];
    let skippedNoQty = 0, skippedNoName = 0, skippedBadCols = 0;

    for (const line of lines) {
      const cols = line.split('\t').map((c) => c.trim());
      if (cols.length < 3) { skippedBadCols++; continue; }
      if (!cols[0] || isNaN(Number(cols[0]))) { skippedBadCols++; continue; }

      const idx = parseInt(cols[0]);
      const name = cols[2] || '';
      const spec = cols[3] || '';
      const price = parseFloat(cols[4]) || null;
      const qty = parseInt(cols[5]) || 0;
      const link = cols[7] || '';
      const remark = cols[8] || '';

      if (!name) { skippedNoName++; continue; }
      if (qty <= 0) { skippedNoQty++; continue; }

      rows.push({ index: idx, name, spec, qty, price, link, remark });
    }

    if (rows.length === 0) {
      setParsedRows([]);
      const reasons: string[] = [];
      if (skippedBadCols > 0) reasons.push(`${skippedBadCols} 行列数不足`);
      if (skippedNoName > 0) reasons.push(`${skippedNoName} 行缺少零件名称`);
      if (skippedNoQty > 0) reasons.push(`${skippedNoQty} 行数量为 0`);
      setMessage({
        text: `❌ 未解析到有效数据行（${reasons.join('，')}）。请检查：每行用 Tab 分隔，第3列为零件名称，第6列为数量。`,
        type: 'error',
      });
      return;
    }

    setParsedRows(rows);
    setDecisions({});

    const totalSkipped = skippedBadCols + skippedNoName + skippedNoQty;
    if (totalSkipped > 0) {
      setMessage({
        text: `✅ 成功解析 ${rows.length} 行，${totalSkipped} 行格式有误已自动跳过`,
        type: 'success',
      });
    }

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
          const normModel = normalize(p.model_number || '');
          if (!normModel) continue; // 空型号跳过，避免空字符串 includes 匹配一切
          if (normModel.includes(normalize(row.spec)) ||
              normalize(row.spec).includes(normModel)) {
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
          const normModel3 = normalize(p.model_number || '');
          if (normModel3 && (normModel3.includes(normalize(row.spec)) ||
              normalize(row.spec).includes(normModel3))) {
            matchedPart = p;
            matchReason = `型号匹配: "${row.spec}" → "${p.model_number}"`;
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
    // 收集用于生成采购记录的数据
    const purchaseItemsData: { partId: string | null; partName: string; qty: number; price: number | null; link: string }[] = [];

    for (const row of parsedRows) {
      const decision = decisions[row.index] || 'new';

      try {
        if (decision === 'skip') continue;

        if (decision === 'merge') {
          // 找到匹配的已有零件，加到其库存
          const dup = duplicates.find((d) => d.rowIndex === row.index);
          if (!dup?.matchedPart) {
            // fallback: 创建新零件
            const newPart = await createPart(row, operator);
            if (newPart) {
              purchaseItemsData.push({ partId: newPart.id, partName: row.name, qty: row.qty, price: row.price, link: row.link });
            }
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
          purchaseItemsData.push({ partId: dup.matchedPart.id, partName: row.name, qty: row.qty, price: row.price, link: row.link });
          success++;
        } else {
          // 创建新零件
          const newPart = await createPart(row, operator);
          if (newPart) {
            purchaseItemsData.push({ partId: newPart.id, partName: row.name, qty: row.qty, price: row.price, link: row.link });
          }
          success++;
        }
      } catch (err: any) {
        errors.push(`[${row.index}] ${row.name}: ${err.message || '导入失败'}`);
      }
    }

    // 如果用户选择生成采购记录
    if (createPurchase && purchaseItemsData.length > 0) {
      try {
        const totalAmount = purchaseItemsData.reduce((sum, item) => {
          return sum + ((item.price || 0) * item.qty);
        }, 0);

        const { data: purchase, error: purchaseErr } = await supabase
          .from('purchases')
          .insert({
            purchase_date: new Date().toISOString().split('T')[0],
            total_amount: totalAmount > 0 ? totalAmount : null,
            reimbursed: false,
            paid_by: paidBy || null,
            purchase_intent: purchaseIntent || '采购',
            remark: purchaseRemark || '批量导入生成',
            operator,
          })
          .select()
          .single();

        if (purchaseErr) {
          errors.push(`采购记录创建失败: ${purchaseErr.message} (代码: ${purchaseErr.code})`);
        } else if (purchase) {
          const itemsToInsert = purchaseItemsData.map((item, idx) => ({
            purchase_id: purchase.id,
            part_id: item.partId,
            part_name: item.partName,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: item.price ? item.price * item.qty : null,
            link: item.link || null,
            sort_order: idx + 1,
          }));
          const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);
          if (itemsErr) {
            errors.push(`采购明细创建失败: ${itemsErr.message} (代码: ${itemsErr.code})`);
          }
        }
      } catch (purchaseErr: any) {
        errors.push(`生成采购记录异常: ${purchaseErr?.message || purchaseErr}`);
      }
    }

    setImporting(false);
    if (errors.length === 0) {
      const partsMsg = `成功导入 ${success} 个零件`;
      const purchaseMsg = createPurchase && purchaseItemsData.length > 0 ? '，已生成采购记录' : '';
      setMessage({ text: `${partsMsg}${purchaseMsg}！`, type: 'success' });
      setPasteText('');
      setParsedRows([]);
      setDuplicates([]);
      setPurchaseRemark('');
    } else {
      setMessage({
        text: `成功 ${success} 个，失败 ${errors.length} 个：\n${errors.join('\n')}`,
        type: 'error',
      });
    }
  };

  const createPart = async (row: ParsedRow, operator: string): Promise<Part | null> => {
    const { data: newPart, error } = await supabase
      .from('parts')
      .insert({
        name: row.name,
        model_number: row.spec || null,
        category_id: defaultCategory || null,
        quantity: row.qty,
        unit: '个',
        remark: [row.link, row.remark].filter(Boolean).join(' | ') || null,
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

    return newPart;
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
          placeholder={`从 Excel 采购申请表选中数据行（不含表头），Ctrl+C 后在此 Ctrl+V 粘贴。\n格式要求：每行用 Tab 分隔，第 3 列名称、第 6 列数量为必填。\n示例：1\t备材\tFF螺杆支撑座\t[FF-12]\t10\t1\t10\thttps://...\t`}
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
          dup.matchReason.includes('型号匹配') || dup.matchReason.startsWith('型号 ') ? (
            <span style={{ color: '#4caf50', fontSize: 12, fontWeight: 600 }}>📦 补货（型号匹配）</span>
          ) : (
            <span style={{ color: '#ff9800', fontSize: 12, fontWeight: 600 }}>⚠️ 疑似重复</span>
          )
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

        {/* 采购记录选项 */}
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={createPurchase}
                onChange={(e) => setCreatePurchase(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              📝 同时生成采购记录
            </label>
            {createPurchase && (
              <div>
                <input
                  className="form-input"
                  placeholder="采购备注（如：2026赛季备材第二批）"
                  value={purchaseRemark}
                  onChange={(e) => setPurchaseRemark(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="垫付人（可选）"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-select"
                    value={purchaseIntent}
                    onChange={(e) => setPurchaseIntent(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="采购">采购</option>
                    <option value="翻出来的旧零件">翻出来的旧零件</option>
                    <option value="其他组给的">其他组给的</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>
            )}
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