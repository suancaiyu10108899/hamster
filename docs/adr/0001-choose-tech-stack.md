# ADR 0001：技术栈选型

> 日期：2026-05-03
>
> 状态：**已接受（2026-05-04）**

---

## 背景

Hamster 是一个面向 RM 战队的零件仓库管理系统，核心需求：

1. **2人使用**：我（结构组成员，高频使用）+ 队友（偶尔使用）
2. **多端实时同步**：手机操作为主，电脑也可用
3. **零运维成本**：没有服务器预算，没有运维时间
4. **开发效率优先**：快速上线，队友好用，然后迭代
5. **隐私**：不需要对外公开，但可少量外部访问

训练定位：作为 BME 系统工程师"上位机/工具软件"域的能力训练，练的是"从需求到交付"的全链路系统思维。

---

## 方案对比

### 方案 A：Supabase + React (Vite) + Vercel

| 维度 | 评估 |
|------|------|
| 数据库 | PostgreSQL（Supabase 托管，500MB 免费） |
| 后端逻辑 | Supabase 自动生成 RESTful API + RLS 安全策略 |
| 实时同步 | Supabase Realtime 内置支持（WebSocket） |
| 文件存储 | Supabase Storage（1GB 免费）用于零件照片 |
| 认证 | Supabase Auth（Email / 匿名） |
| 前端 | React 18 + TypeScript + Vant UI（移动端组件库） |
| 部署 | Vercel（免费，自动 CI/CD from GitHub） |
| PWA | Service Worker + manifest.json |
| 月费 | ¥0（均在免费额度内） |
| 学习成本 | 中等（需学 React + Supabase SDK） |

### 方案 B：FastAPI + SQLite + 树莓派本地部署

| 维度 | 评估 |
|------|------|
| 数据库 | SQLite（本地文件） |
| 后端 | Python FastAPI（自写） |
| 实时同步 | 需自实现 WebSocket / SSE |
| 前端 | 同方案 A |
| 部署 | 树莓派或旧电脑 |
| 网络 | 需要内网穿透或固定 IP |
| 月费 | ¥0（但需要硬件和电费） |
| 维护 | 机器不关、网络稳定 |

### 方案 C：纯 Qt 桌面版（C++17/Qt6/SQLite）

| 维度 | 评估 |
|------|------|
| 数据库 | 本地 SQLite |
| 后端 | 无（单体架构） |
| 实时同步 | ❌ 不支持多端 |
| 移动端 | ❌ 需重新学 Qt for Android |
| 学习价值 | 高（训练 C++/Qt 能力） |
| 开发效率 | 低（手写 UI 慢） |
| 用户体验 | 仅桌面可用 |

### 方案 D：坚果云 + 纯前端（本地 JSON 文件同步）

| 维度 | 评估 |
|------|------|
| 数据库 | JSON 文件 |
| 后端 | 无 |
| 实时同步 | ⚠️ 靠坚果云文件同步 |
| 并发 | ❌ 两人同时写会冲突丢数据 |
| 可靠性 | 低 |

---

## 决策

**选择方案 A：Supabase + React (Vite) + Vercel。**

## 理由

1. **免费额度完全覆盖需求**：
   - Supabase：500MB 数据库（我们可能用不到 10MB）
   - Vercel：100GB 带宽/月
   - 2 个用户，不需要付费

2. **实时同步是核心需求，Supabase 原生支持**：
   - 不需要写一行 WebSocket 代码
   - 一个人入库，另一个人的页面自动刷新

3. **零运维**：
   - 不需要服务器、树莓派、内网穿透
   - Supabase + Vercel 都是托管服务，自动备份、自动 HTTPS

4. **开发效率高**：
   - 不用写后端 API（Supabase 自动生成）
   - Vant UI 移动端组件库成熟
   - AI 辅助 React/Supabase 代码质量好

5. **PWA 体验接近原生 App**：
   - 可添加到手机主屏幕
   - 支持离线缓存（后续实现）
   - 不需通过应用商店分发

6. **方案 C（Qt 版）不冲突，作为后续训练项目**：
   - Web 版先上线，验证需求
   - Qt 版作为 MindPath 训练路线图阶段 D 的实战项目
   - Qt 版加入硬件集成（扫码枪、RFID、电子秤）

## 后果

### 需要付出的
- 学习 React（JSX、Hooks、useState/useEffect）
- 学习 TypeScript 基础
- 学习 Supabase SDK（`@supabase/supabase-js`）
- 依赖外部服务（Supabase 和 Vercel）

### 风险与缓解
- **风险**：Supabase 免费项目 1 周不活动会暂停
  - 缓解：每周至少用一次，或在 Vercel 设置 cron 保活
- **风险**：网络不可用时无法使用
  - 缓解：P1 实现 PWA 离线模式
- **风险**：Supabase 服务中断
  - 缓解：PG 数据可通过 Supabase Dashboard 备份导出

### 与后续 Qt 版的关系
- Qt 版使用本地 SQLite，表结构从本设计的 PG Schema 简化适配
- Qt 版不连 Supabase，是独立单体应用
- Qt 版可以后续加入"从 Web 版导出数据 → Qt 版导入"的互操作

## 替代方案触发条件

| 条件 | 切换方案 |
|------|---------|
| Supabase 免费额度不够用 | 方案 B（FastAPI + SQLite），需要部署环境 |
| 网络极不稳定，多次无法使用 | 方案 B（FastAPI + 树莓派本地） |
| 需要硬件集成（扫码枪等） | 启动方案 C（Qt 版），Web 版继续用于移动端 |

---

## 环境依赖清单

| 工具 | 用途 | 安装方式 |
|------|------|---------|
| Node.js 22 LTS | JS 运行时 | `winget install OpenJS.NodeJS.LTS` |
| npm | 包管理 | Node.js 自带 |
| Git | 版本控制 | 已安装 ✅ |
| VSCode | 编辑器 | 已安装 ✅ |
| Supabase 账号 | 后端服务 | [supabase.com](https://supabase.com) 注册（GitHub 登录） |
| Vercel 账号 | 部署 | [vercel.com](https://vercel.com) 注册（GitHub 登录） |