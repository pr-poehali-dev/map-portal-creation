import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CADASTRE_API_URL = 'https://functions.poehali.dev/7c111486-6b28-49e2-be67-3419f98d69b7';
const POLYGONS_API_URL = 'https://functions.poehali.dev/ba968529-dbc0-460b-9581-0535bbb18bb3';

interface CadastreImportProps {
  userId?: string;
  onSuccess?: () => void;
}

export default function CadastreImport({ userId, onSuccess }: CadastreImportProps) {
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImport = async () => {
    if (!cadastralNumber.trim()) {
      setError('Введите кадастровый номер');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Запрашиваем данные из Росреестра
      const response = await fetch(`${CADASTRE_API_URL}?cadastral_number=${encodeURIComponent(cadastralNumber.trim())}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки данных');
      }
      
      // Получаем геометрию из backend ответа
      const geometry = data.geometry;
      
      if (!geometry || !geometry.coordinates) {
        throw new Error('Геометрия участка недоступна');
      }
      
      // Конвертируем координаты из GeoJSON [lon, lat] в формат приложения [lat, lon]
      let coordinates: [number, number][] = [];
      
      if (geometry.type === 'Polygon' && geometry.coordinates?.[0]) {
        coordinates = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
      } else if (geometry.type === 'MultiPolygon' && geometry.coordinates?.[0]?.[0]) {
        coordinates = geometry.coordinates[0][0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
      } else {
        throw new Error('Неподдерживаемый тип геометрии');
      }
      
      // Создаём новый объект
      const newObject = {
        id: `cadastre-${Date.now()}`,
        name: `КН ${cadastralNumber}`,
        type: 'Земельный участок',
        area: data.area || 0,
        status: 'active',
        coordinates,
        color: '#10b981',
        segment: 'Росреестр',
        visible: true,
        attributes: {
          'Кадастровый номер': data.cadastral_number,
          'Площадь (кв.м)': data.area?.toString() || '',
          'Категория земель': data.category || '',
          'Разрешённое использование': data.permitted_use || '',
          'Адрес': data.address || '',
          'Кадастровая стоимость': data.cost ? `${data.cost} руб.` : '',
          'Дата постановки на учёт': data.date || ''
        }
      };
      
      // Сохраняем в базу
      const saveResponse = await fetch(POLYGONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || 'anonymous'
        },
        body: JSON.stringify({
          action: 'create',
          polygon: newObject
        })
      });
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Ошибка сохранения в базу');
      }
      
      setSuccess(`Участок ${cadastralNumber} успешно добавлен на карту`);
      setCadastralNumber('');
      
      // Вызываем callback
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon name="MapPin" size={18} className="text-primary" />
        <Label className="text-sm font-medium">Импорт по кадастровому номеру</Label>
      </div>
      
      <div className="space-y-2">
        <Input
          placeholder="77:01:0001001:1234"
          value={cadastralNumber}
          onChange={(e) => setCadastralNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          disabled={loading}
        />
        
        <Button 
          onClick={handleImport}
          disabled={loading || !cadastralNumber.trim()}
          className="w-full"
          size="sm"
        >
          {loading ? (
            <>
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Icon name="Download" size={16} className="mr-2" />
              Загрузить участок
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <Icon name="AlertCircle" size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <Icon name="CheckCircle2" size={16} />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <p className="text-xs text-muted-foreground">
        Введите кадастровый номер земельного участка. Границы и данные будут загружены из ПКК Росреестра.
      </p>
    </Card>
  );
}