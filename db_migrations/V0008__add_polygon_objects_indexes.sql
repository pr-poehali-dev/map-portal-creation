CREATE INDEX IF NOT EXISTS idx_polygons_layer ON polygon_objects(layer);
CREATE INDEX IF NOT EXISTS idx_polygons_user ON polygon_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_polygons_type ON polygon_objects(type);