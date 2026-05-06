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
  model_number: string | null;
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

export interface Purchase {
  id: string;
  purchase_date: string;
  total_amount: number | null;
  reimbursed: boolean;
  paid_by: string | null;
  purchase_intent: string | null;
  remark: string | null;
  operator: string;
  created_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  link: string | null;
  sort_order: number;
  created_at: string;
}
