import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';
import { formatArea } from '@/utils/geoUtils';

interface MapSidebarProps {
  user: any;
  logout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  types: string[];
  filterType: string;
  setFilterType: (type: string) => void;
  filteredData: PolygonObject[];
  selectedObject: PolygonObject | null;
  setSelectedObject: (obj: PolygonObject | null) => void;
  layers: Array<{ name: string; visible: boolean; color: string }>;
  layerVisibility: Record<string, boolean>;
  setLayerVisibility: (visibility: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  mapOpacity: number[];
  setMapOpacity: (opacity: number[]) => void;
  polygonData: PolygonObject[];
  setImportDialogOpen: (open: boolean) => void;
  trashData: PolygonObject[];
  viewingTrash: boolean;
  setViewingTrash: (viewing: boolean) => void;
  loadTrash: () => Promise<void>;
  handleRestoreFromTrash: (id: string) => Promise<void>;
  handlePermanentDelete: (id: string) => void;
  handleEmptyTrash: () => void;
  handleDeleteAll: () => void;
  loadSampleData: () => void;
}

export default function MapSidebar({
  user,
  logout,
  searchQuery,
  setSearchQuery,
  types,
  filterType,
  setFilterType,
  filteredData,
  selectedObject,
  setSelectedObject,
  layers,
  layerVisibility,
  setLayerVisibility,
  mapOpacity,
  setMapOpacity,
  polygonData,
  setImportDialogOpen,
  trashData,
  viewingTrash,
  setViewingTrash,
  loadTrash,
  handleRestoreFromTrash,
  handlePermanentDelete,
  handleEmptyTrash,
  handleDeleteAll,
  loadSampleData
}: MapSidebarProps) {
  useEffect(() => {
    if (viewingTrash && user?.role === 'admin') {
      loadTrash();
    }
  }, [viewingTrash]);

  return (
    <aside className="w-96 border-r border-sidebar-border bg-sidebar-background flex flex-col h-screen">
      <div className="p-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Icon name="Map" size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">GeoPortal</h1>
            <p className="text-xs text-sidebar-foreground/60">{user?.name}</p>
          </div>
        </div>
        <div className="space-y-1 mb-3">
          {user?.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin'}
              className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <Icon name="Shield" size={16} className="mr-2" />
              Администрирование
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти
          </Button>
        </div>

        <div className="relative">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
          <Input
            placeholder="Поиск объектов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
          />
        </div>
      </div>

      <Tabs defaultValue="objects" className="flex-1 flex flex-col min-h-0 overflow-hidden" onValueChange={(value) => setViewingTrash(value === 'trash')}>
        <TabsList className="mx-4 mt-3 mb-0 bg-sidebar-accent flex-shrink-0">
          <TabsTrigger value="objects" className="flex-1">
            <Icon name="Layers" size={16} className="mr-2" />
            Объекты
          </TabsTrigger>
          <TabsTrigger value="layers" className="flex-1">
            <Icon name="Eye" size={16} className="mr-2" />
            Слои
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="trash" className="flex-1">
              <Icon name="Trash2" size={16} className="mr-2" />
              Корзина
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="objects" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
          <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0">
            <Label className="text-xs text-sidebar-foreground/60 mb-2 block">Фильтр по типу</Label>
            <div className="flex flex-wrap gap-2">
              {types.map(type => (
                <Badge
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setFilterType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          
          <ScrollArea className="flex-1" style={{ height: '100%' }}>
            <div className="p-4 space-y-3">
              {filteredData.map(item => (
                <Card
                  key={item.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                    selectedObject?.id === item.id ? 'border-primary bg-primary/5' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedObject(item)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs text-card-foreground mb-2">{item.name}</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Icon name="Maximize2" size={12} />
                          {formatArea(item.area)}
                        </span>
                        {item.population && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Icon name="Users" size={12} />
                            {(item.population / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Search" size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Объекты не найдены</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {user?.role === 'admin' && (
                <div className="space-y-2 mb-4">
                  {polygonData.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={loadSampleData}
                    >
                      <Icon name="Database" size={16} className="mr-2" />
                      Загрузить демо-данные
                    </Button>
                  )}
                  {polygonData.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      onClick={handleDeleteAll}
                    >
                      <Icon name="Trash2" size={16} className="mr-2" />
                      Удалить все объекты ({polygonData.length})
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-1 mb-6">
                <Label className="text-xs text-sidebar-foreground/60">Прозрачность слоёв</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={mapOpacity}
                    onValueChange={setMapOpacity}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-sidebar-foreground font-medium w-12">{mapOpacity[0]}%</span>
                </div>
              </div>

              {layers.map(layer => (
                <Card key={layer.name} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="font-medium text-sm text-card-foreground">{layer.name}</span>
                    </div>
                    <Switch
                      checked={layerVisibility[layer.name]}
                      onCheckedChange={(checked) =>
                        setLayerVisibility(prev => ({ ...prev, [layer.name]: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="Database" size={12} />
                    <span>
                      {polygonData.filter(item => item.layer === layer.name).length} объектов
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="trash" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {trashData.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full mb-4"
                    onClick={handleEmptyTrash}
                  >
                    <Icon name="Trash2" size={16} className="mr-2" />
                    Очистить корзину ({trashData.length})
                  </Button>
                )}

                {trashData.map(item => (
                  <Card
                    key={item.id}
                    className="p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded-full mt-1 flex-shrink-0 opacity-50"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-card-foreground mb-1">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{item.type}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Icon name="Maximize2" size={12} />
                            {(item.area * 100).toFixed(2)} га
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleRestoreFromTrash(item.id)}
                      >
                        <Icon name="RotateCcw" size={14} className="mr-1" />
                        Восстановить
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePermanentDelete(item.id)}
                      >
                        <Icon name="X" size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}

                {trashData.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Trash2" size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Корзина пуста</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>

      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <Button className="w-full" size="lg" onClick={() => setImportDialogOpen(true)}>
          <Icon name="Upload" size={18} className="mr-2" />
          Импорт данных
        </Button>
      </div>
    </aside>
  );
}