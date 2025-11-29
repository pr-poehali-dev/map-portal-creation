CREATE TABLE polygon_objects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    area NUMERIC NOT NULL CHECK (area > 0),
    population INTEGER CHECK (population >= 0),
    status TEXT NOT NULL,
    coordinates JSONB NOT NULL,
    color TEXT NOT NULL,
    layer TEXT NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT true,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_polygon_objects_name ON polygon_objects(name);
CREATE INDEX idx_polygon_objects_type ON polygon_objects(type);
CREATE INDEX idx_polygon_objects_layer ON polygon_objects(layer);
CREATE INDEX idx_polygon_objects_status ON polygon_objects(status);
CREATE INDEX idx_polygon_objects_visible ON polygon_objects(visible);
CREATE INDEX idx_polygon_objects_created_at ON polygon_objects(created_at);

COMMENT ON TABLE polygon_objects IS 'Хранение полигональных объектов для картографического портала';
COMMENT ON COLUMN polygon_objects.id IS 'Уникальный идентификатор объекта';
COMMENT ON COLUMN polygon_objects.name IS 'Название объекта';
COMMENT ON COLUMN polygon_objects.type IS 'Тип объекта (административный округ, промзона, и т.д.)';
COMMENT ON COLUMN polygon_objects.area IS 'Площадь объекта в км²';
COMMENT ON COLUMN polygon_objects.population IS 'Население объекта (если применимо)';
COMMENT ON COLUMN polygon_objects.status IS 'Статус объекта (активный, развитие, и т.д.)';
COMMENT ON COLUMN polygon_objects.coordinates IS 'Массив координат полигона в формате JSON [[x1,y1], [x2,y2], ...]';
COMMENT ON COLUMN polygon_objects.color IS 'Цвет отображения объекта в формате HEX';
COMMENT ON COLUMN polygon_objects.layer IS 'Слой, к которому принадлежит объект';
COMMENT ON COLUMN polygon_objects.visible IS 'Видимость объекта на карте';
COMMENT ON COLUMN polygon_objects.attributes IS 'Дополнительные атрибуты объекта в формате JSON';
COMMENT ON COLUMN polygon_objects.created_at IS 'Дата и время создания записи';
COMMENT ON COLUMN polygon_objects.updated_at IS 'Дата и время последнего обновления записи';