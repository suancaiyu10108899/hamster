import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Part, Category, Location } from '@/types';
import { getLocationPath } from '@/lib/helpers';

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('个');
  const [supplier, setSupplier] = useState('');
  const [barcode, setBarcode] = useState('');
  const [remark, setRemark] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadOptions();
    if (isEdit && id) {
      loadPart(id);
    }
  }, [id]);

  async function loadOptions() {
    const [{ data: catData }, { data: locData }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('locations').select('*').order('sort_order'),
    ]);
    if (catData) setCategories(catData);
    if (locData) setLocations(locData);
  }

  async function loadPart(partId: string) {
    const { data } = await supabase
      .from('parts')
      .select('*')
      .eq('id', partId)
      .single();

    if (data) {
      setName(data.name || '');
      setModelNumber(data.model_number || '');
      setCategoryId(data.category_id || '');
      setLocationId(data.location_id || '');
      setQuantity(data.quantity || 0);
      setMinQuantity(data.min_quantity ?? '');
      setUnit(data.unit || '个');
      setSupplier(data.supplier || '');
      setBarcode(data.barcode || '');
      setRemark(data.remark || '');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setToast('零件名称不能为空');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      model_number: modelNumber.trim() || null,
      category_id: categoryId || null,
      location_id: locationId || null,
      quantity,
      min_quantity: minQuantity === '' ? null : minQuantity,
      unit: unit.trim() || '个',
      supplier: supplier.trim() || null,
      barcode: barcode.trim() || null,
      remark: remark.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error: Error | null = null;

    if (isEdit && id) {
      const { error: err } = await supabase
        .from('parts')
        .update(payload)
        .eq('id', id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('parts')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
      error = err;
    }

    setLoading(false);

    if (error) {
      setToast('保存失败: ' + error.message);
      setTimeout(() => setToast(''), 2000);
    } else {
      navigate(-1);
    }
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      {toast && <div className="toast">{toast}</div>}

      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>
          {isEdit ? '编辑零件' : '添加零件'}
        </h1>
        <div style={{ width: 40 }} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 16px' }}>
        <div className="form-group">
          <label className="form-label">名称 *</label>
          <input
            className="form-input"
            type="text"
            placeholder="零件名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">型号 / 规格</label>
          <input
            className="form-input"
            type="text"
            placeholder="如: M3×12 / FF-12 / 6204"
            value={modelNumber}
            onChange={(e) => setModelNumber(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">分类</label>
          <select
            className="form-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">选择分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">存放位置</label>
          <select
            className="form-select"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">选择位置</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {getLocationPath(l, locations)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">当前库存</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">单位</label>
            <input
              className="form-input"
              type="text"
              placeholder="个/套/包/m..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">最低库存（可选，低于此数会高亮提醒）</label>
          <input
            className="form-input"
            type="number"
            min={0}
            placeholder="不设下限留空"
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">厂家</label>
          <input
            className="form-input"
            type="text"
            placeholder="供应商 / 购买渠道"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">条码</label>
          <input
            className="form-input"
            type="text"
            placeholder="物料条码（可选）"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            placeholder="自定义参数、规格、批注...\n例：M3x10 内六角 / 工作电压 12V"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div style={{ padding: '16px 0' }}>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? '保存中...' : isEdit ? '💾 保存修改' : '➕ 添加零件'}
          </button>
        </div>
      </form>
    </div>
  );
}