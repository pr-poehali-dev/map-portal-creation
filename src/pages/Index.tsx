import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import GeoImportDialog from '@/components/GeoImportDialog';
import CadastralSearch from '@/components/CadastralSearch';
import BulkCadastralImport from '@/components/BulkCadastralImport';
import MapSidebar from '@/components/MapSidebar';
import MapHeader from '@/components/MapHeader';
import MapCanvas from '@/components/MapCanvas';
import ObjectDetailsSheet from '@/components/ObjectDetailsSheet';
import { PolygonObject } from '@/types/polygon';
import { exportToGeoJSON } from '@/utils/geoExport';
import { useToast } from '@/hooks/use-toast';
import { polygonApi } from '@/services/polygonApi';
import { useAuth } from '@/contexts/AuthContext';

const sampleData: PolygonObject[] = [
  {
    id: '1',
    name: 'Центральный район',
    type: 'Административный округ',
    area: 45.2,
    population: 125000,
    status: 'Активный',
    coordinates: [[50, 30], [60, 30], [60, 40], [50, 40]],
    color: '#0EA5E9',
    layer: 'Административное деление',
    visible: true,
    attributes: { код: 'ЦР-001', приоритет: 'Высокий' }
  },
  {
    id: '2',
    name: 'Промышленная зона №1',
    type: 'Промзона',
    area: 120.5,
    population: 5000,
    status: 'Развитие',
    coordinates: [[40, 50], [60, 50], [60, 70], [40, 70]],
    color: '#8B5CF6',
    layer: 'Промышленность',
    visible: true,
    attributes: { код: 'ПЗ-001', категория: 'Производство' }
  },
  {
    id: '3',
    name: 'Парковая зона "Лесной"',
    type: 'Рекреация',
    area: 85.8,
    status: 'Охраняемая',
    coordinates: [[70, 30], [90, 30], [90, 50], [70, 50]],
    color: '#10B981',
    layer: 'Природные зоны',
    visible: true,
    attributes: { код: 'ПК-001', охрана: 'Заповедная' }
  },
  {
    id: '4',
    name: 'Жилой массив "Северный"',
    type: 'Жилой комплекс',
    area: 65.3,
    population: 85000,
    status: 'Эксплуатация',
    coordinates: [[30, 70], [50, 70], [50, 90], [30, 90]],
    color: '#F97316',
    layer: 'Жилые зоны',
    visible: true,
    attributes: { код: 'ЖМ-001', этажность: '12-24' }
  },
  {
    id: '5',
    name: 'Торговый квартал',
    type: 'Коммерческая зона',
    area: 32.1,
    status: 'Активный',
    coordinates: [[65, 55], [80, 55], [80, 65], [65, 65]],
    color: '#EAB308',
    layer: 'Коммерция',
    visible: true,
    attributes: { код: 'ТК-001', объектов: 145 }
  }
];

const layers = [
  { name: 'Административное деление', visible: true, color: '#0EA5E9' },
  { name: 'Промышленность', visible: true, color: '#8B5CF6' },
  { name: 'Природные зоны', visible: true, color: '#10B981' },
  { name: 'Жилые зоны', visible: true, color: '#F97316' },
  { name: 'Коммерция', visible: true, color: '#EAB308' }
];

