# 修复采购记录生成失败：数据库缺列诊断与补列

**日期**：2026-05-06
**类型**：Bug Fix
**影响范围**：数据库 Schema、诊断脚本、前端部署

---

## 问题

队友反馈：在采购页面填写表单后点击「生成采购记录」，页面无响应，控制台显示 400 错误。排查发现 Supabase 线上数据库的 `purchases` 和 `purchase_items` 表缺失关键字段，导致前端 INSERT 请求被数据库拒绝。

## 根因分析

### 表结构不一致

前端 TypeScript 类型定义（`src/types/index.ts`）中 `PurchaseRecord` 包含 9 个字段：

```typescript
interface PurchaseRecord {
  id: string;
  purchase_date: string;
  total_amount: number | null;
  reimbursed: boolean;        // ← 缺失
  paid_by: string | null;      // ← 缺失
  purchase_intent: string | null; // ← 缺失
  remark: string | null;
  operator: string;
  created_at: string;
}
```

但线上数据库 `purchases` 表实际只有 6 列：`id, purchase_date, total_amount, remark, operator, created_at`。缺失的 3 列为 `reimbursed`, `paid_by`, `purchase_intent`。

同样，`purchase_items` 表也缺失 `part_name` 和 `link` 两列。

### 为什么迁移 SQL 没生效

之前编写的迁移脚本 `supabase/migrations/002-add-purchases.sql` 和 `003-fix-purchases.sql` 文件存在，但用户未在 Supabase SQL Editor 中手动执行过。Supabase CLI migrations 自动执行仅限本地开发，生产环境需手动运行。

### PostgREST Schema Cache

Supabase 的 REST API 由 PostgREST 驱动，PostgREST 在启动时会缓存数据库的 schema 信息。即便在 PostgreSQL 中直接 `ALTER TABLE ADD COLUMN` 成功了，PostgREST 的 schema cache 也不会自动刷新。需要在 SQL 末尾加 `NOTIFY pgrst, 'reload schema';` 来通知 PostgREST 重新加载。

## 诊断过程

### 工具链

1. **Python 诊断脚本**（`test_purchases.py`）：
   - 逐列探测：通过 `?select=column&limit=1` 验证每个字段是否可访问
   - 写入测试：尝试 INSERT 含所有字段的测试数据

2. **Supabase REST API 直接调用**：绕过前端，用 Python 直接发 HTTP 请求，排除前端代码错误的可能性

### 诊断步骤

```
1. test_purchases.py 初次运行 → 5 个字段返回 "Could not find column in schema cache"
2. 确认问题在数据库层，非前端代码 bug
3. 编写补列 SQL（fix-missing-columns.sql）
4. 用户在 Supabase SQL Editor 执行补列 SQL
5. test_purchases.py 再次运行 → 所有字段通过，INSERT 写入成功
6. 重新构建前端并部署到 Netlify
```

## 解决方案

### 补列 SQL

```sql
-- purchases 表补列
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS reimbursed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid_by TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_intent TEXT DEFAULT '采购';

-- purchase_items 表补列
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS part_name TEXT;

-- 刷新 PostgREST schema cache（关键！）
NOTIFY pgrst, 'reload schema';
```

### 幂等性设计

使用 `ADD COLUMN IF NOT EXISTS` 确保 SQL 可以安全重复执行，不会因为列已存在而报错。

### 前端重新部署

数据库补列完成后，重新构建 Vite 项目并部署到 Netlify：

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## 经验教训

| 教训 | 说明 |
|------|------|
| **迁移 ≠ 执行** | 写好的 `.sql` 文件不等于已在生产数据库执行，需要明确的执行步骤和验证 |
| **Schema Cache** | PostgREST 有独立的 schema cache，`ALTER TABLE` 后必须 `NOTIFY pgrst, 'reload schema'` |
| **诊断优先于修改** | 先写诊断脚本确认问题，再动手改代码，避免盲目修改引入新问题 |
| **物等性 SQL** | `IF NOT EXISTS` 让补救脚本可以安全重复执行 |
| **API 层级隔离排查** | 用 Python 直接调 REST API 排除前端代码问题，快速定位是数据库层的问题 |

## 统计

| 指标 | 数值 |
|------|------|
| 修改文件 | 1（fix-missing-columns.sql）|
| 新增文件 | 1（test_purchases.py 诊断脚本）|
| 数据库修改 | 5 列（purchases 3 列 + purchase_items 2 列）|
| 诊断轮次 | 3 轮 |
| 修复耗时 | ~30 分钟 |

## 后续参考

- 诊断脚本：`test_purchases.py`
- 补列 SQL：`supabase/fix-missing-columns.sql`
- 调试日志：[purchases-missing-columns](../debug-log/2026-05-06-purchases-missing-columns.md)
- 学习笔记：[数据库 Schema 调试与 PostgREST](../personal-learning/database-schema-debugging.md)