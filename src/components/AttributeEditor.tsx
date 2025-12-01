import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeWithAI } from '@/services/ai';
import { toast } from 'sonner';

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

const ADMIN_API = 'https://functions.poehali.dev/083b2a5f-b050-44a3-b56d-a27ca04ec81b';

export default function AttributeEditor({ object, onSave, onCancel }: AttributeEditorProps) {
  const { user } = useAuth();
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
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        
        setEditedObject(prev => {
          console.log('📝 Existing attributes from object:', prev.attributes);
          const newAttributes: Record<string, any> = { ...prev.attributes };
          data.forEach((template: AttributeTemplate) => {
            if (!(template.name in newAttributes) && template.default_value) {
              console.log(`➕ Adding default value for ${template.name}: ${template.default_value}`);
              newAttributes[template.name] = template.default_value;
            }
          });
          console.log('✅ Final attributes:', newAttributes);
          return { ...prev, attributes: newAttributes };
        });
      }
    } catch (error) {
      console.error('Failed to load attribute templates', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttributeChange = (templateName: string, value: any) => {
    setEditedObject(prev => {
      const existingKey = Object.keys(prev.attributes).find(
        key => key.toLowerCase() === templateName.toLowerCase()
      ) || templateName;
      
      return {
        ...prev,
        attributes: { ...prev.attributes, [existingKey]: value }
      };
    });
    
    if (errors[templateName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[templateName];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!editedObject.name || !editedObject.name.trim()) {
      newErrors['name'] = 'Название обязательно для заполнения';
    }

    templates
      .filter(template => template.name.toLowerCase() !== 'название')
      .forEach(template => {
        if (template.is_required) {
          const existingKey = Object.keys(editedObject.attributes).find(
            key => key.toLowerCase() === template.name.toLowerCase()
          );
          const value = existingKey ? editedObject.attributes[existingKey] : '';
          
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

  const handleAutoFill = async () => {
    try {
      toast.info('Заполняю атрибуты через AI...');
      const response = await analyzeWithAI({
        objectData: {
          name: editedObject.name,
          type: editedObject.type,
          area: editedObject.area,
          layer: editedObject.layer,
          cadastralNumber: editedObject.cadastralNumber,
          coordinates: editedObject.coordinates,
        },
        mode: 'auto-fill',
      });

      const suggestions = JSON.parse(response.result);
      
      setEditedObject(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          ...suggestions,
        },
      }));

      toast.success('Атрибуты успешно заполнены!');
    } catch (error: any) {
      toast.error('Ошибка автозаполнения. Проверьте OpenAI API ключ.');
    }
  };

  const renderField = (template: AttributeTemplate) => {
    const attributeKey = Object.keys(editedObject.attributes).find(
      key => key.toLowerCase() === template.name.toLowerCase()
    ) || template.name;
    
    const value = editedObject.attributes[attributeKey] || '';

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

      case 'conditional_dates': {
        const statusOptions = template.options ? template.options.split(',').map(o => o.trim()) : [];
        const conditionalValue = typeof value === 'object' ? value : { status: '', dateFrom: '', dateTo: '' };
        
        const handleDateFromChange = (newDateFrom: string) => {
          const updatedValue = { ...conditionalValue, dateFrom: newDateFrom };
          
          if (conditionalValue.status === 'Аренда' && newDateFrom && !conditionalValue.dateTo) {
            const fromDate = new Date(newDateFrom);
            fromDate.setFullYear(fromDate.getFullYear() + 49);
            updatedValue.dateTo = fromDate.toISOString().split('T')[0];
          }
          
          handleAttributeChange(template.name, updatedValue);
        };
        
        return (
          <div className="space-y-3">
            <Select
              value={conditionalValue.status || ''}
              onValueChange={(val) => handleAttributeChange(template.name, { ...conditionalValue, status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {conditionalValue.status && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Дата ОТ</Label>
                  <Input
                    type="date"
                    value={conditionalValue.dateFrom || ''}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                  />
                </div>
                
                {conditionalValue.status === 'Аренда' && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Дата ДО</Label>
                    <Input
                      type="date"
                      value={conditionalValue.dateTo || ''}
                      onChange={(e) => handleAttributeChange(template.name, { ...conditionalValue, dateTo: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

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
        <div>
          <Label htmlFor="name" className="text-sm font-semibold">
            Название
            <span className="text-destructive ml-1">*</span>
          </Label>
          <div className="mt-2">
            <Input
              id="name"
              value={editedObject.name}
              onChange={(e) => setEditedObject(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название участка"
            />
          </div>
          {errors['name'] && (
            <p className="text-xs text-destructive mt-1">{errors['name']}</p>
          )}
        </div>

        {templates
          .filter(template => template.name.toLowerCase() !== 'название')
          .map(template => (
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
        <Button onClick={handleAutoFill} variant="outline" className="flex-1">
          <Icon name="Sparkles" size={16} className="mr-2" />
          AI Заполнение
        </Button>
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