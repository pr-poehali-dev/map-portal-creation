import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import Icon from '@/components/ui/icon';

interface Segment {
  id: number;
  name: string;
  color: string;
  order_index: number;
}

interface AdminSegmentsTabProps {
  segments: Segment[];
  onCreateSegment: (data: Omit<Segment, 'id'>) => void;
  onUpdateSegment: (id: number, data: Partial<Segment>) => void;
  onDeleteSegment: (id: number) => void;
  onReorderSegments: (segments: Segment[]) => void;
}

export default function AdminSegmentsTab({
  segments,
  onCreateSegment,
  onUpdateSegment,
  onDeleteSegment,
  onReorderSegments
}: AdminSegmentsTabProps) {
  const [dialog, setDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6'
  });

  const handleOpenDialog = (segment?: Segment) => {
    if (segment) {
      setEditingSegment(segment);
      setFormData({
        name: segment.name,
        color: segment.color
      });
    } else {
      setEditingSegment(null);
      setFormData({
        name: '',
        color: '#3B82F6'
      });
    }
    setDialog(true);
  };

  const handleSave = () => {
    if (editingSegment) {
      onUpdateSegment(editingSegment.id, formData);
    } else {
      onCreateSegment({
        ...formData,
        order_index: segments.length
      });
    }
    setDialog(false);
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newSegments = [...segments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSegments.length) return;
    
    [newSegments[index], newSegments[targetIndex]] = 
    [newSegments[targetIndex], newSegments[index]];
    
    const reorderedSegments = newSegments.map((seg, idx) => ({
      ...seg,
      order_index: idx
    }));
    
    onReorderSegments(reorderedSegments);
  };

  const presetColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Настройка сегментов</h3>
          <p className="text-sm text-muted-foreground">
            Создайте сегменты для группировки участков. Они будут доступны в поле "Сегмент"
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить сегмент
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Порядок</TableHead>
              <TableHead className="w-12">Цвет</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="w-32 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Сегменты не настроены
                </TableCell>
              </TableRow>
            ) : (
              segments.map((segment, index) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSegment(index, 'up')}
                        disabled={index === 0}
                      >
                        <Icon name="ChevronUp" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSegment(index, 'down')}
                        disabled={index === segments.length - 1}
                      >
                        <Icon name="ChevronDown" size={16} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: segment.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{segment.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(segment)}
                      >
                        <Icon name="Pencil" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSegment(segment.id)}
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
              {editingSegment ? 'Редактировать сегмент' : 'Добавить сегмент'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название сегмента</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Жилая зона"
              />
            </div>

            <div>
              <Label htmlFor="color">Цвет</Label>
              <div className="flex gap-2 items-center mt-2">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      formData.color === color ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-8 p-1"
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Предпросмотр:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="font-medium">{formData.name || 'Название сегмента'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingSegment ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
