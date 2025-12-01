import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';
import func2url from '../../backend/func2url.json';
import { toast } from 'sonner';

interface CompanyDetailsDialogProps {
  inn: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CompanyData {
  id: string;
  name: string;
  short_name?: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: string;
  registration_date?: string;
  okved?: string;
  management_name?: string;
  management_post?: string;
  company_type?: string;
  status?: string;
}

export default function CompanyDetailsDialog({ inn, open, onOpenChange }: CompanyDetailsDialogProps) {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && inn) {
      loadCompanyData();
    }
  }, [open, inn]);

  const loadCompanyData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${func2url['company-save']}?inn=${inn}`);
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Ошибка загрузки данных компании');
        return;
      }
      
      setCompany(data);
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      'ACTIVE': { label: 'Действующая', variant: 'default' },
      'LIQUIDATING': { label: 'Ликвидируется', variant: 'secondary' },
      'LIQUIDATED': { label: 'Ликвидирована', variant: 'destructive' },
      'REORGANIZING': { label: 'Реорганизуется', variant: 'secondary' }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Building2" size={24} />
            Информация о компании
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : company ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{company.name}</h3>
              {company.short_name && (
                <p className="text-sm text-muted-foreground">{company.short_name}</p>
              )}
              <div className="mt-2">
                {getStatusBadge(company.status)}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Icon name="Hash" size={14} />
                  <span>ИНН</span>
                </div>
                <p className="font-medium">{company.inn}</p>
              </div>

              {company.kpp && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Icon name="Hash" size={14} />
                    <span>КПП</span>
                  </div>
                  <p className="font-medium">{company.kpp}</p>
                </div>
              )}

              {company.ogrn && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Icon name="FileText" size={14} />
                    <span>ОГРН</span>
                  </div>
                  <p className="font-medium">{company.ogrn}</p>
                </div>
              )}

              {company.registration_date && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Icon name="Calendar" size={14} />
                    <span>Дата регистрации</span>
                  </div>
                  <p className="font-medium">{formatDate(company.registration_date)}</p>
                </div>
              )}
            </div>

            {company.address && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Icon name="MapPin" size={14} />
                    <span>Адрес</span>
                  </div>
                  <p className="text-sm">{company.address}</p>
                </div>
              </>
            )}

            {(company.management_name || company.management_post) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Icon name="User" size={14} />
                    <span>Руководитель</span>
                  </div>
                  {company.management_name && (
                    <p className="font-medium">{company.management_name}</p>
                  )}
                  {company.management_post && (
                    <p className="text-sm text-muted-foreground">{company.management_post}</p>
                  )}
                </div>
              </>
            )}

            {company.okved && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Icon name="Briefcase" size={14} />
                    <span>ОКВЭД</span>
                  </div>
                  <p className="text-sm">{company.okved}</p>
                </div>
              </>
            )}

            <div className="pt-2 text-xs text-muted-foreground">
              <Icon name="Info" size={12} className="inline mr-1" />
              Данные получены из ЕГРЮЛ через Dadata API
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Не удалось загрузить данные компании
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
