# 2026-05-06 Phase 2 P2：采购记录 + 操作日志 + 库存预警

## 概述

本次完成了 Phase 2 的三个重要功能：
1. **库存预警**：首页低库存红色提示卡片 + 详细列表
2. **操作日志页**：出入库/报废记录全量展示，支持筛选、搜索、分页
3. **采购记录页**：独立采购表，记录购买日期/金额/链接/报销/垫付人

## 改动清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `supabase/migrations/002-add-purchases.sql` | 采购表 + 采购项目表迁移 |
| `src/pages/TransactionsPage.tsx` | 操作日志页（分页/筛选/搜索） |
| `src/pages/PurchasesPage.tsx` | 采购记录页（增删改/报销标记） |
| `docs/devlog/2026-05-06-phase2-p2-purchases.md` | 本文档 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `src/types/index.ts` | 新增 Purchase/PurchaseItem/Transaction 类型 |
| `src/App.tsx` | 添加 Transactions / Purchases 路由，重构底部导航为 5 tab |
| `src/pages/HomePage.tsx` | 添加库存预警区块 + 快捷入口网格（导入/采购/日志/设置） |
| `docs/ai-memory/current-status.md` | 更新进度 |

## 技术要点

### 采购表设计
- `purchases`：采购日期、总金额、购买链接、报销状态、垫付人、备注、操作人
- `purchase_items`：关联采购单的零件明细（预留，当前 UI 未绑定）
- RLS 策略：所有认证用户可读写

### 操作日志页
- 数据来源：`transactions` 表 JOIN `parts` 表获取零件名
- 支持按类型筛选（入库/出库/报废/全部）
- 模糊搜索（零件名/操作人/备注）
- 分页加载（每页 30 条）

### 用户需手动操作
- **在 Supabase Dashboard → SQL Editor 中执行 `supabase/migrations/002-add-purchases.sql`**

## 构建验证
- TypeScript 编译通过
- Vite 构建成功
- 产物大小：JS 412KB（gzip 118KB），CSS 7.3KB（gzip 2KB）