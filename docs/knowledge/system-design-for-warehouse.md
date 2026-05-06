# 为 RM 零件仓管系统选型：系统化知识讲解

> 创建日期：2026-05-06
>
> 读者：Hamster 项目作者（BME 系统工程师训练中）

---

## 0. 本文的目的

你在做 Hamster 时遇到的每一个技术决策，背后都有一整套计算机科学和软件工程的知识体系。本文不是 Hamster 的设计文档——那在 `docs/adr/` 和 `docs/architecture/` 里。本文是**把 Hamster 项目中的每一个决策点，都连到背后的知识体系**，让你知其然也知其所以然。

这不是「科技树定义」，而是「科技树的根和树干」——你可以在这些树干上继续生长你的训练计划。

---

## 1. 技术选型的底层原理

### 1.1 为什么 Supabase 不是「又一个数据库」，而是 BaaS？

**概念**：BaaS（Backend as a Service）= 后端即服务

```
传统三层架构需要你全自己写：
┌─────────────┐
│   前端 UI   │  ← React（你写）
├─────────────┤
│  后端 API   │  ← Express/FastAPI（你写）
├─────────────┤
│   数据库    │  ← PostgreSQL（你维护）
└─────────────┘

BaaS 把后两层打包成服务：
┌─────────────┐
│   前端 UI   │  ← React（你写）
├─────────────┤
│  Supabase   │  ← 自动生成 REST API + 数据库 + 认证 + 文件存储 + 实时推送
└─────────────┘
```

**为什么 Hamster 适合 BaaS？**

| 自写后端 | BaaS |
|---------|------|
| 需要写 API 路由、认证、数据库迁移、部署运维 | 全部由 Supabase 处理 |
| 开发周期 2-4 周 | 开发周期 1-3 天 |
| 需要运维知识：Docker/Nginx/SSL/备份 | 零运维 |
| 适合 3 人以上的团队 | 适合 1-2 人项目 |
| 需要服务器 ¥50-200/月 | 免费额度内 ¥0 |

**底层原理**：Supabase 背后是 PostgreSQL，它在每个表的权限上叠加了 RLS（Row Level Security）。你的前端代码（TypeScript）通过 `@supabase/supabase-js` SDK 发送 HTTP 请求到 Supabase，Supabase 解析请求、检查 RLS 策略、执行 SQL、返回 JSON。

**你应该理解的**：
- PostgreSQL 是关系型数据库，不是你熟悉的 SQLite（它是嵌入式数据库）
- RLS = 数据库级别的权限控制，不是在应用代码里写的 `if (user.isAdmin)`
- REST API 是自动生成的：`GET /rest/v1/parts` 对应 `SELECT * FROM parts`

**进一步学习方向**：
- 《Database Internals》— 理解 PostgreSQL 如何存储和查询数据
- 尝试让 MindPath 后端的 SQLite 支持类似 RLS 的功能（在应用层实现）

---

### 1.2 React 不是「另一种写法」，而是一种范式

**概念**：声明式 UI vs 命令式 UI

```
命令式（Qt old-style）：
button.clicked.connect(handler)
label.setText("Hello")  // 你告诉程序每一步怎么做

声明式（React）：
<div>{isLoading ? "加载中..." : `零件数：${count}`}</div>
// 你只声明"数据长这样"，React 自动更新 DOM
```

**React 的核心概念——你已经在用的**：

| 概念 | Hamster 中的例子 | 
|------|-----------------|
| **状态（State）** | `useState<Part[]>([])` — 零件列表数据 |
| **副作用（Effect）** | `useEffect(() => { loadParts() }, [])` — 页面加载时拉数据 |
| **条件渲染** | `{loading ? <Spinner/> : <PartList/>}` — 加载中/加载完 |
| **单向数据流** | 数据从 Supabase → State → JSX → DOM，一条路 |
| **组件化** | `PartsPage` / `PartDetailPage` / `PartFormPage` 各自独立 |

**为什么 React 比 Qt 更适合 Web？**

| 维度 | React | Qt Widgets |
|------|-------|-----------|
| 移动端支持 | 天然（浏览器） | 需要 Qt for Android（学习成本高） |
| 即时更新 | 部署完即更新 | 需要重新编译、分发 exe |
| AI 编码质量 | 非常好（常见框架） | 中等 |
| 响应式布局 | CSS flex/grid | Qt Layout 系统 |

**你应该理解的**：
- React 的 Virtual DOM：不直接操作 HTML，而是先算一个「虚拟的」HTML 结构，和上一次对比，只更新变了的部分
- 这和 Qt 的信号槽机制（事件驱动）是两种不同的思维模式
- Hook 机制（useState/useEffect）让函数组件也能有状态——这在你学 C++ 时没有对应物

