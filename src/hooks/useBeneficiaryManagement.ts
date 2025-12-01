import { useToast } from '@/hooks/use-toast';

export function useBeneficiaryManagement(
  ADMIN_API: string,
  getAuthHeaders: () => Record<string, string>,
  loadData: () => Promise<void>
) {
  const { toast } = useToast();

  const addBeneficiary = async (name: string) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'create_beneficiary',
          name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add beneficiary');
      }

      await loadData();
      return true;
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить бенефициара',
        variant: 'destructive'
      });
      return false;
    }
  };

  const removeBeneficiary = async (name: string) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'delete_beneficiary',
          name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove beneficiary');
      }

      await loadData();
      return true;
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить бенефициара',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    addBeneficiary,
    removeBeneficiary
  };
}
