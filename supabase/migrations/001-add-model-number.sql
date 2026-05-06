-- Migration: 添加 model_number 字段到 parts 表
-- 为已有 Supabase 实例执行：
-- Supabase Dashboard → SQL Editor → 粘贴执行
ALTER TABLE parts ADD COLUMN IF NOT EXISTS model_number TEXT;
CREATE INDEX IF NOT EXISTS idx_parts_model_number ON parts(model_number);