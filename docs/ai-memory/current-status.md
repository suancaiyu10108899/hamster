# Hamster 项目状态

>
> 用途：AI 助手上下文恢复，记录当前进度和下一步行动。

---

## 当前阶段

**Phase 2：队友试用与迭代（进行中）**

## 已完成

- [x] 项目 README
- [x] 产品需求文档
- [x] 数据模型设计（PG Schema）
- [x] 技术选型 ADR（Supabase + React + Vite + Netlify）
- [x] Supabase 项目创建 + 建表 + RLS
- [x] 预置分类数据（9 类）
- [x] React + Vite + TypeScript 脚手架
- [x] HomePage（统计数据）
- [x] PartsPage（列表、搜索、分类筛选）
- [x] PartDetailPage（详情、出入库、报废）
- [x] PartFormPage（新增/编辑）
- [x] SettingsPage（分类/位置管理）
- [x] ImportPage（CSV 导入 + 型号查重）
- [x] Realtime 订阅（HomePage, PartsPage, PartDetailPage）
- [x] 报废操作入口
- [x] 型号/规格字段（model_number）
- [x] Netlify 部署（hamster-rm-parts.netlify.app）

## 本次已完成（2026-05-06 第五次更新）

1. 库存预警：HomePage 低库存红色提示 + 详细列表
2. 操作日志页（TransactionsPage）：出入库报废记录、筛选、搜索、分页
3. 采购记录页（PurchasesPage）：采购日期/金额/链接/报销状态/垫付人
4. 采购表数据库迁移（002-add-purchases.sql）
5. 底部导航重构：首页/零件/日志/采购/设置 5 tab
6. 首页快捷入口网格：导入/采购/日志/设置
7. **Bug 修复：采购记录生成 400 错误**——数据库缺列（reimbursed, paid_by, purchase_intent, part_name, link），编写诊断脚本 test_purchases.py 逐列探测，补列 SQL 执行 + PostgREST schema cache 刷新，功能恢复
8. **部署确认**：Netlify 生产部署 hamster-rm-parts.netlify.app，前端重新构建部署成功
9. **文档完善**：开发日志、调试日志、学习笔记（数据库 Schema 调试与 PostgREST）全部补齐

## 本次已完成（2026-05-07 仓库-货架-层位三级体系）

1. **数据库迁移 SQL**：`supabase/migrations/004-seed-warehouses.sql`——种子数据脚本可手动执行
2. **工具函数**：`src/lib/helpers.ts` 新增 `getTopLevelLocation()` 和 `getLocationPath()`
3. **位置选择器层级化**：`PartFormPage.tsx`——仓库/货架/层位分组显示，optgroup 缩进
4. **零件列表仓库筛选**：`PartsPage.tsx`——按顶层仓库筛选零件，搜索覆盖位置路径
5. **一键初始化仓库体系**：`SettingsPage.tsx` 位置管理 tab 新增按钮——删除现有位置并创建 2仓库+5货架+20层位
6. **位置树/分类树视图**：`SettingsPage.tsx`——递归组件展示层级结构，替代扁平列表
7. **首页按仓库统计**：`HomePage.tsx`——stats-grid 展示每个仓库的零件总数 + 低库存数
8. **开发日志**：`docs/devlog/2026-05-07-warehouse-location-hierarchy.md`
9. **教学文档**：`docs/personal-learning/chapter-7-code-file-by-file.md`——代码逐文件详解（基于从零教学文档第7章的扩展）

## 待完成

- [ ] 队友试用反馈收集
- [ ] 零件照片上传（Supabase Storage）
- [ ] PWA 离线支持
- [ ] Phase 3：Qt 桌面版
- [ ] 数据导出功能（CSV 备份）

## 关键决策记录

| 决策 | 状态 | 文档 |
|------|------|------|
| 技术栈：Supabase + React + Vite + Netlify | ✅ | ADR 0001 |
| EAV 自定义字段 | 待实现 | data-model.md |
| 部署平台：Netlify | ✅ | environment-setup.md |
| 双轨策略：Web MVP 先行 | ✅ | README.md |
| 采购记录独立表 | ✅ | 本次实现 |
| 数据库迁移执行确认流程 | ✅ | 本次修复中建立 |

## 下次会话任务

1. 队友试用反馈收集与分析
2. 零件照片上传（Supabase Storage）
3. 数据导出功能（CSV 备份）
4. PWA 离线支持调研
5. **教学会话：从零全面详解项目**（进行中）——详见 `docs/personal-learning/hamster-zero-to-full-understanding.md`

## 2026-05-07 新增：从零教学文档

为 BME 背景的用户创建了 `docs/personal-learning/hamster-zero-to-full-understanding.md`，覆盖：
- 前置概念（不需要先学什么）
- 项目一句话理解
- 网页如何跑起来的完整流程（含医院系统类比）
- 技术栈逐个拆解（React/TypeScript/Vite/npm/Supabase/PostgreSQL/Netlify）
- 项目文件逐一解释
- 数据库从零详解（表/行/列/SQL/外键/RLS/EAV）
- 代码逐文件详解（main.tsx/App.tsx/supabase.ts/types/helpers/页面通用模式/useState/useEffect/async-await）
- 部署流程讲解
- 常见困惑解答 + 提问模板
- 待扩展主题清单（根据用户提问动态补充）
