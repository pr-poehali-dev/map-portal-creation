import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface AdminUsersTabProps {
  users: User[];
  isLoading: boolean;
  updateRole: (userId: string, newRole: string) => Promise<void>;
  updateStatus: (userId: string, newStatus: string) => Promise<void>;
}

export default function AdminUsersTab({ users, isLoading, updateRole, updateStatus }: AdminUsersTabProps) {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: 'destructive',
      editor: 'default',
      user: 'secondary'
    };
    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: 'default',
      suspended: 'secondary',
      blocked: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
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
      <h2 className="text-lg font-semibold mb-4">Управление пользователями</h2>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{u.name}</div>
                    {u.position && <div className="text-xs text-muted-foreground">{u.position}</div>}
                  </div>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.company_name || '—'}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(val) => updateRole(u.id, val)}>
                    <SelectTrigger className="w-32">
                      <SelectValue>{getRoleBadge(u.role)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={u.status} onValueChange={(val) => updateStatus(u.id, val)}>
                    <SelectTrigger className="w-32">
                      <SelectValue>{getStatusBadge(u.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('ru-RU')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
