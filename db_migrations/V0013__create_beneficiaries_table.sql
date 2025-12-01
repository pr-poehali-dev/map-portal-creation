-- Создаем таблицу для реестра бенефициаров
CREATE TABLE IF NOT EXISTS t_p43707323_map_portal_creation.beneficiaries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индекс для быстрого поиска по названию
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name ON t_p43707323_map_portal_creation.beneficiaries(name);

-- Заполняем начальными данными из существующих участков
INSERT INTO t_p43707323_map_portal_creation.beneficiaries (name)
SELECT DISTINCT 
    attributes->>'Бенефициар' as name
FROM t_p43707323_map_portal_creation.polygon_objects
WHERE attributes->>'Бенефициар' IS NOT NULL 
  AND attributes->>'Бенефициар' != ''
ON CONFLICT (name) DO NOTHING;

-- Альтернативный вариант для поиска с маленькой буквы
INSERT INTO t_p43707323_map_portal_creation.beneficiaries (name)
SELECT DISTINCT 
    attributes->>'бенефициар' as name
FROM t_p43707323_map_portal_creation.polygon_objects
WHERE attributes->>'бенефициар' IS NOT NULL 
  AND attributes->>'бенефициар' != ''
  AND NOT EXISTS (
    SELECT 1 FROM t_p43707323_map_portal_creation.beneficiaries 
    WHERE name = attributes->>'бенефициар'
  )
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE t_p43707323_map_portal_creation.beneficiaries IS 'Реестр групп компаний (бенефициаров) для автодополнения';
COMMENT ON COLUMN t_p43707323_map_portal_creation.beneficiaries.name IS 'Название группы компаний';