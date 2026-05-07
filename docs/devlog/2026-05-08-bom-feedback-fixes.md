# 2026-05-08 BOM 反馈修复

## 背景

2026-05-07 上线 BOM 批量出库功能后，Barry 测试反馈了以下几个问题：

1. 粘贴 CSV 后「粘贴」按钮和名称输入框离得太近
2. 没有「清空 CSV 粘贴区域」的按钮

此外，自己测试发现核心逻辑缺陷：未匹配的零件也应保存到数据库，不应强制要求全部匹配。

## 修改内容

### 1. 数据库迁移脚本更新 (`supabase/migrations/005-bom.sql`)

```sql
-- 之前
part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,

-- 之后
part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
```

**变更理由**：
- 允许 `part_id` 为 NULL：未匹配的零件可以保存在 BOM 中，等零件库更新后再关联
- `ON DELETE SET NULL`：删除零件不会级联删除 BOM 条目，避免数据丢失

### 2. BomPage.tsx — 支持未匹配保存 + 清空按钮

#### (a) 创建 BOM 时允许 `part_id = null`

```typescript
// 对于未匹配的行，part_id 设为 null
part_id: row.matchedPart?.id ?? null,
```

#### (b) 编辑 BOM 时过滤调未匹配行显示，但不阻止保存

```typescript
// 只更新已有行，不更新未匹配的行（updates 中 part_id 可能为 null）
// 不对未匹配行的 part_id 进行更新
```

#### (c) 添加「清空」按钮

```tsx
// 添加 clearPasteArea() 函数
function clearPasteArea() {
  setPastedData('');
  setParsedRows([]);
}

// UI 中添加按钮
<button className="btn btn-sm btn-secondary" onClick={clearPasteArea}>
  清空
</button>
```

#### (d) 样式调整 — 粘贴按钮与名称输入间距

```css
.paste-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.paste-row .input {
  flex: 1;
}
```

### 3. BomCheckoutPage.tsx — 过滤未匹配的零件

出库确认页中，只显示已匹配到零件的条目：

```typescript
const checkoutRows: CheckoutRow[] = (items || [])
  .filter((item: any) => item.part !== null)  // 跳过未匹配的零件
  .map((item: any) => {
    const part = item.part as Part;  // 已经过滤 null，类型收窄
    // ...
  });
```

## 影响范围

- **数据库**：需要重新 migrate（已有数据不影响，`ALTER TABLE` 会允许 NULL）
- **BomPage**：新建/编辑 BOM 时允许未匹配零件存入
- **BomCheckoutPage**：出库时跳过未匹配的零件，只出库已匹配的

## 验证

1. 粘贴含未匹配零件的 CSV → 保存成功 → 编辑时未匹配行灰色显示
2. 出库确认页不显示未匹配行
3. 清空按钮清除粘贴区和解析结果
4. `npx tsc --noEmit` 通过，零错误

## 部署说明

```bash
# 1. 更新数据库（Supabase Dashboard → SQL Editor）
# 执行: supabase migrate up

# 2. 部署前端
git push && # 触发 Netlify 自动部署