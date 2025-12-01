-- Insert default segments with colors
INSERT INTO t_p43707323_map_portal_creation.segments (name, color, order_index) 
VALUES 
  ('Жилая застройка', '#3B82F6', 0),
  ('Коммерция', '#EF4444', 1),
  ('Промышленность', '#F59E0B', 2),
  ('Парки и отдых', '#10B981', 3),
  ('Инфраструктура', '#8B5CF6', 4)
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color, order_index = EXCLUDED.order_index;
