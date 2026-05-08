import { useState, useEffect, useMemo, useRef } from 'react';
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

  // 照片状态
  const [imagePreview, setImagePreview] = useState<string | null>(null); // 本地预览 (dataURL)
  const [imageFile, setImageFile] = useState<File | null>(null);          // 待上传的文件
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null); // 已保存的照片 URL
  const [imageChanged, setImageChanged] = useState(false);                // 照片是否被改动
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // 构建位置树（用于分组下拉）
  const locationTree = useMemo(() => {
    const roots: Location[] = [];
    const childrenMap = new Map<string, Location[]>();

    for (const loc of locations) {
      if (loc.parent_id) {
        const list = childrenMap.get(loc.parent_id) || [];
        list.push(loc);
        childrenMap.set(loc.parent_id, list);
      } else {
        roots.push(loc);
      }
    }
    return { roots, childrenMap };
  }, [locations]);

  // 递归收集子树中的所有位置 ID
  function collectSubtreeIds(parentId: string): Set<string> {
    const ids = new Set<string>();
    ids.add(parentId);
    const children = locationTree.childrenMap.get(parentId) || [];
    for (const child of children) {
      for (const id of collectSubtreeIds(child.id)) {
        ids.add(id);
      }
    }
    return ids;
  }

  // 递归渲染位置选项（带缩进）
  function renderLocationOptions(parentId: string, depth: number): JSX.Element[] {
    const children = locationTree.childrenMap.get(parentId) || [];
    const result: JSX.Element[] = [];
    for (const child of children) {
      const indent = '\u00A0\u00A0'.repeat(depth);
      const hasChildren =
        locationTree.childrenMap.has(child.id) &&
        (locationTree.childrenMap.get(child.id)!.length > 0);
      result.push(
        <option key={child.id} value={child.id}>
          {indent}{hasChildren ? '📁' : '📍'} {child.code}
          {child.label ? ` - ${child.label}` : ''}
        </option>
      );
      result.push(...renderLocationOptions(child.id, depth + 1));
    }
    return result;
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
      // 加载已有照片
      if (data.image_url) {
        setExistingImageUrl(data.image_url);
        setImagePreview(data.image_url); // 用 URL 做预览
      }
    }
  }

  // 选择照片（相册）
  function handleSelectPhoto() {
    fileInputRef.current?.click();
  }

  // 拍照
  function handleTakePhoto() {
    cameraInputRef.current?.click();
  }

  // 处理文件选择
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setToast('请选择图片文件');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast('图片大小不能超过 5MB');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    // 生成预览
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setImageFile(file);
    setImageChanged(true);
  }

  // 清除照片
  function handleRemovePhoto() {
    setImagePreview(null);
    setImageFile(null);
    setExistingImageUrl(null);
    setImageChanged(true);
  }

  // 上传照片到 Supabase Storage
  // 返回 public URL 或 null
  async function uploadImage(partId: string): Promise<string | null> {
    if (!imageFile) {
      // 如果清除了照片（imageChanged && !imageFile && !imagePreview）
      if (imageChanged && !imagePreview) {
        // 删除旧照片
        if (existingImageUrl) {
          const oldPath = existingImageUrl.split('/').slice(-2).join('/');
          await supabase.storage.from('parts-images').remove([oldPath]);
        }
        return null;
      }
      // 没有改动 -> 保留原有 URL
      return existingImageUrl;
    }

    // 删除旧照片（如果存在）
    if (existingImageUrl) {
      const oldPath = existingImageUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('parts-images').remove([oldPath]);
    }

    // 上传新照片: 文件路径为 {partId}.{ext}
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const filePath = `${partId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('parts-images')
      .upload(filePath, imageFile, { upsert: true });

    if (uploadErr) {
      throw new Error('照片上传失败: ' + uploadErr.message);
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('parts-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setToast('零件名称不能为空');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // 先保存零件（如果有照片改动需要先有 part ID）
      if (!isEdit) {
        // 新建零件：先插入拿到 ID，再上传照片
        const { data: newPart, error: insertErr } = await supabase
          .from('parts')
          .insert({
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertErr) throw new Error(insertErr.message);
        const partId = newPart!.id;

        // 上传照片
        if (imageFile) {
          const photoUrl = await uploadImage(partId);
          if (photoUrl) {
            await supabase.from('parts').update({ image_url: photoUrl }).eq('id', partId);
          }
        }
      } else {
        // 编辑零件
        const { error: updateErr } = await supabase
          .from('parts')
          .update({
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
          })
          .eq('id', id!);

        if (updateErr) throw new Error(updateErr.message);

        // 上传照片（如果有改动）
        if (imageChanged) {
          const photoUrl = await uploadImage(id!);
          await supabase.from('parts').update({ image_url: photoUrl }).eq('id', id!);
        }
      }

      setToast(isEdit ? '✅ 修改已保存' : '✅ 零件已添加');
      setTimeout(() => {
        navigate(-1);
      }, 800);
    } catch (err: any) {
      setToast('保存失败: ' + err.message);
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  // 供位置下拉过滤非顶级节点直接选中的辅助变量
  // （保留 unused 的 collectSubtreeIds 供后续扩展）

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
        {/* 照片上传区域 */}
        <div className="photo-upload-area">
          <label className="form-label">照片</label>
          <div className={`photo-preview ${uploading ? 'photo-uploading' : ''}`}>
            {imagePreview ? (
              <img src={imagePreview} alt="零件照片" />
            ) : (
              <span className="placeholder">📷</span>
            )}
          </div>
          <div className="photo-actions">
            <button
              type="button"
              className="btn"
              style={{ background: '#e3f2fd', color: '#1565c0' }}
              onClick={handleSelectPhoto}
              disabled={uploading}
            >
              🖼️ 相册
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: '#e8f5e9', color: '#2e7d32' }}
              onClick={handleTakePhoto}
              disabled={uploading}
            >
              📸 拍照
            </button>
            {imagePreview && (
              <button
                type="button"
                className="btn"
                style={{ background: '#ffebee', color: '#c62828' }}
                onClick={handleRemovePhoto}
                disabled={uploading}
              >
                🗑️ 删除
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

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
            {locationTree.roots.map((root) => (
              <optgroup key={root.id} label={`🏢 ${root.label || root.code}`}>
                <option value={root.id}>
                  {'\u00A0\u00A0'}📁 {root.code}（根位置）
                </option>
                {renderLocationOptions(root.id, 2)}
              </optgroup>
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
            {uploading ? '上传照片中...' : loading ? '保存中...' : isEdit ? '💾 保存修改' : '➕ 添加零件'}
          </button>
        </div>
      </form>
    </div>
  );
}