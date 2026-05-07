-- Hamster 多级仓库体系预置数据
-- 用途：一键创建飞镖组（结构仓库/电控仓库）和测试仓库的层级位置
-- 可重复执行：检测到同名根节点已存在则跳过

DO $$
DECLARE
    feibiao_id UUID;
    struct_id UUID;
    elec_id UUID;
    test_id UUID;
BEGIN
    -- 1. 飞镖组（根节点）
    IF NOT EXISTS (SELECT 1 FROM locations WHERE code = '飞镖组' AND parent_id IS NULL) THEN
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('飞镖组', '战队零件主仓库', NULL, 1)
        RETURNING id INTO feibiao_id;

        -- 1a. 结构仓库
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('结构仓库', '结构组零件存放', feibiao_id, 1)
        RETURNING id INTO struct_id;

        -- 结构仓库下的格子
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('A架', '结构A货架', struct_id, 1);
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('B架', '结构B货架', struct_id, 2);

        -- 1b. 电控仓库
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('电控仓库', '电控组零件存放', feibiao_id, 2)
        RETURNING id INTO elec_id;

        -- 电控仓库下的格子
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('电阻柜', '电阻/电容/电感', elec_id, 1);
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('芯片盒', 'MCU/驱动/传感器芯片', elec_id, 2);
    END IF;

    -- 2. 测试仓库（根节点）
    IF NOT EXISTS (SELECT 1 FROM locations WHERE code = '测试仓库' AND parent_id IS NULL) THEN
        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('测试仓库', '测试环境专用，数据与生产隔离', NULL, 2)
        RETURNING id INTO test_id;

        INSERT INTO locations (code, label, parent_id, sort_order)
        VALUES ('测试货架1', '测试零件存放', test_id, 1);
    END IF;
END $$;