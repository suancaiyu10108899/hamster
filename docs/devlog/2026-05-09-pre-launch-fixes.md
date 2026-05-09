# 2026-05-09 队友试用前体验修复

## 概述

在队友正式试用前，针对已识别的体验问题进行集中修复。共修改 6 个源码文件 + 2 个文档文件。

---

## 修复清单

### 🔴 必须修复

#### 1. 底部导航无高亮（App.tsx）
- **问题**：6 个 `<a href>` 导航全是静态的，CSS `.nav-item.active` 从未被使用
- **修复**：改为 `react-router-dom` 的 `<NavLink>` 组件，`className` 动态添加 `.active`
- **影响**：队友能清楚看到自己在哪个页面

#### 2. PartsPage 仓库筛选 UI 混乱
- **问题**：仓库 `<select>` 放在 `search-bar` div 里，用 `marginTop: 8` hack 堆叠
- **修复**：仓库筛选独立成行，放在搜索栏下方，使用 flex 布局。新增低库存标记显示
- **影响**：搜索和筛选视觉上分离，不会被混淆

#### 3. 首页"库存不足"点击无筛选
- **问题**：点击跳转 `/parts`，队友看到全部零件列表，不能直接看到库存不足的零件
- **修复**：跳转改为 `/parts?lowStock=true`，PartsPage 读取 URL 参数自动过滤
- **影响**：点击即看到库存不足列表，无需手动筛选
- **连带修复**：HomePage 仓库统计卡片点击也带 `&lowStock=true` 参数

### 🟡 体验优化

#### 4. PartsPage 空状态引导
- **新增**：没有零件时显示带引导文案和快捷按钮的空状态
- **新增**：低库存筛选下无结果时显示正向反馈"太棒了！所有零件库存充足"
- **影响**：首次访问不再冷冰冰

#### 5. ImportPage 下载 Excel 模板
- **新增**：「📥 下载Excel模板」按钮，生成包含表头+示例数据的 CSV 文件（UTF-8 BOM 确保 Excel 正确打开）
- **影响**：队友不再需要猜格式

#### 6. BomPage 下载 CSV 模板
- **新增**：「📥 下载CSV模板」按钮，生成包含表头+4行示例数据的 CSV 文件
- **影响**：降低 BOM 录入门槛

#### 7. 操作员昵称在出入库面板可见可改（PartDetailPage）
- **问题**：操作员设置入口仅首页右上角小标签
- **修复**：出入库面板顶部新增操作人输入框，直接编辑即保存到 localStorage
- **影响**：队友出入库时能确认并修改自己的昵称，无需回到首页

### 🟢 修正

#### 8. 批量删除确认文案修正（PartsPage）
- **问题**：删除确认列出"替代组成员(part_group_members)"，该表实际未创建
- **修复**：改为"零件照片 (Supabase Storage)"
- **影响**：文案准确，不误导

### 文档

#### 9. supabase/README.md（新建）
- **内容**：SQL 初始化场景 A/B/C 指南 + 迁移执行顺序 + 历史补丁说明 + 手动操作清单
- **影响**：6 个月后不必靠记忆判断执行哪个 SQL

#### 10. 本 devlog + INDEX + current-status 更新

---

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/App.tsx` | 修改 | NavLink 高亮 |
| `src/pages/HomePage.tsx` | 修改 | lowStock=true 跳转参数 |
| `src/pages/PartsPage.tsx` | 修改 | 仓库筛选独立行 + lowStockFilter + 空状态引导 + 删除确认文案 |
| `src/pages/ImportPage.tsx` | 修改 | 下载Excel模板按钮 |
| `src/pages/BomPage.tsx` | 修改 | 下载CSV模板按钮 |
| `src/pages/PartDetailPage.tsx` | 修改 | 操作人输入框 |
| `supabase/README.md` | 新建 | SQL 管理指南 |
| `docs/devlog/2026-05-09-pre-launch-fixes.md` | 新建 | 本文档 |
| `docs/devlog/INDEX.md` | 修改 | 索引更新 |
| `docs/ai-memory/current-status.md` | 修改 | 状态更新 |

---

## 技术要点

- `NavLink` 用 `end` prop 确保 `/` 路径精确匹配（否则所有路径都匹配 `"/"`）
- CSV 模板文件用 `\uFEFF`（UTF-8 BOM）开头，确保 Excel 正确识别中文
- `lowStock` URL 参数用 `=== 'true'` 而非 truthy 检查——避免 `?lowStock`（无值）被误识别
- PartDetailPage 操作人输入框直接 `onChange` 写 localStorage，无需独立保存按钮

## TypeScript 编译

```
npx tsc --noEmit
```
**结果：✅ 零错误**

## 统计

| 指标 | 数值 |
|------|------|
| 修改文件 | 6 |
| 新建文件 | 3 |
| 新增代码行 | ~80 |
| 修改代码行 | ~30 |
| 总工时 | ~2h |