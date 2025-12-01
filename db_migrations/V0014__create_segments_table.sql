-- Create segments table with color and order support
CREATE TABLE IF NOT EXISTS t_p43707323_map_portal_creation.segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_segments_order ON t_p43707323_map_portal_creation.segments(order_index);
