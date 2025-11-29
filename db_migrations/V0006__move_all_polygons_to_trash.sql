INSERT INTO trash_polygons (
    id, name, type, area, population, status, 
    coordinates, color, layer, visible, attributes, 
    user_id, original_created_at, moved_by_user
)
SELECT 
    id, name, type, area, population, status,
    coordinates, color, layer, visible, attributes,
    user_id, created_at, '-bBHrU6NrMm3iAVa7qYH1yhqulW8XyVLD-vrG26vPeg'
FROM polygon_objects;

UPDATE polygon_objects SET id = NULL WHERE 1=0;