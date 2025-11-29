import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface Permission {
  id: number;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission_level: string;
  created_at: string;
}

interface AdminPermissionsTabProps {
  users: User[];
  permissions: Permission[];
  layers: any[];
  isLoading: boolean;
  permissionDialog: boolean;
  setPermissionDialog: (open: boolean) => void;
  selectedUserId: string;
  setSelectedUserId: (userId: string) => void;
  newPermission: {
    resource_type: string;
    resource_id: string;
    permission_level: string;
  };
  setNewPermission: (permission: any) => void;
  grantPermission: () => Promise<void>;
  revokePermission: (permissionId: number) => Promise<void>;
}

export default function AdminPermissionsTab({
  users,
  permissions,
  layers,
  isLoading,
  permissionDialog,
  setPermissionDialog,
  selectedUserId,
  setSelectedUserId,
  newPermission,
  setNewPermission,
  grantPermission,
  revokePermission
}: AdminPermissionsTabProps) {
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.name} (${user.email})` : userId;
  };

  const getPermissionBadge = (level: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      read: 'secondary',
      write: 'default',
      admin: 'destructive'
    };
    return <Badge variant={variants[level] || 'outline'}>{level}</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Загрузка данных...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Управление доступом</h2>
        <Dialog open={permissionDialog} onOpenChange={setPermissionDialog}>
          <DialogTrigger asChild>
            <Button>
              <Icon name="UserPlus" size={16} className="mr-2" />
              Предоставить доступ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Предоставление доступа</DialogTitle>
              <DialogDescription>
                Назначьте права доступа пользователю для работы с ресурсами
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user">Пользователь</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Выберите пользователя" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resource">Тип ресурса</Label>
                <Select
                  value={newPermission.resource_type}
                  onValueChange={(val) => setNewPermission({ ...newPermission, resource_type: val })}
                >
                  <SelectTrigger id="resource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="layer">Слой</SelectItem>
                    <SelectItem value="company">Компания</SelectItem>
                    <SelectItem value="polygon">Полигон</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resource_id">Ресурс</Label>
                <Select
                  value={newPermission.resource_id}
                  onValueChange={(val) => setNewPermission({ ...newPermission, resource_id: val })}
                >
                  <SelectTrigger id="resource_id">
                    <SelectValue placeholder="Выберите ресурс" />
                  </SelectTrigger>
                  <SelectContent>
                    {layers.map(layer => (
                      <SelectItem key={layer.name} value={layer.name}>
                        {layer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Уровень доступа</Label>
                <Select
                  value={newPermission.permission_level}
                  onValueChange={(val) => setNewPermission({ ...newPermission, permission_level: val })}
                >
                  <SelectTrigger id="level">
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
      </div>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Тип ресурса</TableHead>
              <TableHead>Ресурс</TableHead>
              <TableHead>Уровень</TableHead>
              <TableHead>Дата назначения</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map(perm => (
              <TableRow key={perm.id}>
                <TableCell>{getUserName(perm.user_id)}</TableCell>
                <TableCell>{perm.resource_type}</TableCell>
                <TableCell>{perm.resource_id || 'Все'}</TableCell>
                <TableCell>{getPermissionBadge(perm.permission_level)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(perm.created_at).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokePermission(perm.id)}
                  >
                    <Icon name="X" size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
