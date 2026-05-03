# Hamster 开发环境配置指南

> 创建日期：2026-05-03
>
> 适用范围：Phase 1 Web MVP 开发

---

## 一、环境概览

| 工具 | 用途 | 是否已安装 |
|------|------|-----------|
| Node.js 22 LTS | JS 运行时 | ❌ 待安装 |
| npm | 包管理 | Node.js 自带 |
| Git | 版本控制 | ✅ 已有 |
| VSCode | 代码编辑 | ✅ 已有 |
| Supabase 账号 | 后端/数据库 | ❌ 待注册 |
| Vercel 账号 | 前端部署 | ❌ 待注册 |

---

## 二、安装 Node.js

### Windows

```powershell
# 方法1：winget（推荐）
winget install OpenJS.NodeJS.LTS

# 方法2：官网下载
# https://nodejs.org/zh-cn/download
# 下载 LTS 版本（22.x），一键安装
```

### 验证安装

```bash
node --version  # 应显示 v22.x.x
npm --version   # 应显示 10.x.x
```

---

## 三、注册 Supabase

1. 打开 [supabase.com](https://supabase.com)
2. 点击 "Start your project" → 用 GitHub 账号登录
3. 创建新项目：
   - Name：`hamster`
   - Database Password：设置一个强密码并记下来
   - Region：选择 `Asia Pacific (Singapore)` 或 `Northeast Asia (Tokyo)`
   - Pricing Plan：`Free`
4. 等待数据库初始化（约 2 分钟）
5. 记下以下信息（在 Settings → API 中）：
   - `Project URL`（形如 `https://xxxxx.supabase.co`）
   - `anon public key`（公开密钥，前端使用）

---

## 四、在 Supabase 中建表

打开 Supabase 项目 → SQL Editor → New Query，粘贴以下 SQL 并执行：

```sql
-- 1. 分类表
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES categories(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_name_parent UNIQUE (name, parent_id)
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 2. 存放位置表
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    label       TEXT,
    parent_id   UUID REFERENCES locations(id),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_code ON locations(code);

-- 3. 零件表
CREATE TABLE parts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
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
CREATE INDEX idx_parts_category ON parts(category_id);
CREATE INDEX idx_parts_location ON parts(location_id);
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_barcode ON parts(barcode);

-- 4. 自定义字段表（EAV）
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

-- 5. 出入库记录表
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

-- 6. 启用 Realtime（实时推送）
ALTER PUBLICATION supabase_realtime ADD TABLE parts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- 7. 插入预置分类
INSERT INTO categories (name, parent_id, sort_order) VALUES
    ('紧固件', NULL, 0),
    ('电子元件', NULL, 1),
    ('电机', NULL, 2),
    ('传感器', NULL, 3),
    ('线材', NULL, 4),
    ('结构件', NULL, 5),
    ('工具', NULL, 6),
    ('耗材', NULL, 7),
    ('其他', NULL, 8);

INSERT INTO categories (name, parent_id, sort_order)
SELECT '螺丝', id, 0 FROM categories WHERE name = '紧固件';
INSERT INTO categories (name, parent_id, sort_order)
SELECT '螺母', id, 1 FROM categories WHERE name = '紧固件';
INSERT INTO categories (name, parent_id, sort_order)
SELECT '垫片', id, 2 FROM categories WHERE name = '紧固件';
```

---

## 五、初始化 React 项目

```bash
# 在项目根目录
cd d:\Dev\Hamster

# 使用 Vite 创建 React + TypeScript 项目
npm create vite@latest src -- --template react-ts

# 进入前端目录
cd src

# 安装依赖
npm install

# 安装项目需要的包
npm install @supabase/supabase-js  # Supabase 客户端
npm install vant                     # 移动端 UI 组件库
npm install react-router-dom         # 路由

# 启动开发服务器
npm run dev
```

---

## 六、配置 Supabase 连接

在 `src/src/` 下创建 `lib/supabase.ts`：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

在 `src/.env` 中：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 七、注册 Vercel 并部署

1. 打开 [vercel.com](https://vercel.com)
2. 用 GitHub 账号登录
3. 授权 Vercel 访问你的 Hamster 仓库
4. New Project → Import → 选择 Hamster 仓库
5. Framework：`Vite`
6. Root Directory：`src`
7. Environment Variables：
   - `VITE_SUPABASE_URL`：你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY`：你的 Supabase Anon Key
8. Deploy

部署后 Vercel 会生成一个 URL（如 `https://hamster.vercel.app`），手机上打开即可使用。

---

## 八、本地开发工作流

```bash
# 1. 启动前端开发服务器
cd d:\Dev\Hamster\src
npm run dev
# → 浏览器打开 http://localhost:5173

# 2. Supabase 数据库操作
# → 浏览器打开 https://supabase.com/dashboard
# → 选择工程 → Table Editor 可直接操作数据

# 3. Git 提交
git add .
git commit -m "feat: ..."
git push
# → Vercel 自动部署
```

## 九、参考资源

- Supabase JS 文档：https://supabase.com/docs/reference/javascript
- Vant UI 文档：https://vant-ui.github.io/vant/
- Vite 文档：https://vitejs.dev/
- React 文档：https://react.dev/