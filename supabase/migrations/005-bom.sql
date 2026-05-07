-- ============================================================
-- BOM 模块（物料清单）
-- ============================================================

-- 1. BOM 模板表
CREATE TABLE IF NOT EXISTS boms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BOM 明细表
CREATE TABLE IF NOT EXISTS bom_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id      UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    part_id     UUID REFERENCES parts(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bom_part UNIQUE (bom_id, part_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_bom_items_bom ON bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_part ON bom_items(part_id);

-- RLS
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON boms;
CREATE POLICY "anon_all" ON boms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON bom_items;
CREATE POLICY "anon_all" ON bom_items FOR ALL USING (true) WITH CHECK (true);