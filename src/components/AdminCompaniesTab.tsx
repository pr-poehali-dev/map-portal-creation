import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import func2url from '../../backend/func2url.json';

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

interface AdminCompaniesTabProps {
  companies: Company[];
  isLoading: boolean;
  companyDialog: boolean;
  setCompanyDialog: (open: boolean) => void;
  editingCompany: Company | null;
  newCompany: {
    id: string;
    name: string;
    description: string;
    inn: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  setNewCompany: (company: any) => void;
  createCompany: () => Promise<void>;
  updateCompany: () => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  setEditingCompany: (company: Company | null) => void;
}

export default function AdminCompaniesTab({
  companies,
  isLoading,
  companyDialog,
  setCompanyDialog,
  editingCompany,
  newCompany,
  setNewCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  setEditingCompany
}: AdminCompaniesTabProps) {
  const [isLoadingDadata, setIsLoadingDadata] = useState(false);
  const [dadataError, setDadataError] = useState<string | null>(null);

  const fetchCompanyData = async (inn: string) => {
    if (!inn || inn.length < 10) return;
    
    setIsLoadingDadata(true);
    setDadataError(null);
    
    try {
      const response = await fetch(`${func2url.dadata}?inn=${inn}`);
      const data = await response.json();
      
      if (!response.ok) {
        setDadataError(data.error || 'Ошибка получения данных');
        return;
      }
      
      setNewCompany({
        ...newCompany,
        name: data.name || newCompany.name,
        address: data.address || newCompany.address,
        inn: inn
      });
    } catch (error) {
      setDadataError('Ошибка подключения к сервису');
    } finally {
      setIsLoadingDadata(false);
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setNewCompany({
        id: company.id,
        name: company.name,
        description: company.description,
        inn: company.inn,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website
      });
    } else {
      setEditingCompany(null);
      setNewCompany({ id: '', name: '', description: '', inn: '', address: '', phone: '', email: '', website: '' });
    }
    setCompanyDialog(true);
  };

  const handleSubmit = async () => {
    if (editingCompany) {
      await updateCompany();
    } else {
      await createCompany();
    }
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
        <h2 className="text-lg font-semibold">Компании</h2>
        <Dialog open={companyDialog} onOpenChange={setCompanyDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить компанию
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Редактирование компании' : 'Новая компания'}</DialogTitle>
              <DialogDescription>
                {editingCompany ? 'Измените данные компании' : 'Заполните информацию о новой компании'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="inn">ИНН</Label>
                <div className="flex gap-2">
                  <Input
                    id="inn"
                    value={newCompany.inn}
                    onChange={(e) => {
                      setNewCompany({ ...newCompany, inn: e.target.value });
                      setDadataError(null);
                    }}
                    placeholder="10 или 12 цифр"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchCompanyData(newCompany.inn)}
                    disabled={isLoadingDadata || !newCompany.inn || newCompany.inn.length < 10}
                  >
                    {isLoadingDadata ? (
                      <Icon name="Loader2" size={16} className="animate-spin" />
                    ) : (
                      <Icon name="Search" size={16} />
                    )}
                  </Button>
                </div>
                {dadataError && (
                  <p className="text-sm text-red-500 mt-1">{dadataError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Введите ИНН и нажмите на поиск для автозаполнения
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website">Сайт</Label>
                <Input
                  id="website"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Input
                  id="description"
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingCompany ? 'Сохранить изменения' : 'Создать компанию'}
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
            {companies.map(company => (
              <TableRow key={company.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{company.name}</div>
                    {company.description && (
                      <div className="text-xs text-muted-foreground">{company.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{company.inn}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.phone}</TableCell>
                <TableCell>
                  <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                    {company.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(company)}>
                      <Icon name="Edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCompany(company.id)}
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}