**进一步学习方向**：
- React 官方教程的「Thinking in React」一章
- 对比 React 的 useState 和 Qt 的 Q_PROPERTY
- 尝试在 Qt 中用类似「单向数据流」的结构设计 UI

---

### 1.3 TypeScript：类型系统为什么重要？

**概念**：静态类型 vs 动态类型

```typescript
// TypeScript（静态类型）
interface Part {
  id: string;
  name: string;
  quantity: number;
}
function addPart(part: Part): void { ... }
// ↓ 写错字段 → VSCode 红线提示，编译报错

// JavaScript（动态类型）
function addPart(part) { ... }
// ↓ 写错字段 → 运行时才发现，页面崩了
```

**TypeScript 训练的系统工程师能力**：
- 类型建模 = 信息建模能力（你在 `src/types/index.ts` 做的）
- 接口定义 = 模块间契约（六边形架构的核心概念）
- 泛型 = 抽象能力（`useState<Part[]>` 的 `<Part[]>` 就是泛型）

**在 C++ 中的对应物**：
- TypeScript interface → C++ struct/class
- TypeScript type → C++ using/typedef
- TypeScript 泛型 → C++ template

**你应该理解的**：
- 为什么你的 `types/index.ts` 是整个项目的「单一真相来源」
- 当数据库 Schema 变了，类型定义也需要同步更新（这就是为什么数据建模重要）
- 类型系统是编译器/IDE 帮你做的「自动化测试」

---

### 1.4 Vite 不是「npm start」，而是现代前端构建工具链

**概念**：构建工具做了什么？

```
你写的代码                    浏览器执行的代码
src/parts.tsx    →  Vite  →  打包、压缩、tree-shaking → dist/assets/parts-abc123.js
很多小文件       →  开发服务器 → HMR（热更新，秒级刷新）
```

**和 C++ 编译的对比**：

| 步骤 | C++ (CMake) | Web (Vite) |
|------|-----------|-----------|
| 预处理 | `#include` 展开 | `import` 解析 |
| 编译 | `.cpp` → `.o` | `.tsx` → `.js` |
| 链接 | `.o` → `exe` | `.js` 打包 → bundle |
| 热重载 | 需要重新编译和 run | Vite 自动 HMR，1 秒内 |

**你应该理解的**：
- Vite 的 HMR（Hot Module Replacement）让你改一行代码，浏览器立刻看到效果——这在 C++ 开发中不存在
- `npm run dev` 启动的是开发服务器（localhost:5173），`npm run build` 生成的是静态文件（dist/）
- 静态文件可以部署到任何静态托管服务（Cloudflare Pages / Vercel / GitHub Pages / Nginx）

---

## 2. 数据库设计的内功

### 2.1 固定 Schema vs EAV：两种数据模型思维

**固定 Schema**（传统方式）：

```sql
CREATE TABLE parts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  resistance TEXT,  -- 电阻值（只对电子元件有用）
  torque TEXT,      -- 扭矩（只对螺栓有用）
  voltage TEXT      -- 电压（只对电机有用）
);
-- 问题：每种零件类型需要不同字段，表会越来越宽
```

**EAV**（Entity-Attribute-Value，实体-属性-值）：

```sql
-- 核心表
CREATE TABLE parts (id UUID PRIMARY KEY, name TEXT NOT NULL);

-- 扩展属性表
CREATE TABLE part_attributes (
  id UUID,
  part_id UUID REFERENCES parts(id),
  attr_key TEXT,    -- 比如 "resistance"
  attr_value TEXT   -- 比如 "100Ω"
);
```

| 维度 | 固定 Schema | EAV |
|------|-----------|-----|
| 查询速度 | 快（where resistance = '100Ω'） | 慢（需要 JOIN 和 pivot） |
| 灵活性 | 低（加字段要改表结构） | 高（任何零件都可以有任意属性） |
| 适合场景 | 字段确定不变的系统 | 零件种类不可预知的系统 |
| Hamster 选择 | ✅ 已实现 | ✅ custom_fields 表已建 |

**你应该理解的**：
- EAV 不是「更好」，是「灵活但慢」的 trade-off
- Hamster 用了混合方案：固定字段存核心信息，EAV 存扩展信息
- 这在互联网产品中叫「元数据驱动」——你可以类比 C++ 的 `std::map<string, string>`

**进一步学习**：
- 研究 PostgreSQL 的 JSONB 类型（比纯 EAV 更灵活）
- 对比 SQLite 的 FTS5（全文搜索）——如果你在 Qt 版中需要搜索

---

### 2.2 RLS（行级安全）的本质是数据库内置的权限系统

