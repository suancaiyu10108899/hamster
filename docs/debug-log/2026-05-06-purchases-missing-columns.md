# 调试日志：采购记录生成 400 错误（purchases 表缺列）

**日期**：2026-05-06
**状态**：✅ 已修复
**严重程度**：🔴 高（功能完全不可用）

---

## 现象

用户在 PurchasesPage 填写采购表单后点击「生成采购记录」，页面无反应。打开浏览器 DevTools → Network 标签页，看到对 Supabase REST API 的 POST 请求返回 HTTP 400，响应体包含：

```json
{
  "code": "PGRST204",
  "message": "Could not find the 'purchase_intent' column of 'purchases' in the schema cache"
}
```

## 排查过程

### 第一步：定位错误层级

- 前端代码无报错（TypeScript 编译通过）
- 网络请求发出去了，但服务器返回 400
- 错误来自 Supabase（PostgREST），不是前端代码
- **结论**：问题在数据库层

### 第二步：验证表结构（可用列）

编写 Python 诊断脚本，通过 Supabase REST API 逐列探测：

```python
# 核心逻辑：?select=column&limit=1
# 如果列存在 → 200 OK
# 如果列不存在 → 400 PGRST204
```

检查 `purchases` 表 9 个期望列：

| 列名 | 状态 |
|------|------|
| id | ✅ |
| purchase_date | ✅ |
| total_amount | ✅ |
| reimbursed | ❌ |
| paid_by | ❌ |
| purchase_intent | ❌ |
| remark | ✅ |
| operator | ✅ |
| created_at | ✅ |

检查 `purchase_items` 表 9 个期望列：

| 列名 | 状态 |
|------|------|
| id | ✅ |
| purchase_id | ✅ |
| part_id | ✅ |
| part_name | ❌ |
| quantity | ✅ |
| unit_price | ✅ |
| subtotal | ✅ |
| link | ❌ |
| sort_order | ✅ |

**结论**：purchases 缺 3 列（reimbursed, paid_by, purchase_intent），purchase_items 缺 2 列（part_name, link）。

### 第三步：追溯根因

迁移文件 `supabase/migrations/002-add-purchases.sql` 和 `003-fix-purchases.sql` 已写好，但：
1. 用户未在 Supabase SQL Editor 手动执行过
2. Supabase CLI `supabase db push` 仅用于本地开发，不影响生产
3. 生产环境的表是在最初手动建表时创建的，后续迁移脚本未执行

### 第四步：编写补列 SQL 并执行

```sql
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS reimbursed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid_by TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_intent TEXT DEFAULT '采购';

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS part_name TEXT;

NOTIFY pgrst, 'reload schema';
```

### 第五步：验证修复

执行补列 SQL 后，重新运行诊断脚本：
- 所有 9 列 ✅ 可访问
- INSERT 测试写入 ✅ 成功

## 修复清单

| 操作 | 状态 |
|------|------|
| 编写诊断脚本 test_purchases.py | ✅ |
| 编写补列 SQL fix-missing-columns.sql | ✅ |
| 在 Supabase SQL Editor 执行补列 | ✅ |
| 重新构建前端 npm run build | ✅ |
| 部署到 Netlify | ✅ |
| 功能验证（采购记录生成） | ✅ |

## 经验总结

1. **PostgREST 有 schema cache**：`ALTER TABLE` 后必须 `NOTIFY pgrst, 'reload schema'`
2. **迁移文件 ≠ 已执行**：团队成员需要明确的执行指引（Supabase Dashboard → SQL Editor）
3. **诊断优于猜测**：先写探测脚本确认问题，再动手修改
4. **幂等 SQL 是安全网**：`IF NOT EXISTS` 让补救操作可以安全重复执行

## 关联文件

- 诊断脚本：`test_purchases.py`
- 补列 SQL：`supabase/fix-missing-columns.sql`
- 开发日志：`docs/devlog/2026-05-06-fix-purchases-db-columns.md`
- 学习笔记：`docs/personal-learning/database-schema-debugging.md`