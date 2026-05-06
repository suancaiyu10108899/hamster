-- ============================================================
-- Hamster 仓管系统 - 数据库初始化脚本
-- 使用方法：Supabase Dashboard → SQL Editor → 新建查询 → 粘贴全部 → 执行
-- ============================================================

-- ============================================================
-- 第一部分：建表
-- ============================================================

-- 1. 分类表
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES categories(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_id)
);

-- 2. 存放位置表
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    label       TEXT,
    parent_id   UUID REFERENCES locations(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 零件表
CREATE TABLE IF NOT EXISTS parts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    model_number  TEXT,
    category_id   UUID REFERENCES categories(id),
    quantity      INTEGER NOT NULL DEFAULT 0,
    min_quantity  INTEGER,
    unit          TEXT DEFAULT '个',
    location_id   UUID REFERENCES locations(id),
    barcode       TEXT UNIQUE,
    image_url     TEXT,
    remark        TEXT,
    supplier      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 自定义字段表（EAV）
CREATE TABLE IF NOT EXISTS custom_fields (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id     UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    field_name  TEXT NOT NULL,
    field_value TEXT,
    field_type  TEXT NOT NULL DEFAULT 'text',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_part_field UNIQUE (part_id, field_name)
);

-- 5. 出入库记录表
CREATE TABLE IF NOT EXISTS transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id     UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('in', 'out', 'scrap', 'adjust')),
    quantity    INTEGER NOT NULL,
    operator    TEXT NOT NULL DEFAULT '我',
    remark      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 采购记录主表
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

-- 7. 采购明细表
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

-- ============================================================
-- 第二部分：索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);

CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category_id);
CREATE INDEX IF NOT EXISTS idx_parts_location ON parts(location_id);
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);
CREATE INDEX IF NOT EXISTS idx_parts_model_number ON parts(model_number);
CREATE INDEX IF NOT EXISTS idx_parts_barcode ON parts(barcode);
CREATE INDEX IF NOT EXISTS idx_parts_updated ON parts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_fields_part ON custom_fields(part_id);

CREATE INDEX IF NOT EXISTS idx_transactions_part ON transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ============================================================
-- 第三部分：RLS 策略（允许匿名读写）
-- 说明：2人内部使用，不需要登录。所有操作公开。
-- ============================================================

-- 为所有表启用 RLS，然后创建允许所有操作的策略

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON categories;
CREATE POLICY "anon_all" ON categories FOR ALL USING (true) WITH CHECK (true);

-- locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON locations;
CREATE POLICY "anon_all" ON locations FOR ALL USING (true) WITH CHECK (true);

-- parts
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON parts;
CREATE POLICY "anon_all" ON parts FOR ALL USING (true) WITH CHECK (true);

-- custom_fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON custom_fields;
CREATE POLICY "anon_all" ON custom_fields FOR ALL USING (true) WITH CHECK (true);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON transactions;
CREATE POLICY "anon_all" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 第四部分：Realtime 实时推送
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE parts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_items;

-- purchases RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchases;
CREATE POLICY "anon_all" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- purchase_items RLS
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON purchase_items;
CREATE POLICY "anon_all" ON purchase_items FOR ALL USING (true) WITH CHECK (true);

-- 采购表索引
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_operator ON purchases(operator);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_part ON purchase_items(part_id);

-- ============================================================
-- 第五部分：预置数据
-- ============================================================

-- 预置分类（顶级）
INSERT INTO categories (name, parent_id, sort_order)
SELECT '紧固件', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '紧固件' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '电子元件', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '电子元件' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '电机', NULL, 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '电机' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '传感器', NULL, 3
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '传感器' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '线材', NULL, 4
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '线材' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '结构件', NULL, 5
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '结构件' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '工具', NULL, 6
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '工具' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '耗材', NULL, 7
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '耗材' AND parent_id IS NULL);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '其他', NULL, 8
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '其他' AND parent_id IS NULL);

-- 预置二级分类（示例）
INSERT INTO categories (name, parent_id, sort_order)
SELECT '螺丝', id, 0 FROM categories WHERE name = '紧固件' AND parent_id IS NULL
AND NOT EXISTS (SELECT 1 FROM categories c JOIN categories p ON c.parent_id = p.id WHERE c.name = '螺丝' AND p.name = '紧固件');

INSERT INTO categories (name, parent_id, sort_order)
SELECT '螺母', id, 1 FROM categories WHERE name = '紧固件' AND parent_id IS NULL
AND NOT EXISTS (SELECT 1 FROM categories c JOIN categories p ON c.parent_id = p.id WHERE c.name = '螺母' AND p.name = '紧固件');

INSERT INTO categories (name, parent_id, sort_order)
SELECT '垫片', id, 2 FROM categories WHERE name = '紧固件' AND parent_id IS NULL
AND NOT EXISTS (SELECT 1 FROM categories c JOIN categories p ON c.parent_id = p.id WHERE c.name = '垫片' AND p.name = '紧固件');

-- ============================================================
-- 完成！
-- ============================================================
-- 执行后请验证：
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- 应该看到：categories, locations, parts, custom_fields, transactions
-- 
-- 然后返回命令行，我来继续修复代码和部署