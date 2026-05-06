import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Purchase, PurchaseItem } from '../types';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // 采购主表表单
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [purchaseIntent, setPurchaseIntent] = useState('采购');
  const [remark, setRemark] = useState('');

  // 采购行项目列表（在表单内管理）
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const [submitting, setSubmitting] = useState(false);

  interface DraftItem {
    key: number;
    partName: string;
    quantity: number;
    unitPrice: string;
    link: string;
  }

  useEffect(() => {
    loadPurchases();
  }, []);

  async function loadPurchases() {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchases')
      .select('*, items:purchase_items(*)')
      .order('purchase_date', { ascending: false });

    if (!error && data) {
      setPurchases(data as Purchase[]);
    }
    setLoading(false);
  }

  function resetForm() {
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaidBy('');
    setPurchaseIntent('采购');
    setRemark('');
    setDraftItems([{ key: Date.now(), partName: '', quantity: 1, unitPrice: '', link: '' }]);
  }

  function addDraftItem() {
    setDraftItems((prev) => [
      ...prev,
      { key: Date.now() + Math.random(), partName: '', quantity: 1, unitPrice: '', link: '' },
    ]);
  }

  function removeDraftItem(key: number) {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateDraftItem(key: number, field: keyof DraftItem, value: string | number) {
    setDraftItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }

  // 计算总金额
  const totalFromDraft = draftItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice) || 0;
    return sum + price * item.quantity;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const op = localStorage.getItem('hamster_operator') || '我';

    // 验证至少一个行项目
    const validItems = draftItems.filter((item) => item.partName.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      setToast('请至少填写一个采购项目');
      setTimeout(() => setToast(''), 2000);
      setSubmitting(false);
      return;
    }

    // 创建采购主记录
    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .insert({
        purchase_date: purchaseDate,
        total_amount: totalFromDraft || null,
        paid_by: paidBy || null,
        purchase_intent: purchaseIntent || '采购',
        remark: remark || null,
        operator: op,
      })
      .select()
      .single();

    if (purchaseErr) {
      setToast(`创建失败: ${purchaseErr.message}`);
      setTimeout(() => setToast(''), 2000);
      setSubmitting(false);
      return;
    }

    // 创建行项目
    const itemsToInsert = validItems.map((item) => ({
      purchase_id: purchase.id,
      part_name: item.partName.trim(),
      quantity: item.quantity,
      unit_price: item.unitPrice ? parseFloat(item.unitPrice) : null,
      subtotal: item.unitPrice ? parseFloat(item.unitPrice) * item.quantity : null,
      link: item.link || null,
    }));

    const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);
    if (itemsErr) {
      setToast(`行项目保存失败: ${itemsErr.message}`);
      setTimeout(() => setToast(''), 2000);
    } else {
      setToast('采购记录已添加');
      setTimeout(() => setToast(''), 2000);
      setShowForm(false);
      resetForm();
      loadPurchases();
    }

    setSubmitting(false);
  }

  async function toggleReimbursed(p: Purchase) {
    const { error } = await supabase
      .from('purchases')
      .update({ reimbursed: !p.reimbursed })
      .eq('id', p.id);
    if (!error) loadPurchases();
  }

  async function deletePurchase(id: string) {
    if (!confirm('确定删除这条采购记录吗？')) return;
    await supabase.from('purchases').delete().eq('id', id);
    loadPurchases();
  }

  async function deletePurchaseItem(itemId: string) {
    if (!confirm('确定删除这个采购项目吗？')) return;
    await supabase.from('purchase_items').delete().eq('id', itemId);
    loadPurchases();
  }

  const totalUnreimbursed = purchases
    .filter((p) => !p.reimbursed)
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  return (
    <div className="page">
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <h1>💰 采购记录</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              resetForm();
            }
          }}
        >
          {showForm ? '取消' : '+ 添加'}
        </button>
      </div>

      {/* 统计摘要 */}
      {!showForm && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#888' }}>
            共 <b>{purchases.length}</b> 笔
          </div>
          {totalUnreimbursed > 0 && (
            <div style={{ fontSize: 13, color: '#ff9800' }}>
              待报销 <b>¥{totalUnreimbursed.toFixed(2)}</b>
            </div>
          )}
        </div>
      )}

      {/* 添加表单 */}
      {showForm && (
        <div style={{ padding: '0 16px 16px' }}>
          <form onSubmit={handleSubmit}>
            <label className="form-label">采购日期</label>
            <input
              type="date"
              className="form-input"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />

            <label className="form-label" style={{ marginTop: 8 }}>垫付人</label>
            <input
              type="text"
              className="form-input"
              placeholder="谁先付的钱（可选）"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            />

            <label className="form-label" style={{ marginTop: 8 }}>采购类型</label>
            <select
              className="form-select"
              value={purchaseIntent}
              onChange={(e) => setPurchaseIntent(e.target.value)}
            >
              <option value="采购">采购</option>
              <option value="翻出来的旧零件">翻出来的旧零件</option>
              <option value="其他组给的">其他组给的</option>
              <option value="其他">其他</option>
            </select>

            <label className="form-label" style={{ marginTop: 8 }}>备注</label>
            <textarea
              className="form-textarea"
              style={{ height: 60 }}
              placeholder="比如：淘宝统一购买、XX比赛准备..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />

            {/* 采购项目 */}
            <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>采购项目</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#e3f2fd', color: '#1976d2', fontSize: 12 }}
                  onClick={addDraftItem}
                >
                  + 添加项目
                </button>
              </div>

              {draftItems.map((item, idx) => (
                <div
                  key={item.key}
                  style={{
                    background: '#fafafa',
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 8,
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#999', width: 20 }}>#{idx + 1}</span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, marginBottom: 0 }}
                      placeholder="零件名称 *"
                      value={item.partName}
                      onChange={(e) => updateDraftItem(item.key, 'partName', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    />
                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDraftItem(item.key)}
                        style={{
                          marginLeft: 4,
                          background: 'none',
                          border: 'none',
                          color: '#f44336',
                          fontSize: 16,
                          cursor: 'pointer',
                          padding: '0 4px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#999' }}>数量</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateDraftItem(item.key, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: '#999' }}>单价</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        step="0.01"
                        placeholder="可选"
                        value={item.unitPrice}
                        onChange={(e) => updateDraftItem(item.key, 'unitPrice', e.target.value)}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ marginBottom: 0, marginTop: 4 }}
                    placeholder="购买链接（可选）"
                    value={item.link}
                    onChange={(e) => updateDraftItem(item.key, 'link', e.target.value)}
                  />
                </div>
              ))}
              {draftItems.length > 0 && (
                <div style={{ fontSize: 12, color: '#888', textAlign: 'right', marginTop: 4 }}>
                  合计：<b>¥{totalFromDraft.toFixed(2)}</b>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
              style={{ marginTop: 12 }}
            >
              {submitting ? '提交中...' : '✅ 添加采购记录'}
            </button>
          </form>
        </div>
      )}

      {/* 列表 */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#999', padding: 32 }}>加载中...</p>
        ) : purchases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>暂无采购记录</p>
            <p style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>点击"+ 添加"记录一笔采购</p>
          </div>
        ) : (
          purchases.map((p) => {
            const isExpanded = expandedId === p.id;
            const items = (p.items || []) as PurchaseItem[];
            return (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 8,
                  border: '1px solid #f0f0f0',
                  opacity: p.reimbursed ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: items.length > 0 ? 'pointer' : 'default' }}
                    onClick={() => items.length > 0 && setExpandedId(isExpanded ? null : p.id)}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{p.remark || '采购记录'}</span>
                      {p.purchase_intent && p.purchase_intent !== '采购' && (
                        <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1976d2', padding: '1px 6px', borderRadius: 10 }}>
                          {p.purchase_intent}
                        </span>
                      )}
                      {p.reimbursed && (
                        <span style={{ fontSize: 11, color: '#4caf50' }}>✅ 已报销</span>
                      )}
                      {items.length > 0 && (
                        <span style={{ fontSize: 11, color: '#999' }}>
                          {isExpanded ? '▲' : '▼'} {items.length}项
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {p.purchase_date} · {p.operator}
                      {p.paid_by ? ` · 垫付：${p.paid_by}` : ''}
                      {p.total_amount ? ` · ¥${Number(p.total_amount).toFixed(2)}` : ''}
                    </div>
                    {/* 未展开时显示前两个项目摘要 */}
                    {!isExpanded && items.length > 0 && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {items.slice(0, 2).map((item) => (
                          <span key={item.id} style={{ marginRight: 12 }}>
                            {item.part_name} ×{item.quantity}
                            {item.unit_price ? ` ¥${Number(item.unit_price).toFixed(2)}` : ''}
                          </span>
                        ))}
                        {items.length > 2 && <span style={{ color: '#999' }}>...</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      onClick={() => toggleReimbursed(p)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: 'none',
                        background: p.reimbursed ? '#ff9800' : '#4caf50',
                        color: '#fff',
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.reimbursed ? '撤销' : '报销'}
                    </button>
                    <button
                      onClick={() => deletePurchase(p.id)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: 'none',
                        background: 'transparent',
                        color: '#ccc',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 展开的行项目明细 */}
                {isExpanded && items.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          fontSize: 13,
                          padding: '4px 0',
                          borderBottom: idx < items.length - 1 ? '1px solid #fafafa' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 500 }}>{item.part_name}</span>
                          <span style={{ color: '#999', marginLeft: 8 }}>
                            ×{item.quantity}
                          </span>
                          {item.unit_price && (
                            <span style={{ color: '#999', marginLeft: 8 }}>
                              ¥{Number(item.unit_price).toFixed(2)}/个
                            </span>
                          )}
                          {item.subtotal && (
                            <span style={{ color: '#ff9800', marginLeft: 8, fontWeight: 500 }}>
                              ¥{Number(item.subtotal).toFixed(2)}
                            </span>
                          )}
                          {item.link && (
                            <div style={{ marginTop: 2 }}>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2196f3', fontSize: 11, wordBreak: 'break-all' }}
                              >
                                🔗 {item.link}
                              </a>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deletePurchaseItem(item.id)}
                          style={{
                            marginLeft: 8,
                            background: 'none',
                            border: 'none',
                            color: '#ccc',
                            fontSize: 14,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title="删除此项目"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}