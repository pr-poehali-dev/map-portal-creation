import { useState, useEffect } from 'react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import GeoImportDialog from '@/components/GeoImportDialog';
import AttributeEditor from '@/components/AttributeEditor';
import YandexMap from '@/components/YandexMap';
import { PolygonObject } from '@/types/polygon';
import { exportToGeoJSON } from '@/utils/geoExport';
import { useToast } from '@/hooks/use-toast';
import { polygonApi } from '@/services/polygonApi';

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

  const handleDeleteObject = async (id: string) => {
    try {
      await polygonApi.delete(id);
      setPolygonData(prev => prev.filter(obj => obj.id !== id));
      setSelectedObject(null);
      toast({
        title: 'Объект удалён',
        description: 'Объект успешно удалён из базы данных',
      });
    } catch (error) {
      toast({
        title: 'Ошибка удаления',
        description: 'Не удалось удалить объект',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex h-screen bg-background dark">
      <aside className="w-80 border-r border-sidebar-border bg-sidebar-background flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="Map" size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">GeoPortal</h1>
              <p className="text-xs text-sidebar-foreground/60">Картографическая система</p>
            </div>
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

        <Tabs defaultValue="objects" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 bg-sidebar-accent">
            <TabsTrigger value="objects" className="flex-1">
              <Icon name="Layers" size={16} className="mr-2" />
              Объекты
            </TabsTrigger>
            <TabsTrigger value="layers" className="flex-1">
              <Icon name="Eye" size={16} className="mr-2" />
              Слои
            </TabsTrigger>
          </TabsList>

          <TabsContent value="objects" className="flex-1 mt-0">
            <div className="p-4 border-b border-sidebar-border">
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

            <ScrollArea className="flex-1">
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
                        <h3 className="font-semibold text-sm text-card-foreground mb-1">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{item.type}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Icon name="Maximize2" size={12} />
                            {item.area} км²
                          </span>
                          {item.population && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Icon name="Users" size={12} />
                              {(item.population / 1000).toFixed(0)}k
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.status}
                      </Badge>
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

          <TabsContent value="layers" className="flex-1 mt-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
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
        </Tabs>

        <div className="p-4 border-t border-sidebar-border">
          <Button className="w-full" size="lg" onClick={() => setImportDialogOpen(true)}>
            <Icon name="Upload" size={18} className="mr-2" />
            Импорт данных
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">Интерактивная карта</h2>
            <Badge variant="outline" className="text-xs">
              <Icon name="Layers" size={12} className="mr-1" />
              {filteredData.length} объектов
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllTrigger(prev => prev + 1)}
            >
              <Icon name="Maximize" size={16} className="mr-2" />
              Показать все
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseYandexMap(!useYandexMap)}
            >
              <Icon name={useYandexMap ? "Grid3x3" : "Globe"} size={16} className="mr-2" />
              {useYandexMap ? 'Схема' : 'Яндекс'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                  <Icon name="Download" size={16} className="mr-2" />
                  Экспорт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleExportAll}>
                  <Icon name="Database" size={16} className="mr-2" />
                  Все объекты ({polygonData.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportFiltered}>
                  <Icon name="Filter" size={16} className="mr-2" />
                  Отфильтрованные ({filteredData.length})
                </DropdownMenuItem>
                {selectedObject && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportSelected}>
                      <Icon name="FileDown" size={16} className="mr-2" />
                      Выбранный объект
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 relative bg-muted/30 overflow-hidden">
          {useYandexMap ? (
            <YandexMap
              polygons={filteredData}
              selectedPolygonId={selectedObject?.id}
              onPolygonClick={setSelectedObject}
              opacity={mapOpacity[0] / 100}
              showAllTrigger={showAllTrigger}
            />
          ) : (
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-border" />
                </pattern>
              </defs>
              
              <rect width="100" height="100" fill="url(#grid)" />

              {filteredData.map(item => {
                const points = item.coordinates.map(coord => coord.join(',')).join(' ');
                return (
                  <g
                    key={item.id}
                    className="cursor-pointer transition-all hover:opacity-100"
                    onClick={() => setSelectedObject(item)}
                    style={{ opacity: mapOpacity[0] / 100 }}
                  >
                    <polygon
                      points={points}
                      fill={item.color}
                      fillOpacity={selectedObject?.id === item.id ? 0.6 : 0.4}
                      stroke={item.color}
                      strokeWidth={selectedObject?.id === item.id ? 0.4 : 0.2}
                      className="transition-all"
                    />
                    <text
                      x={(item.coordinates[0][0] + item.coordinates[2][0]) / 2}
                      y={(item.coordinates[0][1] + item.coordinates[2][1]) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[2px] font-semibold pointer-events-none"
                      fill="white"
                    >
                      {item.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {selectedObject && (
            <Sheet open={!!selectedObject} onOpenChange={() => {
              setSelectedObject(null);
              setIsEditing(false);
            }}>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-lg"
                        style={{ backgroundColor: selectedObject.color }}
                      />
                      <div>
                        <SheetTitle className="text-2xl">{selectedObject.name}</SheetTitle>
                        <SheetDescription>{selectedObject.type}</SheetDescription>
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Icon name="Edit" size={16} className="mr-2" />
                          Редактировать
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteObject(selectedObject.id)}
                        >
                          <Icon name="Trash2" size={16} className="mr-2" />
                          Удалить
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {isEditing ? (
                    <AttributeEditor
                      object={selectedObject}
                      onSave={handleSaveObject}
                      onCancel={() => setIsEditing(false)}
                    />
                  ) : (
                    <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name="Maximize2" size={16} className="text-primary" />
                        <span className="text-xs text-muted-foreground">Площадь</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{selectedObject.area} км²</p>
                    </Card>

                    {selectedObject.population && (
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name="Users" size={16} className="text-secondary" />
                          <span className="text-xs text-muted-foreground">Население</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {(selectedObject.population / 1000).toFixed(0)}k
                        </p>
                      </Card>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Основная информация</Label>
                    <Card className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Статус</span>
                        <Badge>{selectedObject.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Слой</span>
                        <span className="text-sm font-medium text-foreground">{selectedObject.layer}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">ID объекта</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{selectedObject.id}</code>
                      </div>
                    </Card>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Атрибуты</Label>
                    <Card className="p-4 space-y-3">
                      {Object.entries(selectedObject.attributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground capitalize">{key}</span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </Card>
                  </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" onClick={() => setIsEditing(true)}>
                        <Icon name="Edit" size={16} className="mr-2" />
                        Редактировать
                      </Button>
                      <Button className="flex-1" onClick={handleExportSelected}>
                        <Icon name="Download" size={16} className="mr-2" />
                        Экспорт
                      </Button>
                    </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

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
            <Icon name="Activity" size={14} className="text-primary" />
            <span>Система активна</span>
          </div>
        </footer>
      </main>

      <GeoImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  );
}