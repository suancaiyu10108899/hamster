# 开发日志索引

| 日期 | 标题 | 摘要 |
|------|------|------|
| 2026-05-06 | [添加零件型号/规格字段](2026-05-06-add-model-number.md) | parts 表加 model_number 列；全页面支持型号搜索/显示/导入查重 |
| 2026-05-06 | [库存预警首页标记](2026-05-06-low-stock-alert.md) | 首页直接列出库存不足零件卡片，红色预警 |
| 2026-05-06 | [Phase 2 P1 功能实现](2026-05-06-phase2-p1-features.md) | Realtime 实时推送、SettingsPage 分类/位置管理、报废入口、分类筛选 |
| 2026-05-06 | [修复 HomePage 实时数据 + 部署](2026-05-06-fix-homepage.md) | 首页从占位符改为 Supabase 查询；修复 CSS 类名；Netlify 部署 |
| 2026-05-06 | [修复采购记录生成失败](2026-05-06-fix-purchases-db-columns.md) | purchases 表缺列诊断与补列；PostgREST schema cache 刷新 |
| 2026-05-07 | [仓库-货架-层位三级体系](2026-05-07-warehouse-location-hierarchy.md) | 位置层级化；PartsPage 仓库筛选；SettingsPage 一键初始化；HomePage 按仓库统计 |
| 2026-05-07 | [BOM 批量出库功能](2026-05-07-excel-batch-checkout.md) | CSV 粘贴建 BOM、自动匹配零件、库存对比、倍数选择、一键出库 |
| 2026-05-08 | [BOM 反馈修复](2026-05-08-bom-feedback-fixes.md) | null part_id、清空按钮、出库过滤未匹配、UI 间距优化 |
| 2026-05-08 | [批量操作标注 + 文档对齐](2026-05-08-batch-and-docs.md) | 管理员页面标注、批量导入入口、文档对齐 |
| 2026-05-08 | [全面代码审计与文档对齐](2026-05-08-code-audit.md) | TS零错误验证、DB schema对齐、README更新、残留清理、路线图审计 |
| 2026-05-08 | [零件照片上传功能](2026-05-08-part-photos.md) | Supabase Storage 照片上传、拍照、预览、列表缩略图、详情大图 |
