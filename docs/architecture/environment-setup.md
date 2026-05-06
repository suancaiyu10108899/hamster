# Hamster 开发环境配置指南

> 创建日期：2026-05-03
>
> 修订日期：2026-05-06（部署平台定为 Netlify）
>
> 适用范围：Phase 1 Web MVP 开发

---

## 一、环境概览

| 工具 | 用途 | 状态 |
|------|------|------|
| Node.js 22 LTS | JS 运行时 | ✅ 已安装 |
| npm | 包管理 | Node.js 自带 ✅ |
| Git | 版本控制 | ✅ 已安装 |
| VSCode | 代码编辑 | ✅ 已安装 |
| Supabase 账号 | 后端/数据库 | ✅ 已注册并配置 |
| Netlify 账号 | 前端部署 | ✅ 已注册并配置 |

---

## 二、Supabase 配置

### 2.1 注册与创建项目

1. 打开 [supabase.com](https://supabase.com)
2. 用 GitHub 账号登录
3. 创建新项目：
   - Name：`hamster`
   - Database Password：设置强密码
   - Region：`Asia Pacific (Singapore)` 或 `Northeast Asia (Tokyo)`
   - Pricing Plan：`Free`
4. 等待数据库初始化（约 2 分钟）
5. 在 Settings → API 记下：
   - `Project URL`（`https://xxxxx.supabase.co`）
   - `anon public key`

### 2.2 数据库建表（SQL Editor）

打开 Supabase 项目 → SQL Editor → New Query，运行 `supabase/setup-all.sql`。

### 2.3 启用 RLS + 匿名访问

RLS 策略已在 `setup-all.sql` 中包含。核心：anon key 可读写所有表。

### 2.4 Realtime 配置

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE parts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

---

## 三、前端项目配置

### 3.1 安装依赖

```bash
cd d:\Dev\Hamster
npm install
```

### 3.2 环境变量

创建 `.env`（参考 `.env.example`）：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon-key
```

### 3.3 本地开发

```bash
npm run dev
# → 浏览器打开 http://localhost:5173
# → 手机连同一 WiFi 可用局域网 IP + :5173 测试
```

---

## 四、部署（Netlify）

### 4.1 CLI 部署

```bash
# 构建
npm run build

# 部署到 Netlify（生产环境）
npx netlify deploy --prod --dir=dist
```

### 4.2 首次配置

1. 注册 [Netlify 账号](https://app.netlify.com)（可用 GitHub 登录）
2. 安装 Netlify CLI：
   ```bash
   npm install -g netlify-cli
   ```
3. 登录并关联站点：
   ```bash
   netlify login
   netlify init
   ```
4. Netlify 会自动检测 Vite 项目，无需额外配置

### 4.3 查看部署

部署后 Netlify 会提供 URL（当前：`https://hamster-rm-parts.netlify.app`），手机浏览器打开即可使用。

> **注意**：项目根目录的 `public/_redirects` 文件用于 Netlify 的 SPA 路由重写（`/* /index.html 200`）。

---

## 五、开发工作流

```bash
# 1. 启动开发服务器
npm run dev

# 2. 数据库操作
# 浏览器打开 https://supabase.com/dashboard
# → Table Editor 可视化操作

# 3. 构建验证
npm run build

# 4. 部署
npx netlify deploy --prod --dir=dist

# 5. Git 提交
git add .
git commit -m "feat: ..."
git push
```

---

## 六、参考资源

- Supabase JS 文档：https://supabase.com/docs/reference/javascript
- Netlify 文档：https://docs.netlify.com/
- Vite 文档：https://vitejs.dev/
- React 文档：https://react.dev/
- TypeScript 文档：https://www.typescriptlang.org/docs/