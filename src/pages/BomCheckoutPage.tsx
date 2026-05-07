import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Bom, BomItem, Part } from '@/types';

interface CheckoutRow {
  bomItem: BomItem;
  part: Part;
  partName: string;       // 方便直接用
  modelNumber: string;
  stockQty: number;        // 现有库存
  needQty: number;         // 本次需要（单价 × 倍数）
  unitQty: number;         // BOM 单价
  sufficient: boolean;     // 库存是否足够
  shortage: number;        // 缺多少个
}

export default function BomCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bom, setBom] = useState<Bom | null>(null);
  const [rows, setRows] = useState<CheckoutRow[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [operator, setOperator] = useState('我');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    loadBom();
  }, [id]);

  // multiplier 变化时重新计算 needQty
  useEffect(() => {
    setRows(prev => prev.map(r => ({
      ...r,
      needQty: r.unitQty * multiplier,
      sufficient: r.stockQty >= r.unitQty * multiplier,
      shortage: Math.max(0, r.unitQty * multiplier - r.stockQty),
    })));
  }, [multiplier]);

  async function loadBom() {
    setLoading(true);
    setError('');

    // 加载 BOM
    const { data: bomData, error: bomErr } = await supabase
      .from('boms')
      .select('*')
      .eq('id', id)
      .single();

    if (bomErr || !bomData) {
      setError('BOM 不存在：' + (bomErr?.message || ''));
      setLoading(false);
      return;
    }

    setBom(bomData);

    // 加载 BOM 明细 + 关联零件
    const { data: items, error: itemsErr } = await supabase
      .from('bom_items')
      .select('*, part:parts(id, name, model_number, quantity, unit, location_id)')
      .eq('bom_id', id)
      .order('sort_order');

    if (itemsErr) {
      setError('加载 BOM 明细失败：' + itemsErr.message);
      setLoading(false);
      return;
    }

    const checkoutRows: CheckoutRow[] = (items || [])
      .filter((item: any) => item.part !== null)  // 跳过未匹配的零件
      .map((item: any) => {
        const part = item.part as Part;
        const stockQty = part.quantity ?? 0;
        const unitQty = item.quantity;
        const needQty = unitQty * multiplier;

        return {
          bomItem: item as BomItem,
          part: part,
          partName: part.name ?? '(零件已删除)',
          modelNumber: part.model_number ?? '',
          stockQty,
          needQty,
          unitQty,
          sufficient: stockQty >= needQty,
          shortage: Math.max(0, needQty - stockQty),
        };
      });

    setRows(checkoutRows);
    setLoading(false);
  }

  async function handleCheckout() {
    const insufficientRows = rows.filter(r => !r.sufficient);
    if (insufficientRows.length > 0) {
      const names = insufficientRows.map(r => r.partName).join('、');
      if (!confirm(`${names} 库存不足，是否仍然出库？（不足的零件将扣到 0）`)) {
        return;
      }
    }

    setCheckingOut(true);
    setError('');

    try {
      const now = new Date().toISOString();
      const remarkText = remark.trim() || `BOM ${bom?.name} ×${multiplier} 批量出库`;

      // 逐行创建 transaction 并更新库存
      for (const row of rows) {
        // 实际扣除数量：如果库存不足则扣到 0
        const actualQty = Math.min(row.needQty, row.stockQty);
        if (actualQty <= 0) continue;

        // 1. 创建出库交易记录
        const { error: txErr } = await supabase
          .from('transactions')
          .insert({
            part_id: row.part.id,
            type: 'out',
            quantity: actualQty,
            operator: operator || '我',
            remark: remarkText,
            created_at: now,
          });

        if (txErr) {
          setError(`出库「${row.partName}」失败：${txErr.message}`);
          setCheckingOut(false);
          return;
        }

        // 2. 更新零件库存
        const newQty = Math.max(0, row.stockQty - actualQty);
        const { error: updateErr } = await supabase
          .from('parts')
          .update({ quantity: newQty, updated_at: now })
          .eq('id', row.part.id);

        if (updateErr) {
          setError(`更新「${row.partName}」库存失败：${updateErr.message}`);
          setCheckingOut(false);
          return;
        }
      }

      setCheckingOut(false);
      alert(`✅ BOM 出库完成！共出库 ${rows.length} 种零件。`);
      navigate('/bom');
    } catch (e: any) {
      setError('出库异常：' + e.message);
      setCheckingOut(false);
    }
  }

  const totalKinds = rows.length;
  const sufficientCount = rows.filter(r => r.sufficient).length;
  const insufficientCount = rows.filter(r => !r.sufficient).length;

  if (loading) return <div className="page"><div className="loading">加载中...</div></div>;

  if (!bom) return <div className="page"><div className="alert alert-error">BOM 不存在</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/bom')}>
          ← 返回
        </button>
        <h1>🚀 {bom.name} 出库</h1>
      </div>

      {bom.description && <p className="text-muted" style={{ marginTop: -8, marginBottom: 12 }}>{bom.description}</p>}

      {error && <div className="alert alert-error">{error}</div>}

      {/* 倍数选择 */}
      <div className="form-group">
        <label>组装数量（倍数）</label>
        <div className="multiplier-row">
          {[1, 2, 3, 4, 5].map(m => (
            <button
              key={m}
              className={`btn ${multiplier === m ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMultiplier(m)}
            >
              ×{m}
            </button>
          ))}
          <input
            type="number"
            className="input"
            min="1"
            value={multiplier}
            onChange={e => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: 60, marginLeft: 8 }}
          />
          <span className="text-muted" style={{ marginLeft: 8 }}>台</span>
        </div>
      </div>

      {/* 库存对比汇总 */}
      <div className="checkout-summary">
        <span>共 {totalKinds} 种零件</span>
        <span className="text-success">充足 {sufficientCount}</span>
        {insufficientCount > 0 && (
          <span className="text-danger">⚠️ 不足 {insufficientCount} 种</span>
        )}
      </div>

      {/* 库存对比表 */}
      <div className="table-wrapper">
        <table className="table checkout-table">
          <thead>
            <tr>
              <th>零件名称</th>
              <th>型号</th>
              <th>已有库存</th>
              <th>需要 (×{multiplier})</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.bomItem.id} className={!row.sufficient ? 'row-danger' : ''}>
                <td>
                  <span
                    className="link"
                    onClick={() => navigate(`/parts/${row.part?.id}`)}
                  >
                    {row.partName}
                  </span>
                </td>
                <td className="text-muted">{row.modelNumber}</td>
                <td className={row.stockQty === 0 ? 'text-muted' : ''}>
                  {row.stockQty}
                </td>
                <td>
                  <strong>{row.needQty}</strong>
                  {row.unitQty > 0 && (
                    <span className="text-muted"> ({row.unitQty}/台)</span>
                  )}
                </td>
                <td>
                  {row.sufficient ? (
                    <span className="badge badge-success">✅ 充足</span>
                  ) : (
                    <span className="badge badge-danger">
                      ❌ 缺 {row.shortage}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 操作员和备注 */}
      <div className="form-group">
        <label>操作人</label>
        <input
          type="text"
          className="input"
          value={operator}
          onChange={e => setOperator(e.target.value)}
          placeholder="我"
        />
      </div>
      <div className="form-group">
        <label>备注</label>
        <input
          type="text"
          className="input"
          value={remark}
          onChange={e => setRemark(e.target.value)}
          placeholder={`BOM ${bom.name} ×${multiplier} 批量出库`}
        />
      </div>

      {/* 操作按钮 */}
      <div className="form-actions">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleCheckout}
          disabled={checkingOut || rows.length === 0}
        >
          {checkingOut ? '出库中...' : `🚀 确认出库（${rows.length} 种零件）`}
        </button>
      </div>

      <style>{`
        .multiplier-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-outline {
          background: #fff;
          border: 2px solid #d1d5db;
          color: #374151;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-outline:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }
        .checkout-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 14px;
          flex-wrap: wrap;
        }
        .checkout-table th, .checkout-table td {
          white-space: nowrap;
        }
        .row-danger {
          background: #fef2f2;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .link {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        .btn-lg {
          padding: 12px 24px;
          font-size: 16px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}