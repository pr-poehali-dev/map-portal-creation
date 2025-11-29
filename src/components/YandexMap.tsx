import { useEffect, useRef } from 'react';
import { PolygonObject } from '@/types/polygon';

interface YandexMapProps {
  polygons: PolygonObject[];
  selectedPolygonId?: string | null;
  onPolygonClick?: (polygon: PolygonObject) => void;
  opacity?: number;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMap({ polygons, selectedPolygonId, onPolygonClick, opacity = 0.8 }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonObjectsRef = useRef<Map<string, any>>(new Map());
  const isInitialLoadRef = useRef<boolean>(true);

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

        mapInstanceRef.current.layers.add(
          new window.ymaps.Layer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&%c&%l', {
            projection: window.ymaps.projection.sphericalMercator
          })
        );
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
      const coordinates = polygon.coordinates.map(([x, y]) => {
        const lng = (x / 100) * 360 - 180;
        const lat = 90 - (y / 100) * 180;
        return [lat, lng];
      });

      coordinates.push(coordinates[0]);

      const isSelected = selectedPolygonId === polygon.id;

      const yandexPolygon = new window.ymaps.Polygon(
        [coordinates],
        {
          hintContent: polygon.name,
          balloonContent: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${polygon.name}</h3>
              <p style="margin: 4px 0; color: #666; font-size: 13px;">${polygon.type}</p>
              <p style="margin: 4px 0; font-size: 13px;"><strong>Площадь:</strong> ${polygon.area} км²</p>
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
        
        const polygonCoords = polygon.coordinates.map(([x, y]) => {
          const lng = (x / 100) * 360 - 180;
          const lat = 90 - (y / 100) * 180;
          return [lat, lng];
        });
        
        if (polygonCoords.length > 0) {
          mapInstanceRef.current.setBounds(
            window.ymaps.util.bounds.fromPoints(polygonCoords),
            { checkZoomRange: true, zoomMargin: 100, duration: 300 }
          );
        }
      });

      mapInstanceRef.current.geoObjects.add(yandexPolygon);
      polygonObjectsRef.current.set(polygon.id, yandexPolygon);
    });

    if (polygons.length > 0 && mapInstanceRef.current && isInitialLoadRef.current) {
      const allCoordinates = polygons.flatMap(polygon => 
        polygon.coordinates.map(([x, y]) => {
          const lng = (x / 100) * 360 - 180;
          const lat = 90 - (y / 100) * 180;
          return [lat, lng];
        })
      );

      if (allCoordinates.length > 0) {
        mapInstanceRef.current.setBounds(
          window.ymaps.util.bounds.fromPoints(allCoordinates),
          { checkZoomRange: true, zoomMargin: 50 }
        );
        isInitialLoadRef.current = false;
      }
    }
  }, [polygons, selectedPolygonId, opacity, onPolygonClick]);

  return <div ref={mapRef} className="w-full h-full" />;
}