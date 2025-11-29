ALTER TABLE polygon_objects RENAME TO polygon_objects_old_data;

CREATE TABLE polygon_objects (
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);