import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface AdminAuditTabProps {
  auditLogs: AuditLog[];
  isLoading: boolean;
}

export default function AdminAuditTab({ auditLogs, isLoading }: AdminAuditTabProps) {
  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      create_object: 'default',
      update_object: 'secondary',
      delete_object: 'destructive',
      grant_permission: 'default',
      revoke_permission: 'destructive'
    };
    
    const labels: Record<string, string> = {
      create_object: 'Создание',
      update_object: 'Изменение',
      delete_object: 'Удаление',
      grant_permission: 'Доступ +',
      revoke_permission: 'Доступ -'
    };

    return (
      <Badge variant={variants[action] || 'outline'}>
        {labels[action] || action}
      </Badge>
    );
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
      <h2 className="text-lg font-semibold mb-4">Журнал аудита</h2>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Ресурс</TableHead>
              <TableHead>Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('ru-RU')}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{log.name}</div>
                    <div className="text-xs text-muted-foreground">{log.email}</div>
                  </div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell>{log.resource_type}</TableCell>
                <TableCell className="text-sm">{log.resource_id}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
