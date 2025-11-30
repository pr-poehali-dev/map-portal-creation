import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface CadastralData {
  cadastralNumber: string;
  coordinates: [number, number];
  area?: number;
  address?: string;
  category?: string;
}

interface CadastralSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult: (coordinates: [number, number]) => void;
  onSaveParcel: (data: CadastralData) => void;
}

export default function CadastralSearch({ open, onOpenChange, onSearchResult, onSaveParcel }: CadastralSearchProps) {
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundParcel, setFoundParcel] = useState<CadastralData | null>(null);
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
        `https://functions.poehali.dev/7c111486-6b28-49e2-be67-3419f98d69b7?cadastral_number=${encodeURIComponent(cadastralNumber)}`
      );

      if (!response.ok) {
        throw new Error('Участок не найден');
      }

      const data = await response.json();
      
      if (data.feature?.center) {
        const center = data.feature.center;
        const attrs = data.feature.attrs;
        
        const parcelData: CadastralData = {
          cadastralNumber,
          coordinates: [center.y, center.x],
          area: attrs?.area_value ? parseFloat(attrs.area_value) : undefined,
          address: attrs?.address || undefined,
          category: attrs?.category_type || 'Земельный участок'
        };
        
        setFoundParcel(parcelData);
        onSearchResult([center.y, center.x]);
        
        toast({
          title: 'Участок найден',
          description: `Кадастровый номер: ${cadastralNumber}`,
        });
      } else {
        throw new Error('Координаты не найдены');
      }
    } catch (error) {
      toast({
        title: 'Ошибка поиска',
        description: 'Участок с таким кадастровым номером не найден',
        variant: 'destructive'
      });
      setFoundParcel(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveParcel = () => {
    if (foundParcel) {
      onSaveParcel(foundParcel);
      toast({
        title: 'Участок сохранён',
        description: 'Участок добавлен в базу данных'
      });
      onOpenChange(false);
      setCadastralNumber('');
      setFoundParcel(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCadastralNumber('');
    setFoundParcel(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCadastralNumber();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поиск по кадастровому номеру</DialogTitle>
          <DialogDescription>
            Введите кадастровый номер участка в формате XX:XX:XXXXXXX:XXXX
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!foundParcel ? (
            <>
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
            </>
          ) : (
            <>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="CheckCircle2" size={20} className="text-green-500" />
                  <span className="font-semibold">Участок найден</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Кадастровый номер:</span>
                    <span className="font-medium">{foundParcel.cadastralNumber}</span>
                  </div>
                  
                  {foundParcel.area && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Площадь:</span>
                      <span className="font-medium">{foundParcel.area} м²</span>
                    </div>
                  )}
                  
                  {foundParcel.address && (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Адрес:</span>
                      <span className="font-medium text-xs">{foundParcel.address}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Категория:</span>
                    <span className="font-medium">{foundParcel.category}</span>
                  </div>
                </div>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveParcel} 
                  className="flex-1"
                >
                  <Icon name="Save" size={16} className="mr-2" />
                  Сохранить в базу
                </Button>
                <Button 
                  onClick={handleClose} 
                  variant="outline"
                  className="flex-1"
                >
                  Закрыть
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}