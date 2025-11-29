import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import AdminUsersTab from '@/components/AdminUsersTab';
import AdminCompaniesTab from '@/components/AdminCompaniesTab';
import AdminPermissionsTab from '@/components/AdminPermissionsTab';
import AdminAuditTab from '@/components/AdminAuditTab';

const ADMIN_API = 'https://functions.poehali.dev/3e92b954-4498-4bea-8de7-898ccb110b58';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  position?: string;
  company_id?: string;
  company_name?: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  description: string;
  inn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission_level: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
  email: string;
  name: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPermission, setNewPermission] = useState({
    resource_type: 'layer',
    resource_id: '',
    permission_level: 'read'
  });

  useEffect(() => {
    loadData();
  }, []);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Id': user?.token || ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, companiesRes, permsRes, auditRes, layersRes] = await Promise.all([
        fetch(`${ADMIN_API}?action=users`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=companies`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=permissions`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=audit&limit=50`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=layers`, { headers: getAuthHeaders() })
      ]);

      if (!usersRes.ok) {
        if (usersRes.status === 403) {
          toast({
            title: 'Доступ запрещён',
            description: 'У вас нет прав администратора',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }
        throw new Error('Failed to load data');
      }

      const [usersData, companiesData, permsData, auditData, layersData] = await Promise.all([
        usersRes.json(),
        companiesRes.json(),
        permsRes.json(),
        auditRes.json(),
        layersRes.json()
      ]);

      setUsers(usersData);
      setCompanies(companiesData);
      setPermissions(permsData);
      setAuditLogs(auditData);
      setLayers(layersData);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background p-8 dark">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="Shield" size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Панель администратора</h1>
              <p className="text-muted-foreground">Управление пользователями и доступом</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Вернуться к карте
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">
              <Icon name="Users" size={16} className="mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="companies">
              <Icon name="Building2" size={16} className="mr-2" />
              Компании
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Icon name="Lock" size={16} className="mr-2" />
              Доступ
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Icon name="FileText" size={16} className="mr-2" />
              Аудит
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersTab
              users={users}
              isLoading={isLoading}
              updateRole={updateRole}
              updateStatus={updateStatus}
            />
          </TabsContent>

          <TabsContent value="companies">
            <AdminCompaniesTab
              companies={companies}
              isLoading={isLoading}
              companyDialog={companyDialog}
              setCompanyDialog={setCompanyDialog}
              editingCompany={editingCompany}
              newCompany={newCompany}
              setNewCompany={setNewCompany}
              createCompany={createCompany}
              updateCompany={updateCompany}
              deleteCompany={deleteCompany}
              setEditingCompany={setEditingCompany}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <AdminPermissionsTab
              users={users}
              permissions={permissions}
              layers={layers}
              isLoading={isLoading}
              permissionDialog={permissionDialog}
              setPermissionDialog={setPermissionDialog}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              newPermission={newPermission}
              setNewPermission={setNewPermission}
              grantPermission={grantPermission}
              revokePermission={revokePermission}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditTab
              auditLogs={auditLogs}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
