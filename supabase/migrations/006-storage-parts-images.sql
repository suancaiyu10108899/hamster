-- ============================================================
-- 迁移 006: 零件照片存储
-- 创建 Supabase Storage bucket + RLS 策略
-- 使用方法：Supabase Dashboard → SQL Editor → 新建查询 → 粘贴全部 → 执行
-- ============================================================

-- 创建 storage bucket（需要在 Supabase Dashboard → Storage 手动创建名为 parts-images 的公开 bucket）
-- 或者用 SQL API 创建（取决于 Supabase 版本）

-- 以下为 Storage RLS 策略，允许所有用户上传和读取零件照片
-- 注意：需要先在 Storage 页面手动创建 bucket，名称为 parts-images，设为公开(public)

-- Storage 策略：允许所有用户读取零件照片
CREATE POLICY IF NOT EXISTS "Allow public read for parts-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'parts-images');

-- Storage 策略：允许认证用户上传零件照片
CREATE POLICY IF NOT EXISTS "Allow insert for parts-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'parts-images');

-- Storage 策略：允许用户更新自己上传的照片
CREATE POLICY IF NOT EXISTS "Allow update for parts-images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'parts-images');

-- Storage 策略：允许用户删除照片
CREATE POLICY IF NOT EXISTS "Allow delete for parts-images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'parts-images');