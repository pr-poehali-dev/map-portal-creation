import { useEffect, useState } from 'react';
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
import AIAssistant from './AIAssistant';
import { BadgePulse } from '@/components/ui/badge-pulse';
import CadastreImport from './CadastreImport';
import SegmentManager from './SegmentManager';

interface MapSidebarProps {
  user: any;
  logout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  types: string[];
  filterType: string;
  setFilterType: (type: string) => void;
  owners: string[];
  filterOwner: string;
  setFilterOwner: (owner: string) => void;
  filteredData: PolygonObject[];
  selectedObject: PolygonObject | null;
  setSelectedObject: (obj: PolygonObject | null) => void;
  segments: Array<{ name: string; visible: boolean; color: string }>;
  segmentVisibility: Record<string, boolean>;
  setSegmentVisibility: (visibility: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
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
  owners,
  filterOwner,
  setFilterOwner,
  filteredData,
  selectedObject,
  setSelectedObject,
  segments,
  segmentVisibility,
  setSegmentVisibility,
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
  const [showAIBadge, setShowAIBadge] = useState(true);



  const getOwnerStats = (ownerName: string) => {
    if (ownerName === 'Все') return { count: polygonData.length, totalArea: 0 };
    
    const ownerPolygons = polygonData.filter(p => {
      const owner = p.attributes?.['Правообладатель'] || p.attributes?.['правообладатель'];
      return owner === ownerName;
    });
    
    const totalArea = ownerPolygons.reduce((sum, p) => sum + (p.area || 0), 0);
    
    return { count: ownerPolygons.length, totalArea };
  };

  useEffect(() => {
    if (viewingTrash && user?.role === 'admin') {
      loadTrash();
    }
  }, [viewingTrash]);

  useEffect(() => {
    const hasSeenAI = localStorage.getItem('ai-badge-seen');
    if (hasSeenAI) {
      setShowAIBadge(false);
    }
  }, []);

  const handleAITabClick = () => {
    setShowAIBadge(false);
    localStorage.setItem('ai-badge-seen', 'true');
  };

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

        <div className="relative group">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40" />
          <Input
            placeholder="Поиск объектов... (попробуйте AI-поиск)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Умный поиск через AI"
          >
            <Icon name="Sparkles" size={16} />
          </Button>
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
          <TabsTrigger value="ai" className="flex-1 relative" onClick={handleAITabClick}>
            {showAIBadge ? (
              <BadgePulse>
                <div className="flex items-center">
                  <Icon name="Bot" size={16} className="mr-2" />
                  AI
                </div>
              </BadgePulse>
            ) : (
              <>
                <Icon name="Bot" size={16} className="mr-2" />
                AI
              </>
            )}
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="trash" className="flex-1">
              <Icon name="Trash2" size={16} className="mr-2" />
              Корзина
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="objects" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
          <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0 space-y-3">
            <CadastreImport 
              userId={user?.id} 
              onSuccess={() => window.location.reload()} 
            />
            
            <div>
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
            
            {owners.length > 1 && (
              <div>
                <Label className="text-xs text-sidebar-foreground/60 mb-2 block">
                  <Icon name="Building2" size={12} className="inline mr-1" />
                  Правообладатель
                </Label>
                <ScrollArea className="max-h-[200px]">
                  <div className="flex flex-col gap-2 pr-3">
                    {owners.map(owner => {
                      const stats = getOwnerStats(owner);
                      return (
                        <div
                          key={owner}
                          className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            filterOwner === owner 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-sidebar-accent border-sidebar-border hover:border-primary/50'
                          }`}
                          onClick={() => setFilterOwner(owner)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-sidebar-foreground truncate">
                                {owner}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                                  <Icon name="Map" size={12} />
                                  <span>{stats.count} уч.</span>
                                </div>
                                {stats.totalArea > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
                                    <Icon name="Ruler" size={12} />
                                    <span>{stats.totalArea.toFixed(2)} га</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {filterOwner === owner && (
                              <Icon name="Check" size={16} className="text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1" style={{ height: '100%' }}>
            <div className="p-4 space-y-1.5">
              {filteredData.map(item => (
                <Card
                  key={item.id}
                  className={`p-2.5 cursor-pointer transition-all hover:shadow-lg border-2 ${
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
                <div className="space-y-3">
                  <Label className="text-xs text-sidebar-foreground/60">
                    <Icon name="Settings" size={12} className="inline mr-1" />
                    Настройки
                  </Label>
                  <SegmentManager />
                </div>
              )}
              
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="Layers" size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm mb-2">Технические слои карты</p>
                <p className="text-xs">Кадастровая карта, Викимапия, спутник и другие источники</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
          <AIAssistant />
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