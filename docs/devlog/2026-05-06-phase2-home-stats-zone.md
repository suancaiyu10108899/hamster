# Phase 2 Home 统计数据 & 多级仓库搜索树形优化

**日期**: 2026-05-06  
**状态**: ✅ 已完成并部署

## 核心改动

### 1. 修复批量导入采购记录生成失败
**问题**: ImportPage 批量导入后创建 purchases 记录时缺少必填字段 `reimbursed`，且 `purchase_items` 缺少 `sort_order` 字段。

**修复**:
- purchases insert 添加 `reimbursed: false`
- purchase_items insert 添加 `sort_order: idx + 1`
- 错误信息增强：包含 Supabase error code 和 message，方便排查

### 2. 多级仓库搜索支持跨级位置匹配
**问题**: PartsPage 搜索时只能匹配当前零件的直接位置（如 `A-02-01`），不能匹配父级位置（如搜"A2架"找不到放在 `A-02-01` 的零件）。

**修复**:
- PartsPage 的 `filtered` 增加 `locPath.includes(s)` 搜索逻辑
- 使用 `getLocationPath(part.location, allLocations)` 获取完整路径（如 `A2架 > A2架1层 > A-02-01`）
- 用户搜索父级仓库名即可找到所有子级位置的零件

### 3. SettingsPage 位置管理显示树形层级
**改动**: 位置列表和分类列表改为树形递归渲染。

**实现**:
- 使用 `useMemo` 构建 locationTree / categoryTree
- 递归函数 `renderLocationNode` / `renderCategoryNode` 按层级缩进渲染
- 子节点 `paddingLeft` 递增 20px，📁 表示有子级，📍 表示叶子
- 位置节点显示完整路径（`getLocationPath`）
- ImportPage 区分型号匹配 vs 名称模糊匹配（📦补货 绿色 vs ⚠️疑似重复 橙色）

### 4. ImportPage 错误处理改进
- 采购记录和明细创建失败时错误信息更详细
- catch 块中使用 `(purchaseErr: any)` 类型标注兼容 TS 严格模式
- 布局微调：预留底部间距防止按钮被遮挡

## 部署
- 构建成功，无 TS 错误
- 部署到 Netlify: https://hamster-rm-parts.netlify.app