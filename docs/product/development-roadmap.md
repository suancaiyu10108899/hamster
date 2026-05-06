# Hamster 开发路线图

> 创建日期：2026-05-06
>
> 版本：v1.0

---

## 路线图总览

```
2026-05-03   2026-05-06        2026-05-20         2026年夏季
    │           │                │                  │
Phase 0      Phase 1          Phase 2            Phase 3
需求分析    Web MVP ✅       队友试用           Qt 桌面版
架构设计    基本完成           功能迭代           (独立项目)
```

---

## Phase 0：需求分析与架构设计 ✅ 已完成

**时间**：2026-05-03 ~ 2026-05-04

**产出**：

| 文档 | 内容 |
|------|------|
| requirements.md | 产品需求、功能优先级、用例 |
| data-model.md | PostgreSQL Schema 设计、EAV 模式 |
| 0001-choose-tech-stack.md | 技术选型 ADR |
| environment-setup.md | 开发环境配置指南 |
| bme-plan.md | 个人学习路线 |

---

## Phase 1：Web MVP ✅ 已完成

**时间**：2026-05-04 ~ 2026-05-06

**P0 功能（已实现）**：

| 功能 | 实现方式 |
|------|---------|
| 零件增删改查 | PartsPage + PartFormPage |
| 出入库操作 | PartDetailPage 独立弹窗 |
| 搜索（按名称） | PartsPage 搜索栏 |
| 分类预置 | SQL 预置 9 类 |
| 首页统计 | HomePage 实时查询 Supabase |
| 手机端布局 | 响应式 CSS 手写 |
| PWA 基础 | manifest.json |
| Cloudflare Pages 部署 | Wrangler CLI |

**技术栈**：
- 前端：React 18 + TypeScript + Vite
- 后端：Supabase (PostgreSQL + RLS + Realtime)
- 部署：Cloudflare Pages
- 无 UI 组件库，纯手写 CSS

**统计**：
- 页面数：4 (Home / Parts / PartDetail / PartForm)
- 数据库表：8 (categories, locations, parts, transactions, custom_fields, purchases, part_groups, part_group_members)
- 代码行数：约 600 行 TSX + CSS

---

## Phase 2：队友试用与迭代 📋 下一步

**时间**：2026-05-06 ~ 2026-05-20（预计）

**步骤**：

### 第一步：让队友用起来（本周）
- [ ] 部署到 Cloudflare Pages 公共 URL
- [ ] 发链接给队友 + 简单操作说明
- [ ] 导入 10-20 个真实零件数据（手动）

### 第二步：收集反馈（使用后 3 天）
- [ ] 队友面对面聊：哪里好用？哪里难用？
- [ ] 观察队友的操作路径（是否需要我帮忙找零件）
- [ ] 记录所有反馈到 devlog

### 第三步：排序 + 实现（1-2 周）

**P1 候选功能（按优先级）**：

| 优先级 | 功能 | 预计工时 | 价值 |
|--------|------|---------|------|
| 🔴 P0 | 队友反馈的最高频痛点 | 0.5-2h | 直接改善体验 |
| 🟠 P1 | Realtime 实时推送 | 1-2h | 一入库立刻看到 |
| 🟠 P1 | 报废操作入口 | 30min | 操作完整性 |
| 🟡 P1 | 库存预警标记 | 1h | 首页红色提醒 |
| 🟡 P1 | 分类/位置管理 UI | 2h | 可动态添加 |
| 🟡 P1 | 零件照片上传 | 3h | Supabase Storage |
| 🟢 P2 | 扫码（相机读取条码） | 4h | 出入库加速 |
| 🟢 P2 | 一键采购入库 | 3h | 买完一键导入 |
| 🟢 P2 | CSV 导入导出 | 2h | 数据迁移/备份 |
| 🔵 P3 | PWA 离线缓存 | 3h | 无网络也能查 |
| 🔵 P3 | 零件替代组 UI | 2h | 相互替代推荐 |

---

## Phase 3：Qt 桌面版 📅 后续

**启动条件**：
- Web 版稳定运行，队友日常使用
- 个人训练进入 MindPath 阶段 D
- 有硬件集成的需求（扫码枪、电子秤）

**技术栈**：
- C++17 + Qt 6 Widgets
- 本地 SQLite
- 数据模型从 Hamster Web 版简化

**互补关系**：
- Web 版：移动端 + 多人实时
- Qt 版：高性能 + 硬件集成 + 离线

---

## 非功能需求路线图

| 需求 | 优先级 | 预计 Phase | 状态 |
|------|--------|-----------|:--:|
| 响应式手机布局 | P0 | Phase 1 | ✅ |
| Realtime 实时同步 | P1 | Phase 2 | ⏳ |
| PWA 离线 | P3 | Phase 2-3 | ❌ |
| Email 认证 | P4 | Phase 2+ | ❌ |
| CI/CD 自动部署 | P4 | Phase 2+ | ❌ |
| 单元测试 | P5 | Phase 2+ | ❌ |

---

## 文档维护计划

| 文档 | 更新频率 | 负责 |
|------|---------|------|
| current-status.md | 每次会话后 | AI 辅助 |
| requirements.md | 按 P 阶段 | 作者 |
| devlog | 每次修复/新功能 | 作者 |
| debug-log | 每次调试 | 作者 |
| README.md | 项目状态变化时 | 作者 |