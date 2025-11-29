import YandexMap from '@/components/YandexMap';
import Icon from '@/components/ui/icon';
import { PolygonObject } from '@/types/polygon';

interface MapCanvasProps {
  useYandexMap: boolean;
  filteredData: PolygonObject[];
  selectedObject: PolygonObject | null;
  setSelectedObject: (obj: PolygonObject | null) => void;
  mapOpacity: number[];
  showAllTrigger: number;
  showCadastralLayer: boolean;
  cadastralSearchCoords: [number, number] | null;
}

export default function MapCanvas({
  useYandexMap,
  filteredData,
  selectedObject,
  setSelectedObject,
  mapOpacity,
  showAllTrigger,
  showCadastralLayer,
  cadastralSearchCoords
}: MapCanvasProps) {
  return (
    <div className="flex-1 relative bg-muted/30 overflow-hidden">
      {useYandexMap ? (
        <YandexMap
          polygons={filteredData}
          selectedPolygonId={selectedObject?.id}
          onPolygonClick={setSelectedObject}
          opacity={mapOpacity[0] / 100}
          showAllTrigger={showAllTrigger}
          showCadastralLayer={showCadastralLayer}
          cadastralSearchCoords={cadastralSearchCoords}
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
    </div>
  );
}
