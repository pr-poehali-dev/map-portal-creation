import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import MapSidebar from '@/components/MapSidebar';
import MapHeader from '@/components/MapHeader';
import MapCanvas from '@/components/MapCanvas';
import ObjectDetailsSheet from '@/components/ObjectDetailsSheet';
import MapDialogs from '@/components/MapDialogs';
import AIFeaturesTour from '@/components/AIFeaturesTour';
import { PolygonObject } from '@/types/polygon';
import { useAuth } from '@/contexts/AuthContext';
import { useMapData, segments } from '@/hooks/useMapData';
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
    loadTrash,
    loadSampleData
  } = useMapData(user?.role);

  const [selectedObject, setSelectedObject] = useState<PolygonObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Все');
  const [filterOwner, setFilterOwner] = useState('Все');
  const [segmentVisibility, setSegmentVisibility] = useState<Record<string, boolean>>(
    segments.reduce((acc, segment) => ({ ...acc, [segment.name]: true }), {})
  );

  useEffect(() => {
    if (polygonData.length > 0) {
      const allSegments = Array.from(new Set(polygonData.map(p => p.segment)));
      console.log('🔍 Detected segments from polygons:', allSegments);
      
      setSegmentVisibility(prev => {
        const updated = { ...prev };
        allSegments.forEach(segment => {
          if (!(segment in updated)) {
            console.log('➕ Adding new segment to visibility:', segment);
            updated[segment] = true;
          }
        });
        return updated;
      });
    }
  }, [polygonData]);
  const [mapOpacity, setMapOpacity] = useState([80]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllTrigger, setShowAllTrigger] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState<string | null>(null);
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
    handleBulkImport
  } = useMapHandlers({
    polygonData,
    setPolygonData,
    setTrashData,
    loadPolygons,
    loadTrash,
    setSegmentVisibility,
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
    const matchesSegment = segmentVisibility[item.segment];
    
    const ownerName = item.attributes?.['Правообладатель'] || item.attributes?.['правообладатель'] || '';
    const matchesOwner = filterOwner === 'Все' || ownerName === filterOwner;
    
    return matchesSearch && matchesFilter && matchesSegment && matchesOwner;
  });

  const types = ['Все', ...Array.from(new Set(polygonData.map(item => item.type)))];
  
  const owners = [
    'Все',
    ...Array.from(
      new Set(
        polygonData
          .map(item => item.attributes?.['Правообладатель'] || item.attributes?.['правообладатель'])
          .filter(Boolean)
      )
    )
  ];

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
        owners={owners}
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        filteredData={filteredData}
        selectedObject={selectedObject}
        setSelectedObject={setSelectedObject}
        segments={segments}
        segmentVisibility={segmentVisibility}
        setSegmentVisibility={setSegmentVisibility}
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
        loadSampleData={loadSampleData}
      />

      <main className="flex-1 flex flex-col">
        <MapHeader
          filteredData={filteredData}
          polygonData={polygonData}
          selectedObject={selectedObject}
          setShowAllTrigger={setShowAllTrigger}
          setBulkImportOpen={setBulkImportOpen}
          handleExportAll={handleExportAll}
          handleExportFiltered={() => handleExportFiltered(filteredData)}
          handleExportCadastralNumbers={handleExportCadastralNumbers}
          handleExportSelected={() => handleExportSelected(selectedObject)}
        />

        <MapCanvas
          useYandexMap={true}
          filteredData={filteredData}
          selectedObject={selectedObject}
          setSelectedObject={setSelectedObject}
          mapOpacity={mapOpacity}
          showAllTrigger={showAllTrigger}
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

      <AIFeaturesTour />
    </div>
  );
}