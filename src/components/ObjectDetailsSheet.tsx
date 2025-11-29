import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Icon from '@/components/ui/icon';
import AttributeEditor from '@/components/AttributeEditor';
import { PolygonObject } from '@/types/polygon';

interface ObjectDetailsSheetProps {
  selectedObject: PolygonObject | null;
  setSelectedObject: (obj: PolygonObject | null) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  handleSaveObject: (obj: PolygonObject) => void;
  handleDeleteClick: (id: string) => void;
  handleExportSelected: () => void;
}

export default function ObjectDetailsSheet({
  selectedObject,
  setSelectedObject,
  isEditing,
  setIsEditing,
  handleSaveObject,
  handleDeleteClick,
  handleExportSelected
}: ObjectDetailsSheetProps) {
  if (!selectedObject) return null;

  return (
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
                  onClick={() => handleDeleteClick(selectedObject.id)}
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
  );
}
