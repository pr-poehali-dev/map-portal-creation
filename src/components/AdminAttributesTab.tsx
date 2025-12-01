import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';

interface AttributeTemplate {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  default_value?: string;
  options?: string;
  sort_order: number;
}

interface AdminAttributesTabProps {
  attributes: AttributeTemplate[];
  onCreateAttribute: (data: Omit<AttributeTemplate, 'id'>) => void;
  onUpdateAttribute: (id: number, data: Partial<AttributeTemplate>) => void;
  onDeleteAttribute: (id: number) => void;
  onReorderAttributes: (attributes: AttributeTemplate[]) => void;
}

export default function AdminAttributesTab({
  attributes,
  onCreateAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
  onReorderAttributes
}: AdminAttributesTabProps) {
  const [dialog, setDialog] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<AttributeTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text',
    is_required: false,
    default_value: '',
    options: ''
  });

  const handleOpenDialog = (attribute?: AttributeTemplate) => {
    if (attribute) {
      setEditingAttribute(attribute);
      setFormData({
        name: attribute.name,
        field_type: attribute.field_type,
        is_required: attribute.is_required,
        default_value: attribute.default_value || '',
        options: attribute.options || ''
      });
    } else {
      setEditingAttribute(null);
      setFormData({
        name: '',
        field_type: 'text',
        is_required: false,
        default_value: '',
        options: ''
      });
    }
    setDialog(true);
  };

  const handleSave = () => {
    if (editingAttribute) {
      onUpdateAttribute(editingAttribute.id, formData);
    } else {
      onCreateAttribute({
        ...formData,
        sort_order: attributes.length
      });
    }
    setDialog(false);
  };

  const moveAttribute = (index: number, direction: 'up' | 'down') => {
    const newAttributes = [...attributes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newAttributes.length) return;
    
    [newAttributes[index], newAttributes[targetIndex]] = 
    [newAttributes[targetIndex], newAttributes[index]];
    
    const reorderedAttributes = newAttributes.map((attr, idx) => ({
      ...attr,
      sort_order: idx
    }));
    
    onReorderAttributes(reorderedAttributes);
  };

  const fieldTypes = [
    { value: 'text', label: 'Текст' },
    { value: 'textarea', label: 'Многострочный текст' },
    { value: 'number', label: 'Число' },
    { value: 'select', label: 'Выпадающий список' },
    { value: 'date', label: 'Дата' },
    { value: 'checkbox', label: 'Флажок' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Настройка атрибутов участков</h3>
          <p className="text-sm text-muted-foreground">
            Настройте список полей, которые будут отображаться при редактировании участков
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить атрибут
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Порядок</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Тип поля</TableHead>
              <TableHead>Обязательное</TableHead>
              <TableHead>Значение по умолчанию</TableHead>
              <TableHead className="w-32 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Атрибуты не настроены
                </TableCell>
              </TableRow>
            ) : (
              attributes.map((attr, index) => (
                <TableRow key={attr.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAttribute(index, 'up')}
                        disabled={index === 0}
                      >
                        <Icon name="ChevronUp" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAttribute(index, 'down')}
                        disabled={index === attributes.length - 1}
                      >
                        <Icon name="ChevronDown" size={16} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{attr.name}</TableCell>
                  <TableCell className="text-foreground">
                    {fieldTypes.find(t => t.value === attr.field_type)?.label}
                  </TableCell>
                  <TableCell>
                    {attr.is_required ? (
                      <span className="text-red-400">Да</span>
                    ) : (
                      <span className="text-foreground/60">Нет</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/60">
                    {attr.default_value || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(attr)}
                      >
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAttribute(attr.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? 'Редактировать атрибут' : 'Добавить атрибут'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название атрибута</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Кадастровый номер"
              />
            </div>

            <div>
              <Label htmlFor="field_type">Тип поля</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) => setFormData({ ...formData, field_type: value })}
              >
                <SelectTrigger id="field_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.field_type === 'select' && (
              <div>
                <Label htmlFor="options">Варианты выбора</Label>
                <Input
                  id="options"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Вариант 1, Вариант 2, Вариант 3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Перечислите варианты через запятую
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="default_value">Значение по умолчанию</Label>
              <Input
                id="default_value"
                value={formData.default_value}
                onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                placeholder="Оставьте пустым, если не требуется"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">Обязательное поле</Label>
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              {editingAttribute ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}