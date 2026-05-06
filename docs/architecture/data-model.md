# Hamster 数据模型设计

> 创建日期：2026-05-03
> 最后更新：2026-05-04（追加采购表、替代组表）
>
> 状态：初稿

---

## 一、实体关系图（ER）

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  categories  │       │    parts     │       │custom_fields │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │──┐    │ id (PK)      │
│ name         │  │    │ name         │  │    │ part_id (FK) │
│ parent_id ←──┘│    │ category_id ←┘  │    │ field_name   │
│ sort_order   │  │    │ quantity      │  │    │ field_value  │
│ created_at   │  │    │ min_quantity  │  │    │ field_type   │
└──────────────┘  │    │ unit          │  │    │ sort_order   │
                  │    │ location      │  │    └──────────────┘
                  │    │ barcode       │  │
                  │    │ image_url     │  │
                  │    │ remark        │  │    ┌──────────────┐
                  │    │ supplier      │  │    │ transactions │
                  │    │ created_at    │  │    ├──────────────┤
                  │    │ updated_at    │  │    │ id (PK)      │
                  │    └──────────────┘  │    │ part_id (FK) │
                  │                      └────│ type         │
                  │                           │ quantity     │
                  │                           │ operator     │
                  │                           │ remark       │
                  │                           │ created_at   │
                  │                           └──────────────┘
                  │
                  │    ┌──────────────┐       ┌──────────────┐
                  │    │  locations   │       │  purchases   │ (P1)
                  │    ├──────────────┤       ├──────────────┤
                  └───→│ id (PK)      │       │ id (PK)      │
                       │ code         │       │ purchase_date│
                       │ label        │       │ total_amount │
                       │ parent_id    │       │ link         │
                       │ sort_order   │       │ operator     │←──┐
                       └──────────────┘       └──────────────┘   │
                                                        ↑        │
                                              ┌──────────────┐   │
                                              │purchase_items│   │
                                              ├──────────────┤   │
                                              │ id (PK)      │   │
                                              │ purchase_id ─┘   │
                                              │ part_id (FK) │   │
                                              │ quantity     │   │
                                              │ unit_price   │   │
                                              │ subtotal     │   │
                                              └──────────────┘   │
                                                                  │
                       ┌──────────────┐       ┌──────────────┐   │
                       │ part_groups  │(P2)   │ pgm_members  │   │
                       ├──────────────┤       ├──────────────┤   │
                       │ id (PK)      │──┐    │ id (PK)      │   │
                       │ name         │  │    │ group_id(FK)─┘   │
                       │ description  │  └────│ part_id (FK) │   │
                       └──────────────┘       │ relationship │   │
                                              └──────────────┘   │
                                                                  │
                 ┌────────────────────────────────────────────────┘
                 │ 所有表都有 created_at 和 operator 字段
```

## 二、PostgreSQL 表结构（SQL）

### 2.1 categories（分类表）

```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                  -- 分类名
    parent_id   UUID REFERENCES categories(id), -- 父分类（NULL = 顶级）
    sort_order  INTEGER NOT NULL DEFAULT 0,     -- 排序
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_id)
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
```

**说明：**
- 自引用外键实现无限级树形结构
- `(name, parent_id)` 联合唯一，避免同级重名
- 排序由 `sort_order` 控制，前端可拖拽调整

### 2.2 locations（存放位置表）

```sql
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,             -- 位置编码（如"A-03-02"）
    label       TEXT,                              -- 显示标签（如"A架3层第2格"）
    parent_id   UUID REFERENCES locations(id),     -- 父位置（支持区域→货架→层→格）
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_code ON locations(code);
```

**说明：**
- 存放位置独立成表，方便管理和二维码关联
- 位置编码 `code` 无歧义，用于扫描关联
- 支持树形：仓库 → 区 → 架 → 层 → 格

### 2.3 parts（零件表）

```sql
CREATE TABLE parts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    category_id   UUID REFERENCES categories(id),
    quantity      INTEGER NOT NULL DEFAULT 0,
    min_quantity  INTEGER,
    unit          TEXT DEFAULT '个',
    location_id   UUID REFERENCES locations(id),
    model_number  TEXT,                           -- 型号 / 规格
    barcode       TEXT UNIQUE,
    image_url     TEXT,
    remark        TEXT,
    supplier      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_category ON parts(category_id);
CREATE INDEX idx_parts_location ON parts(location_id);
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_model_number ON parts(model_number);
CREATE INDEX idx_parts_barcode ON parts(barcode);
CREATE INDEX idx_parts_updated ON parts(updated_at DESC);
```

### 2.4 custom_fields（自定义字段表）— EAV 模式

```sql
CREATE TABLE custom_fields (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id     UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    field_name  TEXT NOT NULL,
    field_value TEXT,
    field_type  TEXT NOT NULL DEFAULT 'text',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_part_field UNIQUE (part_id, field_name)
);

