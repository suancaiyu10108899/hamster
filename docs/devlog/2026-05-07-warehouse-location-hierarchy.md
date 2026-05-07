# 2026-05-07 仓库-货架-层位三级体系

## 目标

实现仓库 → 货架 → 层位的三级位置管理体系，取代之前扁平的单层位置编码。

## 背景

之前位置（location）表中的 `parent_id` 字段一直存在但没有被充分使用。位置管理是扁平的——所有位置独立存在，没有父子关系。用户需要一个层级化的位置体系，能按仓库级别筛选零件。

## 改动

### 1. 数据库迁移 `supabase/migrations/004-seed-warehouses.sql`

提供可选的种子数据脚本，用于初始化仓库 → 货架 → 层位结构。这是手动执行的 SQL 迁移，不会自动运行。

### 2. `src/lib/helpers.ts` — 两个新工具函数

- **`getTopLevelLocation(location, allLocations)`**：给定一个位置，递归向上追溯到最顶层的仓库（`parent_id = null` 的节点）。
- **`getLocationPath(location, allLocations)`**：生成位置的完整路径字符串，如「主仓库 > A1 1号货架 > 层1」。

### 3. `src/pages/PartFormPage.tsx` — 层级位置选择器

将原来的扁平 `<select>` 替换为分组版：

- 列出顶层仓库
- 每个仓库下列出子货架
- 每个货架下列出层位
- 使用缩进区分层级
- 仓库/货架用 optgroup 分组

### 4. `src/pages/PartsPage.tsx` — 仓库级筛选

添加仓库下拉筛选器：

- 自动从顶层位置（无 parent_id）生成选项
- 使用 `getTopLevelLocation()` 判断每个零件归属的仓库
- 筛选范围覆盖仓库下所有子位置
- 也支持通过 `getLocationPath()` 在搜索中匹配位置路径

### 5. `src/pages/SettingsPage.tsx` — 一键初始化 & 位置树

- **位置树视图**：使用递归组件 `renderLocationNode()` 将位置以树状结构展示（仓库 → 货架 → 层位），替代原来的扁平列表。
- **一键初始化按钮**：在位置管理 tab 下新增「🏭 一键初始化仓库体系」按钮。
  - 清空现有所有位置
  - 创建 2 个仓库（主仓库 A1、备件仓库 B1）
  - 每个仓库 2-3 个货架
  - 每个货架 4 个层位
  - 共 2 仓 + 5 架 + 20 层 = 27 条记录

### 6. `src/pages/HomePage.tsx` — 按仓库统计

首页 stats-grid 新增按仓库的统计卡片：

- 遍历所有顶层仓库
- 统计每个仓库下的零件总数
- 统计每个仓库下的低库存零件数
- 卡片可点击跳转到零件列表

### 7. `src/pages/SettingsPage.tsx` — 分类树视图

同样使用递归组件 `renderCategoryNode()` 将分类管理也改为树状展示（保持一致性）。

## 关键技术点

- 使用 `parent_id` 自引用外键实现树结构（邻接列表模式）
- `useMemo` 构建本地位置树/分类树，避免重复计算
- `getTopLevelLocation()` 通过 while 循环递归查找根节点
- TypeScript 解构返回要注意类型推导：`` const { data: [r1, r2] } `` 在 r1/r2 可能为 null 时需改用索引访问 `whData?.[0]?.id`

## 影响点

- 位置表虽然有 parent_id，但属于可选字段。未建立层级关系的位置仍然正常工作（路径只显示自身标签）。
- 已有的位置数据不受影响，root 目录仍然能正常显示。