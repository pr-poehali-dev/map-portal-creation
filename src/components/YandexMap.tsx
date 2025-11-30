import { useEffect, useRef } from 'react';
import { PolygonObject } from '@/types/polygon';
import { formatArea } from '@/utils/geoUtils';

interface YandexMapProps {
  polygons: PolygonObject[];
  selectedPolygonId?: string | null;
  onPolygonClick?: (polygon: PolygonObject) => void;
  opacity?: number;
  showAllTrigger?: number;
  showCadastralLayer?: boolean;
  cadastralSearchCoords?: [number, number] | null;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMap({ polygons, selectedPolygonId, onPolygonClick, opacity = 0.8, showAllTrigger = 0, showCadastralLayer = false, cadastralSearchCoords = null }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonObjectsRef = useRef<Map<string, any>>(new Map());
  const isInitialLoadRef = useRef<boolean>(true);
  const cadastralLayerRef = useRef<any>(null);
  const cadastralPolygonsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.ymaps) {
        setTimeout(initMap, 100);
        return;
      }

      window.ymaps.ready(() => {
        if (mapInstanceRef.current) return;

        mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
          center: [55.76, 37.64],
          zoom: 10,
          controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
        });
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.ymaps) return;

    polygonObjectsRef.current.forEach(obj => {
      mapInstanceRef.current.geoObjects.remove(obj);
    });
    polygonObjectsRef.current.clear();

    polygons.forEach(polygon => {
      const isMultiPolygon = Array.isArray(polygon.coordinates[0]?.[0]?.[0]);
      
      let yandexCoordinates;
      
      if (isMultiPolygon) {
        yandexCoordinates = polygon.coordinates.map((ring: any) => {
          const coords = ring.map(([x, y]: [number, number]) => {
            const lng = (x / 100) * 360 - 180;
            const lat = 90 - (y / 100) * 180;
            return [lat, lng];
          });
          coords.push(coords[0]);
          return coords;
        });
      } else {
        const coordinates = polygon.coordinates.map(([x, y]) => {
          const lng = (x / 100) * 360 - 180;
          const lat = 90 - (y / 100) * 180;
          return [lat, lng];
        });
        coordinates.push(coordinates[0]);
        yandexCoordinates = [coordinates];
      }

      const isSelected = selectedPolygonId === polygon.id;

      const yandexPolygon = new window.ymaps.Polygon(
        yandexCoordinates,
        {
          hintContent: polygon.name,
          balloonContent: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${polygon.name}</h3>
              <p style="margin: 4px 0; color: #666; font-size: 13px;">${polygon.type}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Площадь:</strong> ${formatArea(polygon.area)}</p>
              ${polygon.population ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Население:</strong> ${polygon.population.toLocaleString()}</p>` : ''}
              <p style="margin: 4px 0; font-size: 13px;"><strong>Статус:</strong> ${polygon.status}</p>
            </div>
          `
        },
        {
          fillColor: polygon.color,
          fillOpacity: isSelected ? opacity * 0.8 : opacity * 0.5,
          strokeColor: polygon.color,
          strokeWidth: isSelected ? 3 : 2,
          strokeOpacity: opacity
        }
      );

      yandexPolygon.events.add('click', () => {
        if (onPolygonClick) {
          onPolygonClick(polygon);
        }
        
        const allCoords = isMultiPolygon 
          ? polygon.coordinates.flatMap((ring: any) => ring.map(([x, y]: [number, number]) => {
              const lng = (x / 100) * 360 - 180;
              const lat = 90 - (y / 100) * 180;
              return [lat, lng];
            }))
          : polygon.coordinates.map(([x, y]) => {
              const lng = (x / 100) * 360 - 180;
              const lat = 90 - (y / 100) * 180;
              return [lat, lng];
            });
        
        if (allCoords.length > 0) {
          mapInstanceRef.current.setBounds(
            window.ymaps.util.bounds.fromPoints(allCoords),
            { checkZoomRange: true, zoomMargin: 100, duration: 300 }
          );
        }
      });

      mapInstanceRef.current.geoObjects.add(yandexPolygon);
      polygonObjectsRef.current.set(polygon.id, yandexPolygon);
    });

    if (polygons.length > 0 && mapInstanceRef.current && isInitialLoadRef.current) {
      const allCoordinates = polygons.flatMap(polygon => {
        const isMulti = Array.isArray(polygon.coordinates[0]?.[0]?.[0]);
        if (isMulti) {
          return polygon.coordinates.flatMap((ring: any) => 
            ring.map(([x, y]: [number, number]) => {
              const lng = (x / 100) * 360 - 180;
              const lat = 90 - (y / 100) * 180;
              return [lat, lng];
            })
          );
        } else {
          return polygon.coordinates.map(([x, y]) => {
            const lng = (x / 100) * 360 - 180;
            const lat = 90 - (y / 100) * 180;
            return [lat, lng];
          });
        }
      });

      if (allCoordinates.length > 0) {
        mapInstanceRef.current.setBounds(
          window.ymaps.util.bounds.fromPoints(allCoordinates),
          { checkZoomRange: true, zoomMargin: 50 }
        );
        isInitialLoadRef.current = false;
      }
    }
  }, [polygons, selectedPolygonId, opacity, onPolygonClick]);

  useEffect(() => {
    if (showAllTrigger === 0 || !mapInstanceRef.current || !window.ymaps || polygons.length === 0) return;

    const allCoordinates = polygons.flatMap(polygon => {
      const isMulti = Array.isArray(polygon.coordinates[0]?.[0]?.[0]);
      if (isMulti) {
        return polygon.coordinates.flatMap((ring: any) => 
          ring.map(([x, y]: [number, number]) => {
            const lng = (x / 100) * 360 - 180;
            const lat = 90 - (y / 100) * 180;
            return [lat, lng];
          })
        );
      } else {
        return polygon.coordinates.map(([x, y]) => {
          const lng = (x / 100) * 360 - 180;
          const lat = 90 - (y / 100) * 180;
          return [lat, lng];
        });
      }
    });

    if (allCoordinates.length > 0) {
      mapInstanceRef.current.setBounds(
        window.ymaps.util.bounds.fromPoints(allCoordinates),
        { checkZoomRange: true, zoomMargin: 50, duration: 300 }
      );
    }
  }, [showAllTrigger, polygons]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.ymaps) return;

    // Очистка предыдущих кадастровых полигонов
    cadastralPolygonsRef.current.forEach(polygon => {
      mapInstanceRef.current.geoObjects.remove(polygon);
    });
    cadastralPolygonsRef.current = [];

    if (showCadastralLayer) {
      // Показываем информационную плашку о кадастровом слое
      const center = mapInstanceRef.current.getCenter();
      
      const infoPlacemark = new window.ymaps.Placemark(
        center,
        {
          balloonContent: `
            <div style="padding: 12px; max-width: 300px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Кадастровый слой</h3>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
                К сожалению, API Росреестра блокирует запросы от облачных серверов.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">
                Для просмотра кадастровых границ используйте официальную карту:
              </p>
              <a href="https://pkk.rosreestr.ru/" target="_blank" style="
                display: inline-block;
                padding: 8px 16px;
                background: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
              ">
                Открыть ПКК Росреестра
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #999;">
                Вы можете искать участки по кадастровому номеру через кнопку "Поиск" в шапке карты.
              </p>
            </div>
          `
        },
        {
          preset: 'islands#blueInfoIcon'
        }
      );
      
      mapInstanceRef.current.geoObjects.add(infoPlacemark);
      cadastralPolygonsRef.current.push(infoPlacemark);
      
      // Автоматически открываем балун
      infoPlacemark.balloon.open();
      
      console.log('ℹ️ Cadastral layer info shown - Rosreestr blocks cloud server requests');
    }
  }, [showCadastralLayer]);

  useEffect(() => {
    if (!cadastralSearchCoords || !mapInstanceRef.current) return;

    mapInstanceRef.current.setCenter(cadastralSearchCoords, 17, {
      duration: 500
    });

    const placemark = new window.ymaps.Placemark(
      cadastralSearchCoords,
      {
        hintContent: 'Найденный участок'
      },
      {
        preset: 'islands#redDotIcon'
      }
    );

    mapInstanceRef.current.geoObjects.add(placemark);

    setTimeout(() => {
      mapInstanceRef.current.geoObjects.remove(placemark);
    }, 5000);
  }, [cadastralSearchCoords]);

  useEffect(() => {
    if (!selectedPolygonId || !mapInstanceRef.current || !window.ymaps) return;

    const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
    if (!selectedPolygon) return;

    const coordinates = selectedPolygon.coordinates.map(([x, y]) => {
      const lng = (x / 100) * 360 - 180;
      const lat = 90 - (y / 100) * 180;
      return [lat, lng];
    });

    if (coordinates.length > 0) {
      mapInstanceRef.current.setBounds(
        window.ymaps.util.bounds.fromPoints(coordinates),
        { checkZoomRange: true, zoomMargin: 100, duration: 300 }
      );
    }
  }, [selectedPolygonId, polygons]);

  return <div ref={mapRef} className="w-full h-full" />;
}