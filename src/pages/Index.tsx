import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import MapSidebar from '@/components/MapSidebar';
import MapHeader from '@/components/MapHeader';
import MapCanvas from '@/components/MapCanvas';
import ObjectDetailsSheet from '@/components/ObjectDetailsSheet';
import MapDialogs from '@/components/MapDialogs';
import { PolygonObject } from '@/types/polygon';
import { useAuth } from '@/contexts/AuthContext';
import { useMapData, layers } from '@/hooks/useMapData';
import { useMapHandlers } from '@/hooks/useMapHandlers';

export default function Index() {
  const { user, logout } = useAuth();
  const {
    polygonData,
    setPolygonData,
    isLoading,
    trashData,
    setTrashData,
    loadPolygons,
    loadTrash
  } = useMapData(user?.role);

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
  const [viewingTrash, setViewingTrash] = useState(false);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const {
    handleRestoreFromTrash,
    handlePermanentDelete,
    handleEmptyTrash,
    handleDeleteAll,
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
  } = useMapHandlers({
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
  });

  const filteredData = polygonData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'Все' || item.type === filterType;
    const matchesLayer = layerVisibility[item.layer];
    return matchesSearch && matchesFilter && matchesLayer;
  });

  const types = ['Все', ...Array.from(new Set(polygonData.map(item => item.type)))];

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
        handleDeleteAll={handleDeleteAll}
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
          handleExportFiltered={() => handleExportFiltered(filteredData)}
          handleExportCadastralNumbers={handleExportCadastralNumbers}
          handleExportSelected={() => handleExportSelected(selectedObject)}
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
          handleExportSelected={() => handleExportSelected(selectedObject)}
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

      <MapDialogs
        importDialogOpen={importDialogOpen}
        setImportDialogOpen={setImportDialogOpen}
        handleImport={handleImport}
        cadastralSearchOpen={cadastralSearchOpen}
        setCadastralSearchOpen={setCadastralSearchOpen}
        setCadastralSearchCoords={setCadastralSearchCoords}
        handleSaveCadastralParcel={handleSaveCadastralParcel}
        bulkImportOpen={bulkImportOpen}
        setBulkImportOpen={setBulkImportOpen}
        handleBulkImport={handleBulkImport}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        handleDeleteConfirm={() => handleDeleteConfirm(objectToDelete)}
        confirmPermanentDelete={confirmPermanentDelete}
        setConfirmPermanentDelete={setConfirmPermanentDelete}
        handlePermanentDelete={handlePermanentDelete}
        confirmEmptyTrash={confirmEmptyTrash}
        setConfirmEmptyTrash={setConfirmEmptyTrash}
        handleEmptyTrash={handleEmptyTrash}
        trashDataLength={trashData.length}
      />
    </div>
  );
}