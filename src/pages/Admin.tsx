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
  created_at: string;
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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
      const [usersRes, permsRes, auditRes, layersRes] = await Promise.all([
        fetch(`${ADMIN_API}?action=users`, { headers: getAuthHeaders() }),
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

      const [usersData, permsData, auditData, layersData] = await Promise.all([
        usersRes.json(),
        permsRes.json(),
        auditRes.json(),
        layersRes.json()
      ]);

      setUsers(usersData);
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="users">
              <Icon name="Users" size={16} className="mr-2" />
              Пользователи
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
