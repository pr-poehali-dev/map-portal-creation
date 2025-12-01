-- Добавляем поля из ЕГРЮЛ для таблицы companies
ALTER TABLE t_p43707323_map_portal_creation.companies 
ADD COLUMN IF NOT EXISTS kpp VARCHAR(9),
ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15),
ADD COLUMN IF NOT EXISTS short_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS okved VARCHAR(50),
ADD COLUMN IF NOT EXISTS management_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS management_post VARCHAR(500),
ADD COLUMN IF NOT EXISTS company_type VARCHAR(50);

-- Создаем индекс для быстрого поиска по ИНН
CREATE INDEX IF NOT EXISTS idx_companies_inn ON t_p43707323_map_portal_creation.companies(inn);

-- Добавляем комментарии к полям
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.kpp IS 'КПП организации';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.ogrn IS 'ОГРН организации';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.short_name IS 'Краткое наименование с ОПФ';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.registration_date IS 'Дата регистрации';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.okved IS 'Код ОКВЭД';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.management_name IS 'ФИО руководителя';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.management_post IS 'Должность руководителя';
COMMENT ON COLUMN t_p43707323_map_portal_creation.companies.company_type IS 'Тип организации (LEGAL, INDIVIDUAL)';