import { useState, useEffect } from 'react';
import { PolygonObject } from '@/types/polygon';
import { polygonApi } from '@/services/polygonApi';
import { useToast } from '@/hooks/use-toast';

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

export const layers = [
  { name: 'Административное деление', visible: true, color: '#0EA5E9' },
  { name: 'Промышленность', visible: true, color: '#8B5CF6' },
  { name: 'Природные зоны', visible: true, color: '#10B981' },
  { name: 'Жилые зоны', visible: true, color: '#F97316' },
  { name: 'Коммерция', visible: true, color: '#EAB308' }
];

export function useMapData(userRole?: string) {
  const [polygonData, setPolygonData] = useState<PolygonObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trashData, setTrashData] = useState<PolygonObject[]>([]);
  const { toast } = useToast();

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
    if (userRole !== 'admin') return;
    
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

  useEffect(() => {
    loadPolygons();
  }, []);

  return {
    polygonData,
    setPolygonData,
    isLoading,
    trashData,
    setTrashData,
    loadPolygons,
    loadTrash
  };
}
