"""
Hamster 仓管系统 - purchases 表诊断脚本
检查线上 Supabase 数据库的 purchases 和 purchase_items 表列完整性
"""

import urllib.request, urllib.error, json

URL = 'https://zgguferfjfzohpcmrkju.supabase.co/rest/v1'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ3VmZXJmamZ6b2hwY21ya2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjQyMTYsImV4cCI6MjA5MzQwMDIxNn0.co1K3XhFWywa67r9kUMFfJnA0y8uxaEsFninpicWYf0'
AUTH_HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
}

def check_column_exists(table, column):
    """通过 ?select=column&limit=1 检查列是否存在"""
    try:
        req = urllib.request.Request(
            f'{URL}/{table}?select={column}&limit=1',
            headers=AUTH_HEADERS
        )
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError:
        return False

def try_insert(table, data):
    """尝试插入一行测试数据"""
    h = {**AUTH_HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
    req = urllib.request.Request(
        f'{URL}/{table}',
        data=json.dumps(data).encode(),
        headers=h,
        method='POST'
    )
    try:
        urllib.request.urlopen(req)
        return True, None
    except urllib.error.HTTPError as e:
        return False, e.read().decode()[:200]

if __name__ == '__main__':
    print('=' * 60)
    print('Hamster 仓管系统 - purchases 表列诊断')
    print('=' * 60)

    # 前端需要的 purchases 列
    required_columns = [
        'id', 'purchase_date', 'total_amount', 'reimbursed',
        'paid_by', 'purchase_intent', 'remark', 'operator', 'created_at'
    ]

    print('\n📋 purchases 表列检查：')
    missing = []
    for col in required_columns:
        exists = check_column_exists('purchases', col)
        status = '✅ 存在' if exists else '❌ 缺失'
        print(f'  {status}: {col}')
        if not exists:
            missing.append(col)

    # purchase_items 列检查
    purchase_items_cols = ['id', 'purchase_id', 'part_id', 'part_name', 'quantity',
                            'unit_price', 'subtotal', 'link', 'sort_order']
    
    print('\n📋 purchase_items 表列检查：')
    items_missing = []
    for col in purchase_items_cols:
        exists = check_column_exists('purchase_items', col)
        status = '✅ 存在' if exists else '❌ 缺失'
        print(f'  {status}: {col}')
        if not exists:
            items_missing.append(col)

    print('\n' + '=' * 60)
    if missing or items_missing:
        print('❌ 发现缺失列！请在 Supabase SQL Editor 中执行：')
        print('   supabase\\fix-missing-columns.sql')
        print()
        if missing:
            print(f'   purchases 缺失: {missing}')
        if items_missing:
            print(f'   purchase_items 缺失: {items_missing}')
    else:
        print('✅ 所有列完整，数据库状态正常！')

    # 测试写入
    print('\n📋 写入测试（含 purchase_intent + reimbursed）：')
    ok, err = try_insert('purchases', {
        'purchase_date': '2026-05-06',
        'reimbursed': False,
        'purchase_intent': '测试',
        'operator': '诊断脚本',
        'remark': '列完整性测试'
    })
    if ok:
        print('  ✅ 写入成功！补列已生效')
    else:
        print(f'  ❌ 写入失败: {err}')
        print('  👉 请在 Supabase SQL Editor 运行 supabase\\fix-missing-columns.sql')

    print('=' * 60)