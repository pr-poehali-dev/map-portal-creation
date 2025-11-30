import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function usePermissionManagement(ADMIN_API: string, getAuthHeaders: () => Record<string, string>, loadData: () => Promise<void>) {
  const { toast } = useToast();
  
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPermission, setNewPermission] = useState({
    resource_type: 'layer',
    resource_id: '',
    permission_level: 'read'
  });

  const grantPermission = async () => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'grant_permission',
          user_id: selectedUserId,
          ...newPermission
        })
      });

      if (!response.ok) throw new Error('Failed to grant permission');

      toast({
        title: 'Доступ предоставлен',
        description: 'Права доступа успешно назначены'
      });
      
      setPermissionDialog(false);
      setNewPermission({ resource_type: 'layer', resource_id: '', permission_level: 'read' });
      setSelectedUserId('');
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось предоставить доступ',
        variant: 'destructive'
      });
    }
  };

  const revokePermission = async (permissionId: number) => {
    try {
      const response = await fetch(`${ADMIN_API}?permission_id=${permissionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to revoke permission');

      toast({
        title: 'Доступ отозван',
        description: 'Права доступа успешно удалены'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отозвать доступ',
        variant: 'destructive'
      });
    }
  };

  return {
    permissionDialog,
    setPermissionDialog,
    selectedUserId,
    setSelectedUserId,
    newPermission,
    setNewPermission,
    grantPermission,
    revokePermission
  };
}
