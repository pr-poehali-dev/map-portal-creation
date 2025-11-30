CREATE TABLE IF NOT EXISTS attribute_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  options TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attribute_templates_sort_order ON attribute_templates(sort_order);

INSERT INTO attribute_templates (name, field_type, is_required, sort_order) VALUES
  ('Название', 'text', true, 1),
  ('Описание', 'textarea', false, 2),
  ('Категория', 'select', false, 3),
  ('Площадь (га)', 'number', false, 4),
  ('Статус', 'select', false, 5);
