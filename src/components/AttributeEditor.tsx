import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeWithAI } from '@/services/ai';
import { toast } from 'sonner';
import func2url from '../../backend/func2url.json';
import AttributeFieldRenderer from './AttributeEditor/AttributeFieldRenderer';

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
  const [beneficiaries, setBeneficiaries] = useState<string[]>([]);

  useEffect(() => {
    setEditedObject(object);
    loadAttributeTemplates();
    loadBeneficiaries();
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

  const loadBeneficiaries = async () => {
    try {
      const response = await fetch(`${func2url.polygons}?action=list`, {
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const uniqueBeneficiaries = Array.from(
          new Set(
            data
              .map((p: any) => p.attributes?.['Бенефициар'] || p.attributes?.['бенефициар'])
              .filter(Boolean)
          )
        ) as string[];
        setBeneficiaries(uniqueBeneficiaries);
      }
    } catch (error) {
      console.error('Failed to load beneficiaries', error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="Loader2" className="animate-spin" size={32} />
      </div>
    );
  }

  const sortedTemplates = [...templates].sort((a, b) => a.sort_order - b.sort_order);
  const nameTemplate = sortedTemplates.find(t => t.name.toLowerCase() === 'название');
  const otherTemplates = sortedTemplates.filter(t => t.name.toLowerCase() !== 'название');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Редактировать атрибуты</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoFill}>
            <Icon name="Sparkles" size={16} />
            <span className="ml-2">AI Автозаполнение</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <Icon name="X" size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {nameTemplate && (
            <div className="space-y-2">
              <Label>
                {nameTemplate.name}
                {nameTemplate.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                value={editedObject.name}
                onChange={(e) => {
                  setEditedObject(prev => ({ ...prev, name: e.target.value }));
                  if (errors['name']) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['name'];
                      return newErrors;
                    });
                  }
                }}
                placeholder={nameTemplate.default_value || 'Введите название'}
              />
              {errors['name'] && (
                <p className="text-sm text-destructive">{errors['name']}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Сегмент</Label>
            <AttributeFieldRenderer
              template={{
                id: -1,
                name: 'Сегмент',
                field_type: 'select',
                is_required: false,
                options: '',
                sort_order: -1
              }}
              value={editedObject.segment || ''}
              onChange={(val) => setEditedObject(prev => ({ ...prev, segment: val }))}
              beneficiaries={[]}
            />
          </div>

          {otherTemplates.map(template => {
            const attributeKey = Object.keys(editedObject.attributes).find(
              key => key.toLowerCase() === template.name.toLowerCase()
            ) || template.name;
            
            const value = editedObject.attributes[attributeKey] || '';

            return (
              <div key={template.id} className="space-y-2">
                <Label>
                  {template.name}
                  {template.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <AttributeFieldRenderer
                  template={template}
                  value={value}
                  onChange={(val) => handleAttributeChange(template.name, val)}
                  beneficiaries={beneficiaries}
                />
                {errors[template.name] && (
                  <p className="text-sm text-destructive">{errors[template.name]}</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 p-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}