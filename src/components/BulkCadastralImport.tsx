import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface CadastralData {
  cadastralNumber: string;
  coordinates: [number, number];
  area?: number;
  address?: string;
  category?: string;
}

interface BulkCadastralImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (parcels: CadastralData[]) => void;
}

export default function BulkCadastralImport({ open, onOpenChange, onImportComplete }: BulkCadastralImportProps) {
  const [cadastralNumbers, setCadastralNumbers] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentNumber, setCurrentNumber] = useState('');
  const [results, setResults] = useState<{ success: number; failed: number; total: number }>({ success: 0, failed: 0, total: 0 });
  const { toast } = useToast();

  const fetchParcelData = async (cadastralNumber: string): Promise<CadastralData | null> => {
    try {
      const response = await fetch(
        `https://pkk.rosreestr.ru/api/features/1/${cadastralNumber}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.feature?.center) {
        const center = data.feature.center;
        const attrs = data.feature.attrs;
        
        return {
          cadastralNumber,
          coordinates: [center.y, center.x],
          area: attrs?.area_value ? parseFloat(attrs.area_value) : undefined,
          address: attrs?.address || undefined,
          category: attrs?.category_type || 'Земельный участок'
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleImport = async () => {
    const numbers = cadastralNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/[^\d:]/g, ''));

    if (numbers.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите хотя бы один кадастровый номер',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResults({ success: 0, failed: 0, total: numbers.length });

    const foundParcels: CadastralData[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      setCurrentNumber(number);
      
      const parcelData = await fetchParcelData(number);
      
      if (parcelData) {
        foundParcels.push(parcelData);
        successCount++;
      } else {
        failedCount++;
      }

      setProgress(((i + 1) / numbers.length) * 100);
      setResults({ success: successCount, failed: failedCount, total: numbers.length });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsImporting(false);
    setCurrentNumber('');

    if (foundParcels.length > 0) {
      onImportComplete(foundParcels);
      toast({
        title: 'Импорт завершён',
        description: `Загружено участков: ${successCount}, ошибок: ${failedCount}`
      });
      onOpenChange(false);
      setCadastralNumbers('');
      setProgress(0);
      setResults({ success: 0, failed: 0, total: 0 });
    } else {
      toast({
        title: 'Ошибка импорта',
        description: 'Не удалось загрузить ни одного участка',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Массовый импорт участков</DialogTitle>
          <DialogDescription>
            Введите список кадастровых номеров (по одному на строку)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isImporting ? (
            <>
              <Textarea
                placeholder="77:01:0001001:1234&#10;77:01:0001001:1235&#10;77:01:0001001:1236"
                value={cadastralNumbers}
                onChange={(e) => setCadastralNumbers(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />

              <Card className="p-3 bg-muted/50">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Icon name="Info" size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Каждый номер должен быть на отдельной строке</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="Clock" size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Импорт выполняется последовательно (около 0.5 сек на участок)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="Database" size={14} className="mt-0.5 flex-shrink-0" />
                    <span>Найденные участки автоматически сохранятся в базу данных</span>
                  </p>
                </div>
              </Card>

              <Button 
                onClick={handleImport}
                className="w-full"
                disabled={cadastralNumbers.trim().length === 0}
              >
                <Icon name="Upload" size={16} className="mr-2" />
                Начать импорт
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Прогресс импорта</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    <span>Обработка: {currentNumber}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{results.total}</div>
                    <div className="text-xs text-muted-foreground">Всего</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{results.success}</div>
                    <div className="text-xs text-muted-foreground">Успешно</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">{results.failed}</div>
                    <div className="text-xs text-muted-foreground">Ошибок</div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <Icon name="AlertTriangle" size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Не закрывайте окно до завершения импорта</span>
                </p>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
