# 添加零件型号/规格字段 (model_number)

> 日期：2026-05-06
> 
> 标签：数据模型, 型号, 搜索, 导入查重

---

## 背景

采购时表格里经常有「规格」列（如 M3×12、6204、25T 等），这是识别零件的关键信息。但之前 Hamster 零件表只有 `name` 字段，没有独立的型号列。队友在用的时候需要把型号写在名称里，导致名称很长且不统一。

## 改动范围

### 数据库层

- **parts 表**：新增 `model_number TEXT` 列
- **索引**：新增 `idx_parts_model_number` 索引，加速型号搜索

```sql
ALTER TABLE parts ADD COLUMN IF NOT EXISTS model_number TEXT;
CREATE INDEX IF NOT EXISTS idx_parts_model_number ON parts(model_number);
```

- 迁移文件：`supabase/migrations/001-add-model-number.sql`

### 前端层（7 个文件）

| 文件 | 改动 |
|------|------|
| `src/types/index.ts` | `Part` 接口加 `model_number?: string` |
| `src/pages/PartFormPage.tsx` | 名称下方新增型号输入框 |
| `src/pages/PartDetailPage.tsx` | 详情页显示型号 |
| `src/pages/PartsPage.tsx` | 搜索命中型号 + 卡片显示型号 + 高亮 |
| `src/pages/ImportPage.tsx` | 导入时写入 `model_number` + 型号做最高优先级查重 |
| `docs/architecture/data-model.md` | 数据模型文档同步 |

### 关键行为

1. **搜索覆盖**：搜索输入同时命中 `name`、`model_number`、`remark`
2. **导入查重**：型号匹配为最高优先级（比名称匹配更可靠）
3. **表单**：型号字段在名称下方，可选填

## 验证

- TypeScript 编译通过
- Vite 构建成功（401KB JS + 6.4KB CSS）
- Supabase REST API 验证：`parts` 表已包含 `model_number` 列
- 已部署到 Netlify：https://hamster-rm-parts.netlify.app

## Commit

```
4f770ca feat: 添加零件型号/规格字段 (model_number)
```

---

## Next Steps

- [ ] 库存预警首页标记（低库存红色提示）
- [ ] 队友试用反馈收集
- [ ] 零件照片上传