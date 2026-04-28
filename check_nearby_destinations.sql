-- 检查周边推荐目的地
-- 1. 查看所有目的地的推荐类型
SELECT id, name, city, state, country, is_domestic, recommendation_type 
FROM destinations 
ORDER BY id;

-- 2. 查看标记为nearby的目的地数量
SELECT COUNT(*) as nearby_count 
FROM destinations 
WHERE JSON_CONTAINS(recommendation_type, '"nearby"');

-- 3. 查看所有有nearby标记的目的地详情
SELECT id, name, city, state, country, is_domestic, rating, views, sort_order, recommendation_type 
FROM destinations 
WHERE JSON_CONTAINS(recommendation_type, '"nearby"')
ORDER BY sort_order, -rating, -views;

-- 4. 如果没有nearby标记的目的地，可以将一些国内目的地更新为包含nearby
-- 示例：将前10个国内热门目的地添加nearby标记
UPDATE destinations 
SET recommendation_type = JSON_ARRAY_APPEND(
    IF(recommendation_type IS NULL OR JSON_LENGTH(recommendation_type) = 0, 
       JSON_ARRAY('default'), 
       recommendation_type),
    '$', 'nearby'
)
WHERE is_domestic = TRUE 
  AND is_hot = TRUE
  AND NOT JSON_CONTAINS(recommendation_type, '"nearby"')
LIMIT 10;

-- 5. 验证更新结果
SELECT id, name, city, state, recommendation_type 
FROM destinations 
WHERE JSON_CONTAINS(recommendation_type, '"nearby"')
ORDER BY id;

-- 6. 如果需要，可以为所有国内目的地添加nearby标记（谨慎使用）
-- UPDATE destinations 
-- SET recommendation_type = JSON_ARRAY_APPEND(
--     IF(recommendation_type IS NULL OR JSON_LENGTH(recommendation_type) = 0, 
--        JSON_ARRAY('default'), 
--        recommendation_type),
--     '$', 'nearby'
-- )
-- WHERE is_domestic = TRUE 
--   AND NOT JSON_CONTAINS(recommendation_type, '"nearby"');
