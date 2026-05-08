# Hamster / 仓鼠

> 战队零件仓库管理系统。
> 目标：让零件管理从"凭记忆翻箱"变成"扫码即知"。

## 项目定位

Hamster 是一个面向 RM 战队的轻量级零件仓库管理系统，同时作为个人 **BME 系统工程师** 能力训练项目（域5：上位机/工具软件 + 贯通A：系统集成思维）。

与 MindPath 的关系：
- **MindPath** 训练 C++ 工程能力（手写代码、架构、测试）
- **Hamster** 训练系统交付能力（需求分析、技术选型、产品迭代、用户体验）

## 技术栈

| 层级 | 第一期（Web MVP） | 第二期（Qt 桌面版） |
|------|-------------------|---------------------|
| 前端 | React + TypeScript + Vite | Qt 6 Widgets (C++17) |
| 后端/数据库 | Supabase (PostgreSQL) | 本地 SQLite |
| 实时同步 | Supabase Realtime | 本地单机 |
| 部署 | Netlify (免费) | exe 分发 |
| 目标 | 队友马上能用 | C++ 训练 + 硬件集成 |

## 项目状态

- ✅ **Phase 0**：需求分析与架构设计
- ✅ **Phase 1**：Web MVP 开发（P0 全部完成）
- 🟡 **Phase 2**：队友试用与迭代（P1 全部完成，P2 表已建立）
- ⏳ **Phase 3**：Qt 桌面版开发（对应 MindPath 训练路线图阶段 D）

## 主要功能

| 功能 | 状态 |
|------|:--:|
| 零件 CRUD + 分类/位置管理 | ✅ |
| 出入库/报废 + 交易流水 | ✅ |
| 首页实时统计 + 低库存预警 | ✅ |
| CSV 批量导入（型号查重） | ✅ |
| 采购入库（逐行添加+自动计价+库存联动） | ✅ |
| BOM 物料清单（粘贴解析）+ 批量出库 | ✅ |
| CSV 导出筛选结果 | ✅ |
| Supabase Realtime 实时推送 | ✅ |
| 仓库→货架→层位 三级树形管理 | ✅ |
| 自定义字段 / 零件拍照 / 扫码 | ⏳ |
| 替代组 / PWA 离线 / 数据统计 | ⏳ |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（支持局域网手机测试）
npm run dev

# 构建
npm run build

# 部署到 Netlify
npx netlify deploy --prod --dir=dist
```

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 仓库结构

```text
docs/
    adr/              # 架构决策记录
    ai-memory/        # AI 协作状态
    architecture/     # 架构文档
    debug-log/        # 调试日志
    devlog/           # 开发日志
    personal-learning/# 个人学习记录
    product/          # 产品文档
src/
    pages/            # 页面组件
    lib/              # Supabase 客户端
    types/            # TypeScript 类型定义
supabase/
    migrations/        # 数据库迁移脚本（001-005）
    setup-all.sql      # 完整建表脚本
```

## 文档入口

- [产品需求](docs/product/requirements.md)
- [数据模型设计](docs/architecture/data-model.md)
- [技术选型 ADR](docs/adr/0001-choose-tech-stack.md)
- [环境配置指南](docs/architecture/environment-setup.md)
- [项目状态](docs/ai-memory/current-status.md)
- [开发日志索引](docs/devlog/INDEX.md)

## 说明

本项目是作者作为 RM 战队结构组成员，为解决战队零件管理痛点而发起的工具软件项目。
同时作为 BME 系统工程师知识体系中"上位机/工具软件"域的能力训练载体。