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
      const loadCadastralData = async () => {
        try {
          const zoom = mapInstanceRef.current.getZoom();
          
          // Загружаем только при высоком зуме (15+) чтобы не перегружать
          if (zoom < 15) {
            console.log('⏭️ Zoom too low for cadastral data, increase zoom to 15+');
            return;
          }
          
          const bounds = mapInstanceRef.current.getBounds();
          const [[south, west], [north, east]] = bounds;
          
          // Запрос через наш backend прокси
          const bbox = `${west},${south},${east},${north}`;
          const backendUrl = 'https://functions.poehali.dev/2f81dfc7-e194-4d3d-b534-101134e59c05';
          
          console.log(`🔍 Loading cadastral data for bbox: ${bbox}`);
          const response = await fetch(`${backendUrl}?bbox=${encodeURIComponent(bbox)}`);
          
          if (!response.ok) {
            console.error(`❌ Backend error: ${response.status}`);
            return;
          }
          
          const geojson = await response.json();
          
          if (geojson.error) {
            console.error('❌ API error:', geojson.error);
            return;
          }
          
          if (geojson.features && geojson.features.length > 0) {
            geojson.features.forEach((feature: any) => {
              if (feature.geometry && feature.geometry.type === 'Polygon') {
                const coords = feature.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
                
                const polygon = new window.ymaps.Polygon([coords], {
                  hintContent: `Кадастровый номер: ${feature.properties?.cn || 'Не указан'}`
                }, {
                  fillColor: '#FF000033',
                  strokeColor: '#FF0000',
                  strokeWidth: 2,
                  strokeOpacity: 0.7,
                  fillOpacity: 0.2
                });
                
                mapInstanceRef.current.geoObjects.add(polygon);
                cadastralPolygonsRef.current.push(polygon);
              }
            });
            
            console.log(`✅ Loaded ${geojson.features.length} cadastral parcels`);
          } else {
            console.log('ℹ️ No cadastral parcels in this area');
          }
        } catch (error) {
          console.error('❌ Failed to load cadastral data:', error);
        }
      };

      loadCadastralData();
      
      // Обновляем данные при изменении bounds карты (с debounce)
      let timeout: any;
      const boundsChangeHandler = () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadCadastralData, 500);
      };
      
      mapInstanceRef.current.events.add('boundschange', boundsChangeHandler);
      
      return () => {
        clearTimeout(timeout);
        mapInstanceRef.current?.events.remove('boundschange', boundsChangeHandler);
      };
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