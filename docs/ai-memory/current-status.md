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
