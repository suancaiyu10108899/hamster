# 零件照片功能

**日期**: 2026-05-08
**类型**: Feature
**关联需求**: 零件照片上传与展示

---

## 背景

之前零件表单和详情页没有照片支持，用户无法直观区分零件。手机上可调用相机/相册，上传到 Supabase Storage 并展示在列表和详情页。

## 实现内容

### 1. 数据库与存储

- Supabase Storage Bucket `parts-images`（公开可读，由 RLS 控制上传/删除）
- 迁移脚本: `supabase/migrations/006-storage-parts-images.sql`
- `parts.image_url TEXT` 字段在 `setup-all.sql` 已存在，无需额外迁移

### 2. PartFormPage 照片上传

- 相册选择 (accept="image/*")
- 拍照 (capture="environment")
- 图片预览（本地 FileReader / 已有 URL）
- 验证：仅图片格式、最大 5MB
- 上传到 Storage，文件路径 `{partId}.{ext}`
- 编辑时可删除照片、替换照片（旧照片自动清理）

### 3. PartDetailPage 显示照片

- 照片展示在库存卡片上方，点击可新窗口打开原图

### 4. PartsPage 列表缩略图

- 有照片显示缩略图（`.part-card-thumb`），无照片显示默认 emoji

### 5. CSS 样式补充

- `photo-upload-area`、`photo-preview`、`photo-actions`
- `detail-photo` (详情页大图)
- `part-card-thumb` (列表缩略图)

## 技术要点

- 新建零件时先 INSERT 获得 ID，再上传照片到 `{id}.{ext}`，最后 UPDATE `image_url`
- 编辑时如更换/删除照片，先删除 Storage 中的旧文件再上传新文件
- 使用 `supabase.storage.from('parts-images').getPublicUrl(path)` 获得公开 URL
- `parts-images` bucket 设为 public（需要手动在 Supabase Dashboard 中确认）

## 影响范围

| 文件 | 变更 |
|------|------|
| `src/pages/PartFormPage.tsx` | 新增照片上传区域、拍照/相册/删除按钮、storage 上传逻辑 |
| `src/pages/PartDetailPage.tsx` | 新增照片展示区块 |
| `src/pages/PartsPage.tsx` | 列表卡片支持缩略图 |
| `src/App.css` | 新增照片相关样式 |
| `supabase/migrations/006-storage-parts-images.sql` | 新建迁移脚本 |

## 后续工作

- 照片压缩（超过阈值自动缩尺寸）
- 多图支持（目前仅单张）
- 导入/导出时照片处理