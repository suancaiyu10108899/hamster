-- ============================================================
-- Hamster 仓管系统 - 补充缺失列
-- 状态：✅ 已于 2026-05-06 执行完成
-- 执行方式：打开 Supabase Dashboard → SQL Editor → 粘贴运行
-- 归档说明：此 SQL 已执行，保留用于参考/回滚
-- ============================================================

-- 1. purchases 表补列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'paid_by') THEN
        ALTER TABLE purchases ADD COLUMN paid_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'purchase_intent') THEN
        ALTER TABLE purchases ADD COLUMN purchase_intent TEXT DEFAULT '采购';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'reimbursed') THEN
        ALTER TABLE purchases ADD COLUMN reimbursed BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'total_amount') THEN
        ALTER TABLE purchases ADD COLUMN total_amount DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchases' AND column_name = 'remark') THEN
        ALTER TABLE purchases ADD COLUMN remark TEXT;
    END IF;
END $$;

-- 2. purchase_items 表补列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'link') THEN
        ALTER TABLE purchase_items ADD COLUMN link TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'part_name') THEN
        ALTER TABLE purchase_items ADD COLUMN part_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'unit_price') THEN
        ALTER TABLE purchase_items ADD COLUMN unit_price DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'subtotal') THEN
        ALTER TABLE purchase_items ADD COLUMN subtotal DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'sort_order') THEN
        ALTER TABLE purchase_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. 刷新 PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchases' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_items' 
ORDER BY ordinal_position;