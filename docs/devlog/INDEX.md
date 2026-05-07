# 开发日志索引

| 日期 | 标题 | 摘要 |
|------|------|------|
| 2026-05-06 | [添加零件型号/规格字段](2026-05-06-add-model-number.md) | parts 表加 model_number 列；全页面支持型号搜索/显示/导入查重 |
| 2026-05-06 | [库存预警首页标记](2026-05-06-low-stock-alert.md) | 首页直接列出库存不足零件卡片，红色预警 |
| 2026-05-06 | [Phase 2 P1 功能实现](2026-05-06-phase2-p1-features.md) | Realtime 实时推送、SettingsPage 分类/位置管理、报废入口、分类筛选 |
| 2026-05-06 | [修复 HomePage 实时数据 + 部署](2026-05-06-fix-homepage.md) | 首页从占位符改为 Supabase 查询；修复 CSS 类名；部署（后从 Cloudflare Pages 迁移至 Netlify） |
| 2026-05-06 | [修复采购记录生成失败：数据库缺列诊断与补列](2026-05-06-fix-purchases-db-columns.md) | purchases 表缺 3 列、purchase_items 表缺 2 列；Python 诊断脚本逐列探测；PostgREST schema cache 刷新 |
| 2026-05-07 | [仓库-货架-层位三级体系](2026-05-07-warehouse-location-hierarchy.md) | 位置层级化管理；getTopLevelLocation/getLocationPath 工具函数；PartsPage 仓库筛选；SettingsPage 一键初始化仓库 + 位置树；HomePage 按仓库统计 |
| 2026-05-07 | [Parts 批量操作 + CSV 导出](2026-05-07-excel-batch-checkout.md) | 零件列表多选复选框、全选、批量移动至任意层级位置；📥 CSV 导出筛选结果 |
