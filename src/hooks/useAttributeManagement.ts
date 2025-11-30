import { useToast } from '@/hooks/use-toast';
import { AttributeTemplate } from './useAdminData';

export function useAttributeManagement(
  ADMIN_API: string, 
  getAuthHeaders: () => Record<string, string>, 
  loadData: () => Promise<void>,
  setAttributes: React.Dispatch<React.SetStateAction<AttributeTemplate[]>>
) {
  const { toast } = useToast();

  const createAttribute = async (data: Omit<AttributeTemplate, 'id'>) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'create_attribute', ...data })
      });

      if (!response.ok) throw new Error('Failed to create attribute');

      toast({ title: 'Атрибут создан', description: 'Новый атрибут успешно добавлен' });
      loadData();
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать атрибут', variant: 'destructive' });
    }
  };

  const updateAttribute = async (id: number, data: Partial<AttributeTemplate>) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'update_attribute', id, ...data })
      });

      if (!response.ok) throw new Error('Failed to update attribute');

      toast({ title: 'Атрибут обновлён', description: 'Атрибут успешно изменён' });
      loadData();
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить атрибут', variant: 'destructive' });
    }
  };

  const deleteAttribute = async (id: number) => {
    try {
      const response = await fetch(`${ADMIN_API}?attribute_id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete attribute');

      toast({ title: 'Атрибут удалён', description: 'Атрибут успешно удалён' });
      loadData();
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить атрибут', variant: 'destructive' });
    }
  };

  const reorderAttributes = async (reorderedAttributes: AttributeTemplate[]) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          action: 'reorder_attributes', 
          attributes: reorderedAttributes.map(a => ({ id: a.id, sort_order: a.sort_order }))
        })
      });

      if (!response.ok) throw new Error('Failed to reorder attributes');

      setAttributes(reorderedAttributes);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить порядок', variant: 'destructive' });
      loadData();
    }
  };

  return {
    createAttribute,
    updateAttribute,
    deleteAttribute,
    reorderAttributes
  };
}
