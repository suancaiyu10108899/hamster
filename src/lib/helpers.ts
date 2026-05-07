import type { Part, Location } from '@/types';

/**
 * Build full hierarchical path string for a location.
 * Example output: "A1 > B2 > C3"
 *
 * @param loc - The location to display (with parent chain resolved to its root)
 * @param allLocations - Flat list of ALL locations (needed if loc doesn't have parent chain resolved)
 * @returns Full path string like "A1 > B2 > C3", or fallback to "loc.code"
 */
export function getLocationPath(loc: Location | null | undefined, allLocations?: Location[]): string {
  if (!loc) return '未定位';

  // First try: if loc has a resolved parent chain (loc.parent is a Location object)
  const chain = buildChain(loc, allLocations);
  return chain.map(l => l.code).join(' > ');
}

/**
 * Build the ancestor chain from root to the given location.
 * Uses the parent chain of the location object if available, otherwise falls back to allLocations map.
 */
function buildChain(loc: Location, allLocations?: Location[]): Location[] {
  const chain: Location[] = [];
  const visited = new Set<string>();

  // Walk up to root using the location's parent references
  let current: Location | undefined = loc;
  while (current && !visited.has(current.id)) {
    chain.unshift(current);
    visited.add(current.id);

    // Try to get parent from the resolved object
    const parent = (current as any)['parent'] as Location | undefined | null;
    if (parent && typeof parent === 'object' && parent.id) {
      current = parent;
      continue;
    }

    // Fallback: look up parent from allLocations map
    if (allLocations && current.parent_id) {
      const found = allLocations.find(l => l.id === current!.parent_id);
      current = found;
      continue;
    }

    break;
  }

  return chain;
}

/**
 * 找到某个位置所属的顶级仓库（根节点）
 * 沿着 parent_id 向上追溯，直到 parent_id 为 null
 */
export function getTopLevelLocation(loc: Location | null | undefined, allLocations: Location[]): Location | null {
  if (!loc || !allLocations.length) return null;
  const visited = new Set<string>();
  let current: Location | undefined = loc;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (!current.parent_id) return current;
    current = allLocations.find(l => l.id === current!.parent_id);
  }
  return current || null;
}

/**
 * 将零件数据导出为 CSV 并触发浏览器下载
 * @param rows - 包含 location/category 展开数据的 Part 数组
 * @param allLocations - 所有位置（用于解析路径）
 */
export function exportPartsCSV(
  rows: Part[],
  allLocations: Location[]
) {
  // CSV 表头
  const headers = ['名称', '型号/规格', '分类', '当前库存', '单位', '最低库存', '存放位置', '条码', '供应商/厂家', '备注'];
  
  // 转义 CSV 单元格（处理逗号、引号、换行）
  const esc = (val: string | number | null | undefined): string => {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  // BOM for Excel UTF-8 recognition
  const BOM = '\uFEFF';
  
  const lines: string[] = [headers.join(',')];
  
  for (const p of rows) {
    const loc = p.location;
    const locPath = loc
      ? getLocationPath({ id: '', code: loc.code, label: loc.label, parent_id: loc.parent_id, sort_order: 0, created_at: '' }, allLocations)
      : '';
    
    const row = [
      p.name,
      p.model_number,
      p.category?.name,
      p.quantity,
      p.unit,
      p.min_quantity,
      locPath,
      p.barcode,
      p.supplier,
      p.remark,
    ];
    lines.push(row.map(esc).join(','));
  }
  
  const csv = BOM + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hamster-parts-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
