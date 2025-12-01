import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SEGMENTS_API = 'https://functions.poehali.dev/a0768bda-66ad-4c1e-b0f8-a32596d094b8';

const COLOR_PALETTE = [
  { name: 'Синий', value: '#3B82F6' },
  { name: 'Красный', value: '#EF4444' },
  { name: 'Зеленый', value: '#10B981' },
  { name: 'Желтый', value: '#F59E0B' },
  { name: 'Фиолетовый', value: '#8B5CF6' },
  { name: 'Розовый', value: '#EC4899' },
  { name: 'Индиго', value: '#6366F1' },
  { name: 'Бирюзовый', value: '#14B8A6' },
  { name: 'Оранжевый', value: '#F97316' },
  { name: 'Голубой', value: '#06B6D4' },
  { name: 'Салатовый', value: '#84CC16' },
  { name: 'Пурпурный', value: '#A855F7' },
];

interface Segment {
  id?: number;
  name: string;
  color: string;
  order_index: number;
}

interface SortableSegmentItemProps {
  segment: Segment;
  onRemove: () => void;
  onColorChange: (color: string) => void;
}

function SortableSegmentItem({ segment, onRemove, onColorChange }: SortableSegmentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.id || segment.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-secondary rounded-md"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <Icon name="GripVertical" size={16} className="text-muted-foreground" />
      </button>
      
      <div
        className="w-6 h-6 rounded border-2 border-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: segment.color }}
      />
      
      <span className="text-sm flex-1">{segment.name}</span>
      
      <div className="flex gap-1">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <Icon name="Palette" size={14} />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Выберите цвет</DialogTitle>
              <DialogDescription>
                Цвет сегмента "{segment.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-3 py-4">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onColorChange(color.value)}
                  className="flex flex-col items-center gap-2 p-2 rounded hover:bg-secondary transition-colors group"
                  title={color.name}
                >
                  <div
                    className="w-12 h-12 rounded-lg border-2 shadow-sm transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: color.value,
                      borderColor: segment.color === color.value ? '#000' : '#fff'
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{color.name}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
        >
          <Icon name="X" size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function SegmentManager() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [newSegment, setNewSegment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      loadSegments();
    }
  }, [open]);

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(SEGMENTS_API, {
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSegments(data);
      }
    } catch (error) {
      console.error('Failed to load segments', error);
      toast.error('Ошибка загрузки сегментов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSegment = () => {
    if (!newSegment.trim()) return;
    
    if (segments.some(s => s.name === newSegment.trim())) {
      toast.error('Такой сегмент уже существует');
      return;
    }
    
    const newSeg: Segment = {
      name: newSegment.trim(),
      color: COLOR_PALETTE[segments.length % COLOR_PALETTE.length].value,
      order_index: segments.length
    };
    
    setSegments([...segments, newSeg]);
    setNewSegment('');
  };

  const handleRemoveSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleColorChange = (index: number, color: string) => {
    setSegments(segments.map((seg, i) => 
      i === index ? { ...seg, color } : seg
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSegments((items) => {
        const oldIndex = items.findIndex(item => 
          (item.id || item.name) === active.id
        );
        const newIndex = items.findIndex(item => 
          (item.id || item.name) === over.id
        );

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(SEGMENTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.token || ''
        },
        body: JSON.stringify({
          segments: segments.map((seg, idx) => ({
            ...seg,
            order_index: idx
          }))
        })
      });

      if (response.ok) {
        toast.success('Список сегментов обновлён!');
        setOpen(false);
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Failed to save segments', error);
      toast.error('Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Icon name="Tags" size={16} className="mr-2" />
          Управление сегментами
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Управление сегментами</DialogTitle>
          <DialogDescription>
            Добавляйте сегменты, назначайте цвета и изменяйте порядок перетаскиванием
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2">
              <Label>Добавить новый сегмент</Label>
              <div className="flex gap-2">
                <Input
                  value={newSegment}
                  onChange={(e) => setNewSegment(e.target.value)}
                  placeholder="Название сегмента"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSegment();
                    }
                  }}
                />
                <Button onClick={handleAddSegment} disabled={!newSegment.trim()}>
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <Label>Текущие сегменты ({segments.length})</Label>
              <div className="border rounded-lg p-3 overflow-y-auto flex-1">
                {segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет сегментов. Добавьте первый сегмент выше.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={segments.map(s => s.id || s.name)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {segments.map((segment, index) => (
                          <SortableSegmentItem
                            key={segment.id || segment.name}
                            segment={segment}
                            onRemove={() => handleRemoveSegment(index)}
                            onColorChange={(color) => handleColorChange(index, color)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Icon name="Loader2" className="animate-spin mr-2" size={16} />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
