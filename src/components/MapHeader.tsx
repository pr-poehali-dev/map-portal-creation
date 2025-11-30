import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';

interface MapHeaderProps {
  filteredData: PolygonObject[];
  polygonData: PolygonObject[];
  selectedObject: PolygonObject | null;
  setShowAllTrigger: (fn: (prev: number) => number) => void;
  setBulkImportOpen: (value: boolean) => void;
  handleExportAll: () => void;
  handleExportFiltered: () => void;
  handleExportCadastralNumbers: () => void;
  handleExportSelected: () => void;
}

export default function MapHeader({
  filteredData,
  polygonData,
  selectedObject,
  setShowAllTrigger,
  setBulkImportOpen,
  handleExportAll,
  handleExportFiltered,
  handleExportCadastralNumbers,
  handleExportSelected
}: MapHeaderProps) {
  return (
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
          onClick={() => setBulkImportOpen(true)}
        >
          <Icon name="Upload" size={16} className="mr-2" />
          Массовый импорт
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCadastralNumbers}>
              <Icon name="FileText" size={16} className="mr-2" />
              Кадастровые номера (.txt)
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
  );
}