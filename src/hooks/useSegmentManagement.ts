import { useToast } from '@/hooks/use-toast';

interface Segment {
  id: number;
  name: string;
  color: string;
  order_index: number;
}

export function useSegmentManagement(
  SEGMENTS_API: string,
  getAuthHeaders: () => Record<string, string>,
  loadData: () => void
) {
  const { toast } = useToast();

  const createSegment = async (data: Omit<Segment, 'id'>) => {
    try {
      const res = await fetch(SEGMENTS_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error('Failed to create segment');

      toast({
        title: 'Успешно',
        description: 'Сегмент создан'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать сегмент',
        variant: 'destructive'
      });
    }
  };

  const updateSegment = async (id: number, data: Partial<Segment>) => {
    try {
      const res = await fetch(SEGMENTS_API, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, ...data })
      });

      if (!res.ok) throw new Error('Failed to update segment');

      toast({
        title: 'Успешно',
        description: 'Сегмент обновлён'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить сегмент',
        variant: 'destructive'
      });
    }
  };

  const deleteSegment = async (id: number) => {
    try {
      const res = await fetch(`${SEGMENTS_API}?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete segment');

      toast({
        title: 'Успешно',
        description: 'Сегмент удалён'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить сегмент',
        variant: 'destructive'
      });
    }
  };

  const reorderSegments = async (segments: Segment[]) => {
    try {
      const updates = segments.map(seg => 
        updateSegment(seg.id, { order_index: seg.order_index })
      );
      await Promise.all(updates);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить порядок',
        variant: 'destructive'
      });
    }
  };

  return {
    createSegment,
    updateSegment,
    deleteSegment,
    reorderSegments
  };
}
