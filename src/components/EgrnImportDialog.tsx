import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { parseEgrnZip } from '@/utils/egrnParser';
import type { MapObject } from '@/types';

interface EgrnImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (objects: Partial<MapObject>[]) => void;
}

export default function EgrnImportDialog({ open, onOpenChange, onImport }: EgrnImportDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const objects = await parseEgrnZip(file);
      
      if (objects.length === 0) {
        setError('В архиве не найдены данные участков. Проверьте формат файла.');
        return;
      }

      onImport(objects);
      setSuccess(`Успешно импортировано участков: ${objects.length}`);
      
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при импорте файла');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="FileUp" size={20} />
            Импорт из ЕГРН
          </DialogTitle>
          <DialogDescription>
            Загрузите ZIP архив с выписками ЕГРН в формате XML.
            Координаты будут автоматически конвертированы из МСК в WGS-84.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Icon name="Upload" size={48} className="mx-auto mb-4 text-muted-foreground" />
            
            <label htmlFor="egrn-file" className="cursor-pointer">
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => document.getElementById('egrn-file')?.click()}
              >
                {isProcessing ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Icon name="FolderOpen" size={16} className="mr-2" />
                    Выбрать ZIP файл
                  </>
                )}
              </Button>
              <input
                id="egrn-file"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </label>

            <p className="text-sm text-muted-foreground mt-2">
              Формат: ZIP архив с XML файлами
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-start gap-2">
              <Icon name="AlertCircle" size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-start gap-2">
              <Icon name="CheckCircle2" size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Icon name="Info" size={16} />
              Требования к файлу:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>ZIP архив с выписками ЕГРН</li>
              <li>Внутри XML файлы с координатами границ</li>
              <li>Система координат: МСК (Москва)</li>
              <li>Автоматическая конвертация в WGS-84</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
