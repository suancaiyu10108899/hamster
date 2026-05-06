# 库存预警首页标记

**日期**：2026-05-06
**类型**：Feature
**影响范围**：HomePage, App.css, 路线图

---

## 问题

首页仅显示「N个库存不足」的统计数字，用户无法一眼看到哪些零件库存不足，必须进入列表页逐个查找。

## 改动

### HomePage.tsx
- 新增 `LowStockPart` 接口（id, name, model_number, quantity, min_quantity）
- `fetchStats` 改为查询全量字段：`id, name, model_number, quantity, min_quantity`
- 前端过滤 `min_quantity !== null && quantity < min_quantity`
- 取前 8 条存入 `lowStockParts` 状态
- 状态变量 `lowStock` 重命名 `lowStockCount`
- 新增 UI 区块：`alert-section > alert-header + alert-list > alert-item[]`
- 每条预警显示：名称 + 型号 + 仅剩X / 最低Y + 箭头 `›`
- 点击预警项跳转 `/parts/:id` 详情页

### App.css
- 新增 `.alert-*` 系列样式（section/header/list/item/info/name/model/qty/arrow）
- 红色系配色：`#fff3f0` 背景、`#d4380d` 文字、`#ffccc7` 边框
- 列表项支持 `:active` 态

### 路线图
- 标记「库存预警标记」为 ✅ 已完成

## 统计

| 指标 | 数值 |
|------|------|
| 修改文件 | 3 |
| 新增 CSS 行数 | ~65 |
| 新增 TSX 行数 | ~30 |

## 用户价值

- 打开首页立即看到所有库存不足的零件
- 点击即可跳转详情进行出入库操作
- 红色视觉醒目，不怕遗漏