import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Company } from './useAdminData';

export function useCompanyManagement(ADMIN_API: string, getAuthHeaders: () => Record<string, string>, loadData: () => Promise<void>) {
  const { toast } = useToast();
  
  const [companyDialog, setCompanyDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    id: '',
    name: '',
    description: '',
    inn: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  });

  const createCompany = async () => {
    try {
      const companyId = Date.now().toString();
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'create_company',
          id: companyId,
          ...newCompany
        })
      });

      if (!response.ok) throw new Error('Failed to create company');

      toast({
        title: 'Компания создана',
        description: 'Новая компания успешно добавлена'
      });
      
      setCompanyDialog(false);
      setNewCompany({ id: '', name: '', description: '', inn: '', address: '', phone: '', email: '', website: '' });
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать компанию',
        variant: 'destructive'
      });
    }
  };

  const updateCompany = async () => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update_company',
          id: editingCompany?.id,
          ...newCompany
        })
      });

      if (!response.ok) throw new Error('Failed to update company');

      toast({
        title: 'Компания обновлена',
        description: 'Данные компании успешно изменены'
      });
      
      setCompanyDialog(false);
      setEditingCompany(null);
      setNewCompany({ id: '', name: '', description: '', inn: '', address: '', phone: '', email: '', website: '' });
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить компанию',
        variant: 'destructive'
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      const response = await fetch(`${ADMIN_API}?company_id=${companyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete company');

      toast({
        title: 'Компания удалена',
        description: 'Компания успешно удалена из системы'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить компанию',
        variant: 'destructive'
      });
    }
  };

  return {
    companyDialog,
    setCompanyDialog,
    editingCompany,
    setEditingCompany,
    newCompany,
    setNewCompany,
    createCompany,
    updateCompany,
    deleteCompany
  };
}
