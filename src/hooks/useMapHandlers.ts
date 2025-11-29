import { PolygonObject } from '@/types/polygon';
import { polygonApi } from '@/services/polygonApi';
import { exportToGeoJSON } from '@/utils/geoExport';
import { useToast } from '@/hooks/use-toast';

interface UseMapHandlersProps {
  polygonData: PolygonObject[];
  setPolygonData: (data: PolygonObject[] | ((prev: PolygonObject[]) => PolygonObject[])) => void;
  setTrashData: (data: PolygonObject[]) => void;
  loadPolygons: () => Promise<void>;
  loadTrash: () => Promise<void>;
  setLayerVisibility: (visibility: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setSelectedObject: (obj: PolygonObject | null) => void;
  setIsEditing: (editing: boolean) => void;
  setConfirmPermanentDelete: (id: string | null) => void;
  setConfirmEmptyTrash: (confirm: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setObjectToDelete: (id: string | null) => void;
}

export function useMapHandlers({
  polygonData,
  setPolygonData,
  setTrashData,
  loadPolygons,
  loadTrash,
  setLayerVisibility,
  setSelectedObject,
  setIsEditing,
  setConfirmPermanentDelete,
  setConfirmEmptyTrash,
  setDeleteDialogOpen,
  setObjectToDelete
}: UseMapHandlersProps) {
  const { toast } = useToast();

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

  const handleExportFiltered = (filteredData: PolygonObject[]) => {
    exportToGeoJSON(filteredData);
    toast({
      title: 'Экспорт завершён',
      description: `Экспортировано объектов: ${filteredData.length}`,
    });
  };

  const handleExportSelected = (selectedObject: PolygonObject | null) => {
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

  const handleDeleteConfirm = async (objectToDelete: string | null) => {
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

  return {
    handleRestoreFromTrash,
    handlePermanentDelete,
    handleEmptyTrash,
    handleImport,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
    handleExportCadastralNumbers,
    handleSaveObject,
    handleDeleteClick,
    handleDeleteConfirm,
    handleSaveCadastralParcel,
    handleBulkImport
  };
}
