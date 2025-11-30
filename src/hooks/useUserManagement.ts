import { useToast } from '@/hooks/use-toast';

export function useUserManagement(ADMIN_API: string, getAuthHeaders: () => Record<string, string>, loadData: () => Promise<void>) {
  const { toast } = useToast();

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'update_role', user_id: userId, role: newRole })
      });

      if (!response.ok) throw new Error('Failed to update role');

      toast({
        title: 'Роль обновлена',
        description: 'Роль пользователя успешно изменена'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive'
      });
    }
  };

  const updateStatus = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'update_status', user_id: userId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: 'Статус обновлён',
        description: 'Статус пользователя успешно изменён'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive'
      });
    }
  };

  return {
    updateRole,
    updateStatus
  };
}
