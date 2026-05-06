-- ============================================================
-- Hamster 仓管系统 - 修复采购表 + 多级仓库支持
-- 创建日期：2026-05-06
-- ============================================================

-- 1. 检查并添加缺失列（paid_by）
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
END $$;

-- 2. purchase_items 添加 link 字段（每个采购项有自己的链接）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_items' AND column_name = 'link') THEN
        ALTER TABLE purchase_items ADD COLUMN link TEXT;
    END IF;
END $$;

-- 3. 如果 purchases 表不存在则创建（防御性）
CREATE TABLE IF NOT EXISTS purchases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount    DECIMAL(10,2),
    reimbursed      BOOLEAN NOT NULL DEFAULT false,
    paid_by         TEXT,
    purchase_intent TEXT DEFAULT '采购',
    remark          TEXT,
    operator        TEXT NOT NULL DEFAULT '我',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    part_id     UUID REFERENCES parts(id) ON DELETE SET NULL,
    part_name   TEXT NOT NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2),
    subtotal    DECIMAL(10,2),
    link        TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_operator ON purchases(operator);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_part ON purchase_items(part_id);

-- 5. RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchases;
CREATE POLICY "anon_all" ON purchases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchase_items;
CREATE POLICY "anon_all" ON purchase_items FOR ALL USING (true) WITH CHECK (true);

-- 6. locations 表添加 level 字段用于多级仓库排序
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'locations' AND column_name = 'level') THEN
        ALTER TABLE locations ADD COLUMN level INTEGER DEFAULT 0;
        -- 已有数据默认 level=0
    END IF;
END $$;