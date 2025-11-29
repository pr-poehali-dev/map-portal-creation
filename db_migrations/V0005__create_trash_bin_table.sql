CREATE TABLE trash_polygons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    area DECIMAL(10, 2),
    population INTEGER,
    status TEXT NOT NULL,
    coordinates JSONB NOT NULL,
    color TEXT NOT NULL DEFAULT '#FF0000',
    layer TEXT NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT true,
    attributes JSONB DEFAULT '{}',
    user_id TEXT NOT NULL,
    original_created_at TIMESTAMP NOT NULL,
    moved_to_trash_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    moved_by_user TEXT NOT NULL
);

CREATE INDEX idx_trash_polygons_moved_by ON trash_polygons(moved_by_user);
CREATE INDEX idx_trash_polygons_moved_at ON trash_polygons(moved_to_trash_at);
CREATE INDEX idx_trash_polygons_layer ON trash_polygons(layer);