```sql
-- 这是你在 setup-all.sql 中写的
CREATE POLICY "Allow anon read" ON parts
  FOR SELECT USING (true);  -- 所有人可读

-- 如果以后需要认证：
CREATE POLICY "Only owner can update" ON parts
  FOR UPDATE USING (auth.uid() = created_by);
```

**你应该理解的**：
- RLS 在数据库层面执行，不是在应用代码里——这意味着即使有人直接调用 API 绕过你的前端，也无法越权
- Supabase 把「认证」和「授权」分离：Auth 管你是谁，RLS 管你能做什么
- 你不需要写一行 `if (user.role !== 'admin') return 403;` ——这很危险，因为前端代码完全可控

---

### 2.3 Supabase Realtime：WebSocket 背后的原理

```
传统 HTTP（你请求，服务器响应）：
浏览器：有新的零件入库吗？
服务器：没有。
浏览器：现在有吗？
服务器：没有。          ← 轮询，浪费流量
浏览器：现在？
服务器：有！M3×10螺栓 +100

Supabase Realtime（服务器主动推送）：
浏览器：有变动就告诉我。
             ↓ WebSocket 订阅
             ↓ PostgreSQL 有 INSERT/UPDATE/DELETE
服务器：M3×10螺栓 +100  ← 服务器主动推送
```

**你应该理解的**：
- PostgreSQL 的 `LISTEN/NOTIFY` 机制 + WebSocket = Supabase Realtime
- 前端代码只需要 `supabase.channel('parts-changes').on('*', handler).subscribe()`
- 这和 Qt 的 SIGNAL/SLOT（信号槽）本质相同：一方发出信号，另一方收到并响应

**进一步学习**：
- WebSocket vs SSE（Server-Sent Events）的区别
- 在 MindPath 中尝试实现一个简单的发布-订阅模式（`std::vector<std::function>>`）

---

## 3. 部署与运维的知识

### 3.1 SPA 的工作原理

Hamster 前端是一个 SPA（Single Page Application，单页应用）：

```
传统多页应用（每次点击都请求新 HTML）：
浏览器 → GET /parts.html → 服务器生成 HTML → 返回

SPA（只有一个 HTML，内容由 JS 动态渲染）：
浏览器 → GET /index.html → JS 接管 → React 在前端渲染页面
         ↓
         路由由 JS 控制（React Router）
```

**为什么 SPA 适合你？**
- 不需要服务器渲染（这需要 Node.js 服务器）
- 可以部署到任何静态文件托管（Cloudflare Pages、GitHub Pages）
- PWA 支持（可以离线使用）

**Cloudflare Pages _redirects 的原理**：
```
/* /index.html 200
```
任何 URL 都返回 index.html，让 React Router 处理路由。这解决了「直接访问 /parts/new 时显示 404」的问题。

---

### 3.2 PWAs：让 Web 应用像原生 App

```json
{
  "name": "Hamster 仓管",
  "short_name": "Hamster",
  "start_url": "/",
  "display": "standalone",
  "icons": [...]
}
```

**三个层次**：

| 层次 | 功能 | Hamster 状态 |
|------|------|:--:|
| 桌面快捷方式 | icon + manifest.json | ✅ |
| 离线缓存 | Service Worker | ❌ |
| 原生能力 | 摄像头/推送通知 | ❌ |

**你应该理解的**：
- PWA 本质是一个「假装自己是 App 的网页」
- Service Worker 是一个在后台运行的 JS 脚本，可以拦截网络请求、缓存文件
- 这和你需要的「扫码功能」密切相关——调用手机摄像头需要 `navigator.mediaDevices.getUserMedia()`，这也是 Web API

---

## 4. 架构设计的理论支撑

### 4.1 六边形架构（你不需要完全实现，但应该理解思想）

```
         ┌───────────────────┐
   浏览器│←  前端 (React)   →│Supabase
         ├───────────────────┤
         │   ← 所有业务逻辑  →  │
         │   都在这层         │
         └───────────────────┘
```

**核心规则**：
- **依赖方向**：外层依赖内层，内层不知道外层的存在
- **你的代码**：业务逻辑（零件管理）不应该知道「数据是从 Supabase 来的还是本地 SQLite 来的」
- **为什么重要**：如果将来想换数据库，只需要改 Supabase 适配层，不改业务逻辑

```typescript
// ❌ 违反了六边形架构（业务逻辑直接依赖 Supabase）
function getParts() {
  return await supabase.from('parts').select('*');
}

// ✅ 符合（通过接口隔离）
interface PartRepository {
  getAll(): Promise<Part[]>;
}
class SupabasePartRepo implements PartRepository {
  async getAll() { return await supabase.from('parts').select('*'); }
}
```

**你的 Hamster 现状**：直接调用 supabase，这没问题——因为现阶段只有一个数据源。但你应该理解这个设计原则。

---

### 4.2 三色模型（UML 数据分析方法）

