import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';

interface AttributeEditorProps {
  object: PolygonObject;
  onSave: (updatedObject: PolygonObject) => void;
  onCancel: () => void;
}

export default function AttributeEditor({ object, onSave, onCancel }: AttributeEditorProps) {
  const [editedObject, setEditedObject] = useState<PolygonObject>(object);
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditedObject(object);
  }, [object]);

  const handleChange = (field: keyof PolygonObject, value: any) => {
    setEditedObject(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    setEditedObject(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const handleAddAttribute = () => {
    if (!newAttributeKey.trim()) {
      setErrors(prev => ({ ...prev, newAttribute: 'Введите название атрибута' }));
      return;
    }

    if (newAttributeKey in editedObject.attributes) {
      setErrors(prev => ({ ...prev, newAttribute: 'Атрибут с таким названием уже существует' }));
      return;
    }

    setEditedObject(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [newAttributeKey]: newAttributeValue }
    }));

    setNewAttributeKey('');
    setNewAttributeValue('');
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.newAttribute;
      return newErrors;
    });
  };

  const handleDeleteAttribute = (key: string) => {
    setEditedObject(prev => {
      const newAttributes = { ...prev.attributes };
      delete newAttributes[key];
      return { ...prev, attributes: newAttributes };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!editedObject.name.trim()) {
      newErrors.name = 'Название обязательно';
    }

    if (!editedObject.type.trim()) {
      newErrors.type = 'Тип обязателен';
    }

    if (editedObject.area <= 0) {
      newErrors.area = 'Площадь должна быть больше 0';
    }

    if (editedObject.population !== undefined && editedObject.population < 0) {
      newErrors.population = 'Население не может быть отрицательным';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(editedObject);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-semibold">
            Название объекта
          </Label>
          <Input
            id="name"
            value={editedObject.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Введите название"
            className="mt-2"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="type" className="text-sm font-semibold">
            Тип объекта
          </Label>
          <Input
            id="type"
            value={editedObject.type}
            onChange={(e) => handleChange('type', e.target.value)}
            placeholder="Введите тип"
            className="mt-2"
          />
          {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
        </div>

        <div>
          <Label htmlFor="status" className="text-sm font-semibold">
            Статус
          </Label>
          <Input
            id="status"
            value={editedObject.status}
            onChange={(e) => handleChange('status', e.target.value)}
            placeholder="Введите статус"
            className="mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="area" className="text-sm font-semibold">
              Площадь (км²)
            </Label>
            <Input
              id="area"
              type="number"
              step="0.1"
              value={editedObject.area}
              onChange={(e) => handleChange('area', parseFloat(e.target.value) || 0)}
              placeholder="0.0"
              className="mt-2"
            />
            {errors.area && <p className="text-xs text-destructive mt-1">{errors.area}</p>}
          </div>

          <div>
            <Label htmlFor="population" className="text-sm font-semibold">
              Население
            </Label>
            <Input
              id="population"
              type="number"
              value={editedObject.population || ''}
              onChange={(e) => handleChange('population', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Не указано"
              className="mt-2"
            />
            {errors.population && <p className="text-xs text-destructive mt-1">{errors.population}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="layer" className="text-sm font-semibold">
            Слой
          </Label>
          <Input
            id="layer"
            value={editedObject.layer}
            onChange={(e) => handleChange('layer', e.target.value)}
            placeholder="Введите название слоя"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="color" className="text-sm font-semibold">
            Цвет
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="color"
              type="color"
              value={editedObject.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-20 h-10 p-1"
            />
            <Input
              value={editedObject.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold">Дополнительные атрибуты</Label>
          <Badge variant="secondary">
            {Object.keys(editedObject.attributes).length}
          </Badge>
        </div>

        <Card className="p-4 space-y-3 mb-3">
          {Object.entries(editedObject.attributes).length > 0 ? (
            Object.entries(editedObject.attributes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={key}
                    disabled
                    className="bg-muted"
                  />
                  <Input
                    value={value as string}
                    onChange={(e) => handleAttributeChange(key, e.target.value)}
                    placeholder="Значение"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteAttribute(key)}
                  className="flex-shrink-0"
                >
                  <Icon name="Trash2" size={16} className="text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Дополнительные атрибуты отсутствуют
            </p>
          )}
        </Card>

        <Card className="p-4 bg-muted/50">
          <Label className="text-xs font-semibold mb-2 block">Добавить новый атрибут</Label>
          <div className="flex gap-2">
            <Input
              value={newAttributeKey}
              onChange={(e) => setNewAttributeKey(e.target.value)}
              placeholder="Название"
              className="flex-1"
            />
            <Input
              value={newAttributeValue}
              onChange={(e) => setNewAttributeValue(e.target.value)}
              placeholder="Значение"
              className="flex-1"
            />
            <Button
              onClick={handleAddAttribute}
              size="icon"
              variant="secondary"
            >
              <Icon name="Plus" size={16} />
            </Button>
          </div>
          {errors.newAttribute && (
            <p className="text-xs text-destructive mt-2">{errors.newAttribute}</p>
          )}
        </Card>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <Icon name="X" size={16} className="mr-2" />
          Отмена
        </Button>
        <Button onClick={handleSave} className="flex-1">
          <Icon name="Check" size={16} className="mr-2" />
          Сохранить
        </Button>
      </div>
    </div>
  );
}
