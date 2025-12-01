import { useState, useEffect } from 'react';
import YandexMap from '@/components/YandexMap';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';
import { useAuth } from '@/contexts/AuthContext';

interface MapCanvasProps {
  useYandexMap: boolean;
  filteredData: PolygonObject[];
  selectedObject: PolygonObject | null;
  setSelectedObject: (obj: PolygonObject | null) => void;
  mapOpacity: number[];
  showAllTrigger: number;
}

const SEGMENTS_API = 'https://functions.poehali.dev/a0768bda-66ad-4c1e-b0f8-a32596d094b8';

interface Segment {
  id: number;
  name: string;
  color: string;
}

export default function MapCanvas({
  useYandexMap,
  filteredData,
  selectedObject,
  setSelectedObject,
  mapOpacity,
  showAllTrigger
}: MapCanvasProps) {
  const { user } = useAuth();
  const [segmentColors, setSegmentColors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const loadSegments = async () => {
      try {
        const response = await fetch(SEGMENTS_API, {
          headers: { 'X-User-Id': user?.token || '' }
        });
        
        if (response.ok) {
          const data: Segment[] = await response.json();
          const colors: Record<string, string> = {};
          data.forEach(seg => {
            colors[seg.name] = seg.color;
          });
          setSegmentColors(colors);
        }
      } catch (error) {
        console.error('Failed to load segments', error);
      }
    };
    
    loadSegments();
  }, [user]);
  
  const getPolygonColor = (polygon: PolygonObject) => {
    const segmentNames = polygon.segment ? polygon.segment.split(',').map(s => s.trim()).filter(Boolean) : [];
    const firstSegmentName = segmentNames[0] || '';
    return firstSegmentName && segmentColors[firstSegmentName] ? segmentColors[firstSegmentName] : polygon.color;
  };
  
  return (
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
            const isMultiPolygon = Array.isArray(item.coordinates[0]?.[0]?.[0]);
            
            if (isMultiPolygon) {
              const allCoords = item.coordinates.flatMap((ring: any) => ring);
              const centerX = allCoords.reduce((sum: number, coord: any) => sum + coord[0], 0) / allCoords.length;
              const centerY = allCoords.reduce((sum: number, coord: any) => sum + coord[1], 0) / allCoords.length;
              
              return (
                <g
                  key={item.id}
                  className="cursor-pointer transition-all hover:opacity-100"
                  onClick={() => setSelectedObject(item)}
                  style={{ opacity: mapOpacity[0] / 100 }}
                >
                  {item.coordinates.map((ring: any, idx: number) => {
                    const points = ring.map((coord: any) => coord.join(',')).join(' ');
                    return (
                      <polygon
                        key={idx}
                        points={points}
                        fill={getPolygonColor(item)}
                        fillOpacity={selectedObject?.id === item.id ? 0.6 : 0.4}
                        stroke={getPolygonColor(item)}
                        strokeWidth={selectedObject?.id === item.id ? 0.4 : 0.2}
                        className="transition-all"
                      />
                    );
                  })}
                  <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[2px] font-semibold pointer-events-none"
                    fill="white"
                  >
                    {item.name}
                  </text>
                </g>
              );
            } else {
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
                    fill={getPolygonColor(item)}
                    fillOpacity={selectedObject?.id === item.id ? 0.6 : 0.4}
                    stroke={getPolygonColor(item)}
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
            }
          })}
        </svg>
      )}
    </div>
  );
}