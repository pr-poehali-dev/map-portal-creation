import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import func2url from '../../../backend/func2url.json';

interface OwnerFieldWithInnProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function OwnerFieldWithInn({ value, onChange, placeholder }: OwnerFieldWithInnProps) {
  const [isLoadingDadata, setIsLoadingDadata] = useState(false);
  const [innInput, setInnInput] = useState('');

  const fetchCompanyDataByInn = async (inn: string) => {
    if (!inn || inn.length < 10) {
      toast.error('ИНН должен содержать 10 или 12 цифр');
      return;
    }
    
    setIsLoadingDadata(true);
    
    try {
      const response = await fetch(`${func2url['company-save']}?inn=${inn}`);
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Ошибка получения данных');
        return;
      }
      
      const displayName = data.name ? `${data.name}, ИНН ${inn}` : inn;
      onChange(displayName);
      toast.success('Правообладатель сохранён в базу!');
      setInnInput('');
    } catch (error) {
      toast.error('Ошибка подключения к сервису');
    } finally {
      setIsLoadingDadata(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Введите правообладателя'}
      />
      <div className="flex items-center gap-2">
        <Switch
          id="physical-person"
          checked={value === 'Физическое лицо'}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange('Физическое лицо');
              setInnInput('');
            } else {
              onChange('');
            }
          }}
        />
        <Label htmlFor="physical-person" className="text-sm cursor-pointer">
          Физическое лицо
        </Label>
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Поиск по ИНН</Label>
          <Input
            value={innInput}
            onChange={(e) => setInnInput(e.target.value)}
            placeholder="10 или 12 цифр"
            className="h-8 text-sm"
            disabled={value === 'Физическое лицо'}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchCompanyDataByInn(innInput)}
          disabled={isLoadingDadata || !innInput || innInput.length < 10 || value === 'Физическое лицо'}
          className="h-8"
        >
          {isLoadingDadata ? (
            <Icon name="Loader2" size={14} className="animate-spin" />
          ) : (
            <Icon name="Search" size={14} />
          )}
        </Button>
      </div>
    </div>
  );
}
