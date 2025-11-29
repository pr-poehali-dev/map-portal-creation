import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
    if (!editingCompany) return;
    
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'update_company',
          company_id: editingCompany.id,
          name: editingCompany.name,
          description: editingCompany.description,
          inn: editingCompany.inn,
          address: editingCompany.address,
          phone: editingCompany.phone,
          email: editingCompany.email,
          website: editingCompany.website,
          status: editingCompany.status
        })
      });

      if (!response.ok) throw new Error('Failed to update company');

      toast({
        title: 'Компания обновлена',
        description: 'Информация о компании успешно изменена'
      });
      
      setCompanyDialog(false);
      setEditingCompany(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить компанию',
        variant: 'destructive'
      });
    }
  };

  const assignCompany = async (userId: string, companyId: string) => {
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'assign_company',
          user_id: userId,
          company_id: companyId
        })
      });

      if (!response.ok) throw new Error('Failed to assign company');

      toast({
        title: 'Компания назначена',
        description: 'Пользователь успешно привязан к компании'
      });
      
      loadData();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось назначить компанию',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="Loader2" size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Администрирование</h1>
              <p className="text-sm text-muted-foreground mt-1">Управление пользователями и доступом</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Icon name="Shield" size={16} className="mr-2" />
            Администратор
          </Badge>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
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
              Права доступа
            </TabsTrigger>
            <TabsTrigger value="layers">
              <Icon name="Layers" size={16} className="mr-2" />
              Слои
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Icon name="FileText" size={16} className="mr-2" />
              Журнал
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Компания</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.company_id || ''} onValueChange={(val) => assignCompany(u.id, val)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Не назначена" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Не назначена</SelectItem>
                              {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(val) => updateRole(u.id, val)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.status} onValueChange={(val) => updateStatus(u.id, val)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Dialog open={permissionDialog && selectedUserId === u.id} onOpenChange={setPermissionDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedUserId(u.id)}>
                                <Icon name="Plus" size={14} className="mr-2" />
                                Доступ
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Предоставить доступ</DialogTitle>
                                <DialogDescription>
                                  Назначьте права доступа для {u.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Тип ресурса</Label>
                                  <Select
                                    value={newPermission.resource_type}
                                    onValueChange={(val) => setNewPermission({ ...newPermission, resource_type: val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="layer">Слой</SelectItem>
                                      <SelectItem value="object">Объект</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>ID ресурса (опционально)</Label>
                                  <Input
                                    value={newPermission.resource_id}
                                    onChange={(e) => setNewPermission({ ...newPermission, resource_id: e.target.value })}
                                    placeholder="Оставьте пустым для всех"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Уровень доступа</Label>
                                  <Select
                                    value={newPermission.permission_level}
                                    onValueChange={(val) => setNewPermission({ ...newPermission, permission_level: val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="read">Чтение</SelectItem>
                                      <SelectItem value="write">Запись</SelectItem>
                                      <SelectItem value="admin">Администратор</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={grantPermission} className="w-full">
                                  Предоставить доступ
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Управление компаниями</h2>
                <Dialog open={companyDialog && !editingCompany} onOpenChange={setCompanyDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Icon name="Plus" size={16} className="mr-2" />
                      Добавить компанию
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Новая компания</DialogTitle>
                      <DialogDescription>Добавьте новую компанию в систему</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Название*</Label>
                        <Input
                          value={newCompany.name}
                          onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                          placeholder="ООО Компания"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ИНН</Label>
                        <Input
                          value={newCompany.inn}
                          onChange={(e) => setNewCompany({ ...newCompany, inn: e.target.value })}
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Описание</Label>
                        <Input
                          value={newCompany.description}
                          onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                          placeholder="Краткое описание"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Адрес</Label>
                        <Input
                          value={newCompany.address}
                          onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                          placeholder="г. Москва, ул. Примерная, д. 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Телефон</Label>
                        <Input
                          value={newCompany.phone}
                          onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                          placeholder="+7 (999) 123-45-67"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newCompany.email}
                          onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                          placeholder="info@company.ru"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Веб-сайт</Label>
                        <Input
                          value={newCompany.website}
                          onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                          placeholder="https://company.ru"
                        />
                      </div>
                      <Button onClick={createCompany} className="w-full">
                        Создать компанию
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>ИНН</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.inn || '-'}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog open={companyDialog && editingCompany?.id === company.id} onOpenChange={(open) => {
                            setCompanyDialog(open);
                            if (!open) setEditingCompany(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingCompany(company)}
                              >
                                <Icon name="Pencil" size={14} className="mr-2" />
                                Изменить
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Редактировать компанию</DialogTitle>
                                <DialogDescription>Измените информацию о компании</DialogDescription>
                              </DialogHeader>
                              {editingCompany && (
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Название*</Label>
                                    <Input
                                      value={editingCompany.name}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>ИНН</Label>
                                    <Input
                                      value={editingCompany.inn}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, inn: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Описание</Label>
                                    <Input
                                      value={editingCompany.description}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Адрес</Label>
                                    <Input
                                      value={editingCompany.address}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Телефон</Label>
                                    <Input
                                      value={editingCompany.phone}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      type="email"
                                      value={editingCompany.email}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Веб-сайт</Label>
                                    <Input
                                      value={editingCompany.website}
                                      onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Статус</Label>
                                    <Select 
                                      value={editingCompany.status} 
                                      onValueChange={(val) => setEditingCompany({ ...editingCompany, status: val })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="blocked">Blocked</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button onClick={updateCompany} className="w-full">
                                    Сохранить изменения
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Тип ресурса</TableHead>
                      <TableHead>ID ресурса</TableHead>
                      <TableHead>Уровень доступа</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => {
                      const permUser = users.find(u => u.id === perm.user_id);
                      return (
                        <TableRow key={perm.id}>
                          <TableCell>{permUser?.name || perm.user_id}</TableCell>
                          <TableCell>{perm.resource_type}</TableCell>
                          <TableCell>{perm.resource_id || 'Все'}</TableCell>
                          <TableCell>
                            <Badge>{perm.permission_level}</Badge>
                          </TableCell>
                          <TableCell>{new Date(perm.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokePermission(perm.id)}
                            >
                              <Icon name="Trash2" size={14} className="mr-2" />
                              Отозвать
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="layers">
            <Card className="p-6">
              <div className="grid gap-4">
                {layers.map((layer, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{layer.layer}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Объектов: {layer.object_count} | Владельцев: {layer.owners?.length || 0}
                        </p>
                      </div>
                      <Badge variant="outline">{layer.object_count} объектов</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead>Тип ресурса</TableHead>
                      <TableHead>Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>{log.name || log.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.resource_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}