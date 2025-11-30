import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';

interface AttributeTemplate {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  default_value?: string;
  options?: string;
  sort_order: number;
}

interface AttributeEditorProps {
  object: PolygonObject;
  onSave: (updatedObject: PolygonObject) => void;
  onCancel: () => void;
}

const ADMIN_API = 'https://functions.poehali.dev/3e92b954-4498-4bea-8de7-898ccb110b58';

export default function AttributeEditor({ object, onSave, onCancel }: AttributeEditorProps) {
  const [editedObject, setEditedObject] = useState<PolygonObject>(object);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditedObject(object);
    loadAttributeTemplates();
  }, [object]);

  const loadAttributeTemplates = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?action=attributes`, {
        headers: { 'X-User-Id': localStorage.getItem('userId') || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        
        const newAttributes: Record<string, any> = { ...editedObject.attributes };
        data.forEach((template: AttributeTemplate) => {
          if (!(template.name in newAttributes) && template.default_value) {
            newAttributes[template.name] = template.default_value;
          }
        });
        setEditedObject(prev => ({ ...prev, attributes: newAttributes }));
      }
    } catch (error) {
      console.error('Failed to load attribute templates', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttributeChange = (key: string, value: any) => {
    setEditedObject(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
    
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    templates.forEach(template => {
      if (template.is_required) {
        const value = editedObject.attributes[template.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[template.name] = `${template.name} обязательно для заполнения`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(editedObject);
    }
  };

  const renderField = (template: AttributeTemplate) => {
    const value = editedObject.attributes[template.name] || '';

    switch (template.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleAttributeChange(template.name, e.target.value)}
            placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleAttributeChange(template.name, e.target.value)}
            placeholder={template.default_value || `Введите ${template.name.toLowerCase()}`}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleAttributeChange(template.name, e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={template.default_value || '0'}
          />
        );

      case 'select':
        const options = template.options ? template.options.split(',').map(o => o.trim()) : [];
        return (
          <Select
            value={value}
            onValueChange={(val) => handleAttributeChange(template.name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Выберите ${template.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleAttributeChange(template.name, e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'true' || value === true}
              onCheckedChange={(checked) => handleAttributeChange(template.name, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value === 'true' || value === true ? 'Да' : 'Нет'}
            </span>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleAttributeChange(template.name, e.target.value)}
            placeholder={`Введите ${template.name.toLowerCase()}`}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {templates.map(template => (
          <div key={template.id}>
            <Label htmlFor={template.name} className="text-sm font-semibold">
              {template.name}
              {template.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="mt-2">
              {renderField(template)}
            </div>
            {errors[template.name] && (
              <p className="text-xs text-destructive mt-1">{errors[template.name]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={handleSave} className="flex-1">
          <Icon name="Save" size={16} className="mr-2" />
          Сохранить
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          <Icon name="X" size={16} className="mr-2" />
          Отмена
        </Button>
      </div>
    </div>
  );
}