export default function Index() {
  const { user, logout } = useAuth();
  const [polygonData, setPolygonData] = useState<PolygonObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState<PolygonObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Все');
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(
    layers.reduce((acc, layer) => ({ ...acc, [layer.name]: true }), {})
  );
  const [mapOpacity, setMapOpacity] = useState([80]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [useYandexMap, setUseYandexMap] = useState(true);
  const [showAllTrigger, setShowAllTrigger] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState<string | null>(null);
  const [showCadastralLayer, setShowCadastralLayer] = useState(false);
  const [cadastralSearchOpen, setCadastralSearchOpen] = useState(false);
  const [cadastralSearchCoords, setCadastralSearchCoords] = useState<[number, number] | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [trashData, setTrashData] = useState<PolygonObject[]>([]);
  const [viewingTrash, setViewingTrash] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPolygons();
  }, []);

  const loadPolygons = async () => {
    try {
      setIsLoading(true);
      const data = await polygonApi.getAll();
      if (data.length === 0) {
        await Promise.all(sampleData.map(polygon => polygonApi.create(polygon)));
        const newData = await polygonApi.getAll();
        setPolygonData(newData);
      } else {
        setPolygonData(data);
      }
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrash = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      const data = await polygonApi.getTrash();
      setTrashData(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки корзины',
        description: 'Не удалось загрузить корзину',
        variant: 'destructive'
      });
    }
  };

  const handleRestoreFromTrash = async (id: string) => {
    try {
      await polygonApi.restoreFromTrash(id);
      toast({
        title: 'Восстановлено',
        description: 'Объект восстановлен из корзины'
      });
      await loadTrash();
      await loadPolygons();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось восстановить объект',
        variant: 'destructive'
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await polygonApi.permanentDelete(id);
      toast({
        title: 'Удалено навсегда',
        description: 'Объект удалён безвозвратно'
      });
      await loadTrash();
      setConfirmPermanentDelete(null);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить объект',
        variant: 'destructive'
      });
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await polygonApi.emptyTrash();
      toast({
        title: 'Корзина очищена',
        description: 'Все объекты удалены безвозвратно'
      });
      await loadTrash();
      setConfirmEmptyTrash(false);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось очистить корзину',
        variant: 'destructive'
      });
    }
  };

  const filteredData = polygonData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'Все' || item.type === filterType;
    const matchesLayer = layerVisibility[item.layer];
    return matchesSearch && matchesFilter && matchesLayer;
  });

  const types = ['Все', ...Array.from(new Set(polygonData.map(item => item.type)))];

  const handleImport = async (importedPolygons: PolygonObject[]) => {
    try {
      await Promise.all(importedPolygons.map(polygon => polygonApi.create(polygon)));
      await loadPolygons();
      
      const newLayers = Array.from(new Set(importedPolygons.map(p => p.layer)));
      setLayerVisibility(prev => {
        const updated = { ...prev };
        newLayers.forEach(layer => {
          if (!(layer in updated)) {
            updated[layer] = true;
          }
        });
        return updated;
      });
      
      toast({
        title: 'Импорт завершён',
        description: `Добавлено объектов: ${importedPolygons.length}`
      });
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: 'Не удалось импортировать данные',
        variant: 'destructive'
      });
    }
  };

  const handleExportAll = () => {
    exportToGeoJSON(polygonData);
    toast({
      title: 'Экспорт завершён',
      description: `Экспортировано объектов: ${polygonData.length}`,
    });
  };

  const handleExportFiltered = () => {
    exportToGeoJSON(filteredData);
    toast({
      title: 'Экспорт завершён',
      description: `Экспортировано объектов: ${filteredData.length}`,
    });
  };

  const handleExportSelected = () => {
    if (!selectedObject) return;
    exportToGeoJSON([selectedObject], `${selectedObject.name.replace(/[^a-zа-я0-9]/gi, '_')}.geojson`);
    toast({
      title: 'Экспорт завершён',
      description: `Экспортирован: ${selectedObject.name}`,
    });
  };

  const handleExportCadastralNumbers = () => {
    const cadastralParcels = polygonData.filter(
      obj => obj.type === 'Кадастровый участок' && 
      obj.attributes['Кадастровый номер']
    );

    if (cadastralParcels.length === 0) {
      toast({
        title: 'Нет данных',
        description: 'В базе нет кадастровых участков',
        variant: 'destructive'
      });
      return;
    }

    const cadastralNumbers = cadastralParcels
      .map(obj => obj.attributes['Кадастровый номер'])
      .join('\n');

    const blob = new Blob([cadastralNumbers], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'кадастровые_номера.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Экспорт завершён',
      description: `Экспортировано номеров: ${cadastralParcels.length}`,
    });
  };

  const handleSaveObject = async (updatedObject: PolygonObject) => {
    try {
      await polygonApi.update(updatedObject.id, updatedObject);
      setPolygonData(prev => prev.map(obj => obj.id === updatedObject.id ? updatedObject : obj));
      setSelectedObject(updatedObject);
      setIsEditing(false);
      toast({
        title: 'Изменения сохранены',
        description: `Объект "${updatedObject.name}" успешно обновлён`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить изменения',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setObjectToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!objectToDelete) return;
    
    try {
      await polygonApi.delete(objectToDelete);
      setPolygonData(prev => prev.filter(obj => obj.id !== objectToDelete));
      setSelectedObject(null);
      setDeleteDialogOpen(false);
      setObjectToDelete(null);
      toast({
        title: 'Перемещено в корзину',
        description: 'Объект перемещён в корзину. Администратор может восстановить его.',
      });
    } catch (error) {
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить объект',
        variant: 'destructive'
      });
    }
  };

  const handleSaveCadastralParcel = async (parcelData: { cadastralNumber: string; coordinates: [number, number]; area?: number; address?: string; category?: string }) => {
    try {
      const newPolygon: PolygonObject = {
        id: parcelData.cadastralNumber.replace(/:/g, '_'),
        name: parcelData.address || `Участок ${parcelData.cadastralNumber}`,
        type: 'Кадастровый участок',
        area: parcelData.area ? parcelData.area / 10000 : 0.1,
        status: 'Активный',
        coordinates: [
          [(parcelData.coordinates[1] + 180) / 360 * 100, (90 - parcelData.coordinates[0]) / 180 * 100],
          [(parcelData.coordinates[1] + 180.001) / 360 * 100, (90 - parcelData.coordinates[0]) / 180 * 100],
          [(parcelData.coordinates[1] + 180.001) / 360 * 100, (90 - parcelData.coordinates[0] - 0.001) / 180 * 100],
          [(parcelData.coordinates[1] + 180) / 360 * 100, (90 - parcelData.coordinates[0] - 0.001) / 180 * 100]
        ],
        color: '#F59E0B',
        layer: 'Кадастровые участки',
        visible: true,
        attributes: {
          'Кадастровый номер': parcelData.cadastralNumber,
          'Категория': parcelData.category || 'Земельный участок'
        }
      };

      await polygonApi.create(newPolygon);
      await loadPolygons();

      setLayerVisibility(prev => ({
        ...prev,
        'Кадастровые участки': true
      }));
    } catch (error) {
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить участок в базу данных',
        variant: 'destructive'
      });
    }
  };

  const handleBulkImport = async (parcels: Array<{ cadastralNumber: string; coordinates: [number, number]; area?: number; address?: string; category?: string }>) => {
    try {
      const newPolygons = parcels.map(parcelData => ({
        id: parcelData.cadastralNumber.replace(/:/g, '_'),
        name: parcelData.address || `Участок ${parcelData.cadastralNumber}`,
        type: 'Кадастровый участок',
        area: parcelData.area ? parcelData.area / 10000 : 0.1,
        status: 'Активный',
        coordinates: [
          [(parcelData.coordinates[1] + 180) / 360 * 100, (90 - parcelData.coordinates[0]) / 180 * 100],
          [(parcelData.coordinates[1] + 180.001) / 360 * 100, (90 - parcelData.coordinates[0]) / 180 * 100],
          [(parcelData.coordinates[1] + 180.001) / 360 * 100, (90 - parcelData.coordinates[0] - 0.001) / 180 * 100],
          [(parcelData.coordinates[1] + 180) / 360 * 100, (90 - parcelData.coordinates[0] - 0.001) / 180 * 100]
        ],
        color: '#F59E0B',
        layer: 'Кадастровые участки',
        visible: true,
        attributes: {
          'Кадастровый номер': parcelData.cadastralNumber,
          'Категория': parcelData.category || 'Земельный участок'
        }
      }));

      await Promise.all(newPolygons.map(polygon => polygonApi.create(polygon)));
      await loadPolygons();

      setLayerVisibility(prev => ({
        ...prev,
        'Кадастровые участки': true
      }));
    } catch (error) {
      toast({
        title: 'Ошибка сохранения',
        description: 'Не удалось сохранить участки в базу данных',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex h-screen bg-background dark">
      <MapSidebar
        user={user}
        logout={logout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        types={types}
        filterType={filterType}
        setFilterType={setFilterType}
        filteredData={filteredData}
        selectedObject={selectedObject}
        setSelectedObject={setSelectedObject}
        layers={layers}
        layerVisibility={layerVisibility}
        setLayerVisibility={setLayerVisibility}
        mapOpacity={mapOpacity}
        setMapOpacity={setMapOpacity}
        polygonData={polygonData}
        setImportDialogOpen={setImportDialogOpen}
        trashData={trashData}
        viewingTrash={viewingTrash}
        setViewingTrash={setViewingTrash}
        loadTrash={loadTrash}
        handleRestoreFromTrash={handleRestoreFromTrash}
        handlePermanentDelete={(id) => setConfirmPermanentDelete(id)}
        handleEmptyTrash={() => setConfirmEmptyTrash(true)}
      />

      <main className="flex-1 flex flex-col">
        <MapHeader
          filteredData={filteredData}
          polygonData={polygonData}
          selectedObject={selectedObject}
          setShowAllTrigger={setShowAllTrigger}
          useYandexMap={useYandexMap}
          setUseYandexMap={setUseYandexMap}
          showCadastralLayer={showCadastralLayer}
          setShowCadastralLayer={setShowCadastralLayer}
          setCadastralSearchOpen={setCadastralSearchOpen}
          setBulkImportOpen={setBulkImportOpen}
          handleExportAll={handleExportAll}
          handleExportFiltered={handleExportFiltered}
          handleExportCadastralNumbers={handleExportCadastralNumbers}
          handleExportSelected={handleExportSelected}
        />

        <MapCanvas
          useYandexMap={useYandexMap}
          filteredData={filteredData}
          selectedObject={selectedObject}
          setSelectedObject={setSelectedObject}
          mapOpacity={mapOpacity}
          showAllTrigger={showAllTrigger}
          showCadastralLayer={showCadastralLayer}
          cadastralSearchCoords={cadastralSearchCoords}
        />

        <ObjectDetailsSheet
          selectedObject={selectedObject}
          setSelectedObject={setSelectedObject}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          handleSaveObject={handleSaveObject}
          handleDeleteClick={handleDeleteClick}
          handleExportSelected={handleExportSelected}
        />

        <footer className="h-12 border-t border-border bg-card px-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Icon name="MapPin" size={14} />
              Координаты: 55.7558° N, 37.6173° E
            </span>
            <span className="flex items-center gap-2">
              <Icon name="Layers" size={14} />
              Масштаб: 1:50000
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              v2.0.0
            </Badge>
          </div>
        </footer>
      </main>

      <GeoImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />

      <CadastralSearch
        open={cadastralSearchOpen}
        onOpenChange={setCadastralSearchOpen}
        onParcelFound={(coords) => setCadastralSearchCoords(coords)}
        onSave={handleSaveCadastralParcel}
      />

      <BulkCadastralImport
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImport={handleBulkImport}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Переместить в корзину</AlertDialogTitle>
            <AlertDialogDescription>
              Объект будет перемещён в корзину. Администратор сможет восстановить его позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              В корзину
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmPermanentDelete} onOpenChange={() => setConfirmPermanentDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить безвозвратно?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить этот объект навсегда? Это действие нельзя будет отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmPermanentDelete && handlePermanentDelete(confirmPermanentDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить навсегда
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить корзину?</AlertDialogTitle>
            <AlertDialogDescription>
              Все объекты в корзине ({trashData.length}) будут удалены безвозвратно. Это действие нельзя будет отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Очистить корзину
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}