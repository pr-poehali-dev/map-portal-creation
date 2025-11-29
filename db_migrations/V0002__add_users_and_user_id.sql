-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id column to polygon_objects
ALTER TABLE polygon_objects ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_polygon_objects_user_id ON polygon_objects(user_id);