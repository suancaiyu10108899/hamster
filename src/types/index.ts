export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface Location {
  id: string;
  code: string;
  label: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface Part {
  id: string;
  name: string;
  category_id: string | null;
  quantity: number;
  min_quantity: number | null;
  unit: string;
  location_id: string | null;
  barcode: string | null;
  image_url: string | null;
  remark: string | null;
  supplier: string | null;
  created_at: string;
  updated_at: string;

  // 关联查询展开字段
  category?: Category | null;
  location?: Location | null;
}

export interface Transaction {
  id: string;
  part_id: string;
  type: 'in' | 'out' | 'scrap' | 'adjust';
  quantity: number;
  operator: string;
  remark: string | null;
  created_at: string;
}

export interface CustomField {
  id: string;
  part_id: string;
  field_name: string;
  field_value: string | null;
  field_type: string;
  sort_order: number;
  created_at: string;
}