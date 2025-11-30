import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import GeoImportDialog from '@/components/GeoImportDialog';
import BulkCadastralImport from '@/components/BulkCadastralImport';
import { PolygonObject } from '@/types/polygon';

interface MapDialogsProps {
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
  handleImport: (polygons: PolygonObject[]) => Promise<void>;
  bulkImportOpen: boolean;
  setBulkImportOpen: (open: boolean) => void;
  handleBulkImport: (parcels: Array<{ cadastralNumber: string; coordinates: [number, number]; area?: number; address?: string; category?: string }>) => Promise<void>;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;
  confirmPermanentDelete: string | null;
  setConfirmPermanentDelete: (id: string | null) => void;
  handlePermanentDelete: (id: string) => void;
  confirmEmptyTrash: boolean;
  setConfirmEmptyTrash: (confirm: boolean) => void;
  handleEmptyTrash: () => void;
  trashDataLength: number;
}

export default function MapDialogs({
  importDialogOpen,
  setImportDialogOpen,
  handleImport,
  bulkImportOpen,
  setBulkImportOpen,
  handleBulkImport,
  deleteDialogOpen,
  setDeleteDialogOpen,
  handleDeleteConfirm,
  confirmPermanentDelete,
  setConfirmPermanentDelete,
  handlePermanentDelete,
  confirmEmptyTrash,
  setConfirmEmptyTrash,
  handleEmptyTrash,
  trashDataLength
}: MapDialogsProps) {
  return (
    <>
      <GeoImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
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
              Все объекты в корзине ({trashDataLength}) будут удалены безвозвратно. Это действие нельзя будет отменить.
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
    </>
  );
}