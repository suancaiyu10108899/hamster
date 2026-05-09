# Supabase 数据库操作指南

## 初始化场景

### 场景 A：全新项目初始化
执行 **1 个文件**即可：
```sql
-- Supabase Dashboard → SQL Editor → 新建查询 → 粘贴全部 → 执行
supabase/setup-all.sql
```
包含：全部建表 + 索引 + RLS + Realtime + 预置分类。

### 场景 B：已有项目增量升级
按编号顺序执行 `migrations/` 目录下的迁移脚本：

| 顺序 | 文件 | 内容 | 依赖 |
|------|------|------|------|
| 1 | `001-add-model-number.sql` | parts 表新增 model_number 字段 + 索引 | setup-all.sql |
| 2 | `002-add-purchases.sql` | 创建 purchases + purchase_items 表 | setup-all.sql |
| 3 | `003-fix-purchases.sql` | 补列（paid_by, purchase_intent, link）+ locations.level | 002 |
| 4 | `004-seed-warehouses.sql` | 预置仓库层级种子数据（飞镖组/测试仓库） | setup-all.sql |
| 5 | `005-bom.sql` | 创建 boms + bom_items 表 | setup-all.sql |
| 6 | `006-storage-parts-images.sql` | Supabase Storage RLS 策略（需手动创建 bucket） | setup-all.sql |

> **注意**：如果已在 Supabase 中执行过 `setup-all.sql`，001-005 已完成，只需按需执行 006。

### 场景 C：已执行过 setup-all.sql 的生产环境
无需执行任何 SQL。`setup-all.sql` 已包含 001-005 的所有内容。

## 历史补丁

`supabase/fix-missing-columns.sql`
- **状态**：✅ 已于 2026-05-06 执行，内容已合并到 `003-fix-purchases.sql` 和 `setup-all.sql`
- **用途**：仅作为历史参考/调试记录，无需再次执行

## 手动操作清单

以下操作无法通过 SQL 自动完成：

1. **创建 Storage Bucket**：Supabase Dashboard → Storage → 新建 bucket `parts-images` → 设为 public
2. **Realtime 启用**：已在 `setup-all.sql` 中包含 `ALTER PUBLICATION` 语句
3. **RLS 策略**：已在 `setup-all.sql` 中包含全部 `anon_all` 策略

## 数据库结构速览

共 9 张业务表（不含 P2 暂未创建的表）：

| 表名 | 优先级 | 说明 |
|------|:--:|------|
| categories | P0 | 分类树（自引用） |
| locations | P0 | 位置层级（自引用） |
| parts | P0 | 零件主表 |
| custom_fields | P0 | 自定义字段（EAV） |
| transactions | P0 | 出入库记录 |
| purchases | P1 | 采购记录 |
| purchase_items | P1 | 采购明细 |
| boms | P1 | BOM 模板 |
| bom_items | P1 | BOM 明细 |