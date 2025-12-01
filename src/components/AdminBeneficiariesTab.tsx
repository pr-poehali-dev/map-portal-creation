import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import { toast } from 'sonner';

interface AdminBeneficiariesTabProps {
  beneficiaries: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}

export default function AdminBeneficiariesTab({
  beneficiaries,
  onAdd,
  onRemove
}: AdminBeneficiariesTabProps) {
  const [newBeneficiary, setNewBeneficiary] = useState('');

  const handleAdd = () => {
    if (!newBeneficiary.trim()) {
      toast.error('Введите название группы компаний');
      return;
    }

    if (beneficiaries.includes(newBeneficiary.trim())) {
      toast.error('Такой бенефициар уже существует');
      return;
    }

    onAdd(newBeneficiary.trim());
    setNewBeneficiary('');
    toast.success('Бенефициар добавлен в реестр');
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Реестр бенефициаров</h2>
          <p className="text-sm text-muted-foreground">
            Управление списком групп компаний для автодополнения в атрибутах
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-beneficiary" className="text-sm mb-2 block">
              Добавить группу компаний
            </Label>
            <Input
              id="new-beneficiary"
              value={newBeneficiary}
              onChange={(e) => setNewBeneficiary(e.target.value)}
              placeholder="Например: Группа компаний Альфа"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd}>
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm mb-2 block">
            Текущий список ({beneficiaries.length})
          </Label>
          {beneficiaries.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Icon name="Building2" size={48} className="mx-auto mb-3 opacity-20" />
                <p>Реестр пуст</p>
                <p className="text-sm mt-1">Добавьте первую группу компаний</p>
              </div>
            </Card>
          ) : (
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {beneficiaries.sort().map((beneficiary, index) => (
                  <Card
                    key={index}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon name="Building2" size={18} className="text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{beneficiary}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Удалить "${beneficiary}" из реестра?`)) {
                          onRemove(beneficiary);
                          toast.success('Бенефициар удален');
                        }
                      }}
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Icon name="Info" size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Как это работает:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Добавьте названия групп компаний в реестр</li>
                <li>При заполнении атрибута "Бенефициар" появится автодополнение</li>
                <li>Система подскажет существующие варианты при вводе</li>
                <li>Новые бенефициары автоматически добавляются при первом использовании</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
