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

const ADMIN_API = 'https://functions.poehali.dev/083b2a5f-b050-44a3-b56d-a27ca04ec81b';

interface AttributeTemplate {
  id: number;
  name: string;
  field_type: string;
  options?: string;
}

export default function SegmentManager() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [segments, setSegments] = useState<string[]>([]);
  const [newSegment, setNewSegment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentAttribute, setSegmentAttribute] = useState<AttributeTemplate | null>(null);

  useEffect(() => {
    if (open) {
      loadSegments();
    }
  }, [open]);

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${ADMIN_API}?action=attributes`, {
        headers: { 'X-User-Id': user?.token || '' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const segmentAttr = data.find((attr: AttributeTemplate) => 
          attr.name.toLowerCase() === 'сегмент'
        );
        
        if (segmentAttr) {
          setSegmentAttribute(segmentAttr);
          const segmentList = segmentAttr.options 
            ? segmentAttr.options.split(',').map(s => s.trim()).filter(Boolean)
            : [];
          setSegments(segmentList);
        }
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
    
    if (segments.includes(newSegment.trim())) {
      toast.error('Такой сегмент уже существует');
      return;
    }
    
    setSegments([...segments, newSegment.trim()]);
    setNewSegment('');
  };

  const handleRemoveSegment = (segment: string) => {
    setSegments(segments.filter(s => s !== segment));
  };

  const handleSave = async () => {
    if (!segmentAttribute) {
      toast.error('Атрибут "Сегмент" не найден');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.token || ''
        },
        body: JSON.stringify({
          action: 'update_attribute',
          id: segmentAttribute.id,
          name: segmentAttribute.name,
          field_type: segmentAttribute.field_type,
          options: segments.join(', ')
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Управление сегментами</DialogTitle>
          <DialogDescription>
            Добавляйте и удаляйте сегменты для категоризации участков
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label>Текущие сегменты ({segments.length})</Label>
              <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2">
                {segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет сегментов. Добавьте первый сегмент выше.
                  </p>
                ) : (
                  segments.map((segment) => (
                    <div
                      key={segment}
                      className="flex items-center justify-between p-2 bg-secondary rounded-md"
                    >
                      <span className="text-sm">{segment}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveSegment(segment)}
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </div>
                  ))
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