CREATE INDEX idx_custom_fields_part ON custom_fields(part_id);
```

**说明：**
- EAV（Entity-Attribute-Value）模式
- 每个零件可以有任意多个自定义字段
- `(part_id, field_name)` 联合唯一
- 可配合分类模板：每种分类预设字段模板，新建零件时自动带出

### 2.5 transactions（出入库记录）

```sql
CREATE TABLE transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id     UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('in', 'out', 'scrap', 'adjust')),
    quantity    INTEGER NOT NULL,
    operator    TEXT NOT NULL DEFAULT '我',
    remark      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_part ON transactions(part_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
```

---

## 三、P1 功能追加表

### 3.1 purchases（采购记录表）

```sql
CREATE TABLE purchases (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount  DECIMAL(10,2),
    link          TEXT,
    remark        TEXT,
    operator      TEXT NOT NULL DEFAULT '我',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 purchase_items（采购明细表）

```sql
CREATE TABLE purchase_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    part_id     UUID NOT NULL REFERENCES parts(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2),
    subtotal    DECIMAL(10,2),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_part ON purchase_items(part_id);
```

**采购入库流程：**
1. 用户在前端填写采购详情（逐行加零件、数量、单价）
2. 提交时：创建 `purchases` 记录 → 批量创建 `purchase_items`
3. 系统为每个 `purchase_item` 自动创建一条 `transactions(type='in')` 记录
4. 触发库存更新（Supabase Edge Function 或应用层事务）

---

## 四、P2 功能追加表

### 4.1 part_groups（零件替代组）

```sql
CREATE TABLE part_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 part_group_members（替代组成员）

```sql
CREATE TABLE part_group_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID NOT NULL REFERENCES part_groups(id) ON DELETE CASCADE,
    part_id       UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    relationship  TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_group_part UNIQUE (group_id, part_id)
);

CREATE INDEX idx_pgm_group ON part_group_members(group_id);
CREATE INDEX idx_pgm_part ON part_group_members(part_id);
```

**替代组使用场景：**
- 一个替代组可有多个零件（如"小扭矩舵机"下有 SG90、MG90S、ES08MA）
- 一个零件可属于多个替代组
- 浏览某零件详情时，侧边列出组内其他零件及库存、替代说明

---

## 五、数据约束与业务规则

### 5.1 库存一致性
- 零件的 `quantity` = 该零件所有 `transactions` 的汇总
- 不直接修改 `parts.quantity`，通过创建 `transactions` 记录触发
- 使用 Supabase RLS + Edge Function 保证原子性

### 5.2 删除策略
- 零件删除：关联的 `custom_fields`、`transactions`、`purchase_items`、`part_group_members` 级联删除
- 分类删除前：应用层校验无零件归属
- 位置删除前：应用层校验无零件归属

### 5.3 唯一性约束
- 分类：同级不允许同名
- 零件条码：全局唯一（允许 NULL）
- 位置编码：全局唯一
- 自定义字段：同零件内不允许同名字段
- 替代组名称：全局唯一
- 替代组成员：同组内不允许重复零件

### 5.4 视图

```sql
-- 库存预警视图
CREATE VIEW low_stock_parts AS
SELECT *
FROM parts
WHERE min_quantity IS NOT NULL 
  AND quantity <= min_quantity
ORDER BY (min_quantity - quantity) DESC;
```

---

## 六、Supabase Realtime 配置

需要启用实时推送的表：
- `parts` — 库存变化
- `transactions` — 新操作记录

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE parts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

---

## 七、RESTful API 映射（Supabase 自动生成）

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取所有零件 | GET | `/rest/v1/parts?select=*,categories(name),locations(code,label)` | |
| 获取单个零件 | GET | `/rest/v1/parts?id=eq.{id}&select=*,custom_fields(*),transactions(*)` | |
| 创建零件 | POST | `/rest/v1/parts` | |
| 更新零件 | PATCH | `/rest/v1/parts?id=eq.{id}` | |
| 删除零件 | DELETE | `/rest/v1/parts?id=eq.{id}` | |
| 入库/出库 | POST | `/rest/v1/transactions` | 配合应用层逻辑 |
| 搜索零件 | GET | `/rest/v1/parts?or=(name.ilike.*{keyword},remark.ilike.*{keyword})` | |
| 采购入库 | POST | `/rest/v1/rpc/checkout_purchase` | Edge Function 原子写入 |

---

## 八、完整表清单（总计 9 张）

| 序号 | 表名 | 优先级 | 说明 |
|------|------|:--:|------|
| 1 | categories | P0 | 分类树 |
| 2 | locations | P0 | 存放位置 |
| 3 | parts | P0 | 零件主表 |
| 4 | custom_fields | P0 | 自定义字段（EAV） |
| 5 | transactions | P0 | 出入库记录 |
| 6 | purchases | P1 | 采购记录 |
| 7 | purchase_items | P1 | 采购明细 |
| 8 | part_groups | P2 | 替代组 |
| 9 | part_group_members | P2 | 替代组成员 |