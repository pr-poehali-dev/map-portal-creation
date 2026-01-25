import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatArea } from '@/utils/geoUtils';

interface EGRNImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: any) => void;
}

const EGRN_PARSER_API = 'https://functions.poehali.dev/4c149193-54f5-49cd-93ce-dbb0f1eca3f9';

export default function EGRNImportDialog({ open, onOpenChange, onImport }: EGRNImportDialogProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (fileExtension !== '.zip') {
      setError('Поддерживаются только ZIP-файлы с выписками ЕГРН');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertToPolygonObjects = (parcels: any[]) => {
    const polygons: any[] = [];
    const colors = ['#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#EAB308', '#EC4899'];

    parcels.forEach((parcel, index) => {
      const data = parcel.data;
      
      if (!data.coordinates || data.coordinates.length === 0) {
        return;
      }

      const normalizedCoords = data.coordinates.map(([lng, lat]: [number, number]) => {
        const x = ((lng + 180) / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        return [x, y] as [number, number];
      });

      const color = colors[index % colors.length];

      const polygonObject = {
        id: `egrn-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: data.cadastral_number || `Участок ${index + 1}`,
        type: data.category || 'Земельный участок',
        area: data.area || 0,
        coordinates: normalizedCoords,
        color: color,
        segment: 'ЕГРН',
        visible: true,
        attributes: {
          'Кадастровый номер': data.cadastral_number || '',
          'Площадь (кв.м)': data.area ? data.area.toFixed(2) : '',
          'Категория': data.category || '',
          'Разрешенное использование': data.permitted_use || '',
          'Адрес': data.address || '',
          'Источник': `ЕГРН (${parcel.file_name})`
        }
      };

      console.log(`✅ Created EGRN object: ${data.cadastral_number}, area: ${data.area} m²`);
      polygons.push(polygonObject);
    });

    return polygons;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Выберите ZIP-файл для импорта');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(25);

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      setProgress(50);
      console.log('📤 Sending EGRN file to backend, size:', base64.length);

      const response = await fetch(EGRN_PARSER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.token || ''
        },
        body: JSON.stringify({ file: base64 })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('❌ Backend error:', errorData);
        throw new Error(errorData.error || `Ошибка обработки файла (${response.status})`);
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);
      setProgress(75);

      if (!result.success || !result.parcels || result.parcels.length === 0) {
        console.error('❌ No valid parcels found in response');
        throw new Error('В ZIP-файле не найдено валидных выписок ЕГРН с координатами');
      }
      
      console.log('📦 Parcels found:', result.parcels.length);

      const polygons = convertToPolygonObjects(result.parcels);
      setProgress(90);

      if (polygons.length === 0) {
        throw new Error('Не удалось создать объекты из выписок ЕГРН');
      }

      onImport(polygons);
      setProgress(100);

      toast({
        title: 'Импорт завершён',
        description: `Успешно импортировано участков: ${polygons.length}`,
      });

      setTimeout(() => {
        handleClearFile();
        onOpenChange(false);
      }, 500);

    } catch (err) {
      console.error('EGRN Import Error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка импорта файла');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && !loading) {
      handleClearFile();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="FileText" size={24} className="text-primary" />
            Импорт выписок ЕГРН
          </DialogTitle>
          <DialogDescription>
            Загрузите ZIP-файл с выписками ЕГРН (XML). Координаты будут автоматически конвертированы из МСК-50 в WGS-84
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Icon 
              name={file ? 'FileCheck' : 'Upload'} 
              size={48} 
              className={`mx-auto mb-4 ${file ? 'text-primary' : 'text-muted-foreground'}`}
            />
            
            {file ? (
              <div>
                <p className="font-medium text-foreground mb-1">{file.name}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearFile}
                    disabled={loading}
                  >
                    <Icon name="X" size={16} className="mr-2" />
                    Удалить
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Icon name="RefreshCw" size={16} className="mr-2" />
                    Заменить
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-foreground font-medium mb-2">
                  Перетащите ZIP-файл сюда
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  или нажмите для выбора
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Icon name="FolderOpen" size={16} className="mr-2" />
                  Выбрать файл
                </Button>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Обработка выписок ЕГРН... {progress}%
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <Icon name="AlertCircle" size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Icon name="Info" size={16} />
            <AlertDescription>
              <strong>Поддерживаемые форматы:</strong> ZIP-архивы с XML-выписками ЕГРН
              <br />
              <strong>Конвертация координат:</strong> Автоматически из МСК-50 в WGS-84
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || loading}
          >
            <Icon name="Upload" size={16} className="mr-2" />
            {loading ? 'Импорт...' : 'Импортировать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}