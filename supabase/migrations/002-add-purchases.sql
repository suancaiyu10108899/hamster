-- ============================================================
-- Hamster 仓管系统 - 采购记录表
-- 创建日期：2026-05-06
-- ============================================================

-- 1. 采购记录主表
CREATE TABLE IF NOT EXISTS purchases (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount  DECIMAL(10,2),
    link          TEXT,                    -- 采购链接
    reimbursed    BOOLEAN NOT NULL DEFAULT false,  -- 是否已报销
    paid_by       TEXT,                    -- 垫付人
    remark        TEXT,
    operator      TEXT NOT NULL DEFAULT '我',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 采购明细表（每行对应一个零件）
CREATE TABLE IF NOT EXISTS purchase_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    part_id     UUID REFERENCES parts(id) ON DELETE SET NULL,
    part_name   TEXT NOT NULL,             -- 零件名称（冗余，防止零件被删后丢失信息）
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2),
    subtotal    DECIMAL(10,2),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_operator ON purchases(operator);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_part ON purchase_items(part_id);

-- 4. RLS 策略
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchases;
CREATE POLICY "anon_all" ON purchases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchase_items;
CREATE POLICY "anon_all" ON purchase_items FOR ALL USING (true) WITH CHECK (true);