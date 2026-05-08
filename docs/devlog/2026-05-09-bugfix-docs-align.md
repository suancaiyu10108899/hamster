# 2026-05-09 Bug 修复与文档对齐

## 概述

修复 2 个功能性 Bug，并对齐 3 份核心文档。

---

## Bug 修复

### 1. ImportPage localStorage Key 不匹配

**问题**：SettingsPage 用 `OPERATOR_KEY`（`'hamster_operator'`）写入操作员名，但 ImportPage 硬编码读取 `'hamster_operator'`（恰巧一致但缺少常量引用）。

**修复**：ImportPage 改为从 `helpers.ts` 导入 `OPERATOR_KEY` 常量读取。

**文件**：`src/pages/ImportPage.tsx`

### 2. BomCheckoutPage 操作员硬编码

**问题**：BomCheckoutPage 第 47 行操作员写死为 `'我'`，队友使用时无法知道谁出的库。

**修复**：从 `localStorage` 读取操作员设置，fallback 为 `'我'`：
```ts
import { OPERATOR_KEY } from '../lib/helpers';
const operator = localStorage.getItem(OPERATOR_KEY) || '我';
```

**文件**：`src/pages/BomCheckoutPage.tsx`

---

## 文档对齐

### 1. development-roadmap.md

| 修复项 | 修正前 | 修正后 |
|--------|--------|--------|
| 页面数 | 11 | 10（去掉 PurchaseFormPage） |
| 数据库表数 | 12 | 11（custom_fields 算 EAV 但无独立表） |

### 2. requirements.md

| 修复项 | 修正前 | 修正后 |
|--------|--------|--------|
| P1 零件拍照 | ❌ 未实现 | ✅ 已实现 |
| 字段表照片 | ❌（空） | ✅ |
| P2 CSV 导出 | 重复列出 | 删除（已在 P1） |

### 3. current-status.md

| 修复项 | 修正前 | 修正后 |
|--------|--------|--------|
| 中期任务 | 含已完成的照片功能 | 移除 |
| 下次会话 | 含照片任务 | 移除 |

---

## 涉及文件

- `src/pages/ImportPage.tsx` (修改)
- `src/pages/BomCheckoutPage.tsx` (修改)
- `docs/product/development-roadmap.md` (修改)
- `docs/product/requirements.md` (修改)
- `docs/ai-memory/current-status.md` (修改)
- `docs/devlog/2026-05-09-bugfix-docs-align.md` (新建)