你不需要学 UML 画图工具，但应该理解分析问题的思路：

| 三色 | 含义 | Hamster 对应 |
|------|------|-------------|
| 🟢 时标物件 | 在某个时间点发生的事件 | `transactions`（出入库记录） |
| 🟡 角色 | 参与事件的实体 | `parts`, `purchases` |
| 🔵 描述 | 描述性信息 | `categories`, `locations`, `custom_fields` |

这个思想帮助你判断「一个功能应该放在哪张表里」：
- 交易记录（transaction）是时标物件，只增不改
- 零件（part）是角色，可以修改
- 分类（category）是描述，相对稳定

---

### 4.3 CAP 定理：为什么不能全都要？

| 属性 | 含义 |
|------|------|
| **C**onsistency | 所有人看到的数据是一样的（强一致性） |
| **A**vailability | 系统始终可以访问（高可用性） |
| **P**artition tolerance | 网络断了也能工作（分区容错） |

> **CAP 定理**：分布式系统中，你最多只能同时满足两个。

**Hamster 的选择**：A + P（牺牲了强一致性 C）

- ✅ 可用性：Cloudflare Pages 全球 CDN，几乎不会挂
- ✅ 分区容错：Supabase 托管，有副本
- ⚠️ 一致性：如果两个人同时修改同一个零件，可能出现竞态条件

**为什么这对你足够了？**
- 2 个人同时改同一个零件的概率极低
- 出问题时可以用交易记录（transactions）回溯

**进一步学习**：
- 分布式事务（Two-Phase Commit）
- 乐观锁 vs 悲观锁（PostgreSQL 的 `SELECT ... FOR UPDATE`）

---

## 5. 文件命名和组织

### 5.1 好的命名是架构的镜子

```
你项目的命名：
src/pages/PartsPage.tsx          → 零件列表页
src/pages/PartDetailPage.tsx     → 零件详情页
src/pages/PartFormPage.tsx       → 零件表单页
src/types/index.ts               → 类型定义
src/lib/supabase.ts              → Supabase 初始化

docs/adr/0001-choose-tech-stack.md     → 技术选型决策
docs/architecture/data-model.md        → 数据模型设计
docs/product/requirements.md           → 产品需求
```

### 5.2 目录结构的设计原则

```
项目根目录
├── src/          # 代码
│   ├── pages/    # 页面
│   ├── lib/      # 第三方集成
│   └── types/    # 类型定义
├── docs/         # 文档（人类语言）
│   ├── adr/      # 决策记录
│   ├── architecture/  # 架构
│   ├── product/  # 产品
│   └── knowledge/# 知识体系
├── supabase/     # 数据库 SQL
└── public/       # 静态文件
```

---

## 6. 从 Hamster 到更广阔的世界

### 你已经掌握或正在掌握的

| 能力 | 在 Hamster 中的体现 |
|------|-------------------|
| 需求分析 | requirements.md — 场景驱动的需求文档 |
| 技术选型 | ADR 0001 — 结构化决策方法 |
| 数据建模 | data-model.md — EAV 模式设计 |
| 全栈开发 | React + TypeScript + Supabase + Cloudflare Pages |
| 文档工程 | 多维度、多受众的文档体系 |
| 产品思维 | 功能优先级排序（P0/P1/P2）、非目标清单 |

### 你还缺乏的（建议后续训练）

| 能力 | 建议途径 |
|------|---------|
| 测试工程 | 为 Hamster 写单元测试（Jest）+ E2E 测试（Playwright） |
| CI/CD | GitHub Actions 自动构建部署 |
| 性能调优 | React DevTools Profiler + SQL EXPLAIN |
| 安全 | 从匿名访问升级到 Email Auth + RLS 用户级策略 |
| 硬件集成 | Qt 版（Phase 3）扫码枪/电子秤/RFID |

---

## 附录：术语对照表

| 术语 | 含义 | 对应 C++ 概念 |
|------|------|-------------|
| REST API | 通过 HTTP 操作数据（GET/POST/PUT/DELETE） | 不像 C++ 中的任何东西 |
| JSON | 键值对数据格式 | 像 `std::map<string, any>` |
| Promise/await | 异步操作 | `std::future` / `co_await` |
| Hook | React 函数组件的状态机制 | 不像 C++ 中的任何东西 |
| 组件 | 独立的 UI 单元 | 像 Qt Widget |
| Props | 父组件传给子组件的数据 | 像函数的参数 |
| State | 组件内部的可变数据 | 像成员变量 |
| JSX | HTML 写在 JS 里 | 不像 C++ 中的任何东西 |
| BaaS | 后端即服务 | 不像 C++ 中的任何东西 |
| CDN | 内容分发网络 | 不像 C++ 中的任何东西 |