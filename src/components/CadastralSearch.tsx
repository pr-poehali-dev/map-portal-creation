import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface CadastralSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult: (coordinates: [number, number]) => void;
}

export default function CadastralSearch({ open, onOpenChange, onSearchResult }: CadastralSearchProps) {
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const formatCadastralNumber = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    const parts = [];
    
    if (cleaned.length > 0) parts.push(cleaned.slice(0, 2));
    if (cleaned.length > 2) parts.push(cleaned.slice(2, 4));
    if (cleaned.length > 4) parts.push(cleaned.slice(4, 11));
    if (cleaned.length > 11) parts.push(cleaned.slice(11, 15));
    
    return parts.join(':');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCadastralNumber(e.target.value);
    setCadastralNumber(formatted);
  };

  const searchCadastralNumber = async () => {
    if (!cadastralNumber || cadastralNumber.length < 10) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректный кадастровый номер',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://pkk.rosreestr.ru/api/features/1/${cadastralNumber}`
      );

      if (!response.ok) {
        throw new Error('Участок не найден');
      }

      const data = await response.json();
      
      if (data.feature?.center) {
        const center = data.feature.center;
        onSearchResult([center.y, center.x]);
        
        toast({
          title: 'Участок найден',
          description: `Кадастровый номер: ${cadastralNumber}`,
        });
        
        onOpenChange(false);
        setCadastralNumber('');
      } else {
        throw new Error('Координаты не найдены');
      }
    } catch (error) {
      toast({
        title: 'Ошибка поиска',
        description: 'Участок с таким кадастровым номером не найден',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCadastralNumber();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поиск по кадастровому номеру</DialogTitle>
          <DialogDescription>
            Введите кадастровый номер участка в формате XX:XX:XXXXXXX:XXXX
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="77:01:0001001:1234"
              value={cadastralNumber}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              maxLength={19}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Формат будет применён автоматически
            </p>
          </div>

          <Card className="p-3 bg-muted/50">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-start gap-2">
                <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
                <span>Данные загружаются из Публичной кадастровой карты Росреестра</span>
              </p>
              <p className="flex items-start gap-2">
                <Icon name="MapPin" size={14} className="mt-0.5 flex-shrink-0" />
                <span>После поиска карта автоматически переместится к найденному участку</span>
              </p>
            </div>
          </Card>

          <Button 
            onClick={searchCadastralNumber} 
            className="w-full"
            disabled={isSearching || cadastralNumber.length < 10}
          >
            {isSearching ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Поиск...
              </>
            ) : (
              <>
                <Icon name="Search" size={16} className="mr-2" />
                Найти участок
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
