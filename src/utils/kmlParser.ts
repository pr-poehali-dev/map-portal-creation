export interface KMLPolygon {
  name: string;
  description?: string;
  coordinates: [number, number][][];
  properties: Record<string, any>;
}

export const parseKML = (kmlText: string): KMLPolygon[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Ошибка парсинга KML: некорректный XML');
  }

  const placemarks = xmlDoc.querySelectorAll('Placemark');
  const polygons: KMLPolygon[] = [];

  placemarks.forEach((placemark) => {
    const name = placemark.querySelector('name')?.textContent || 'Безымянный объект';
    const description = placemark.querySelector('description')?.textContent || '';

    const extendedData = placemark.querySelector('ExtendedData');
    const properties: Record<string, any> = {};

    if (extendedData) {
      const dataElements = extendedData.querySelectorAll('Data');
      dataElements.forEach((dataEl) => {
        const key = dataEl.getAttribute('name');
        const value = dataEl.querySelector('value')?.textContent;
        if (key && value) {
          properties[key] = value;
        }
      });
    }

    const polygonElements = placemark.querySelectorAll('Polygon');
    
    polygonElements.forEach((polygon) => {
      const outerBoundary = polygon.querySelector('outerBoundaryIs coordinates');
      
      if (outerBoundary && outerBoundary.textContent) {
        const coordsText = outerBoundary.textContent.trim();
        const coordPairs = coordsText.split(/\s+/).filter(s => s.length > 0);
        
        const coordinates: [number, number][] = coordPairs
          .map(pair => {
            const parts = pair.split(',');
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lng) && !isNaN(lat)) {
                return [lng, lat] as [number, number];
              }
            }
            return null;
          })
          .filter((coord): coord is [number, number] => coord !== null);

        if (coordinates.length >= 3) {
          polygons.push({
            name,
            description,
            coordinates: [coordinates],
            properties
          });
        }
      }
    });

    const multiGeometry = placemark.querySelector('MultiGeometry');
    if (multiGeometry) {
      const multiPolygons = multiGeometry.querySelectorAll('Polygon');
      multiPolygons.forEach((polygon) => {
        const outerBoundary = polygon.querySelector('outerBoundaryIs coordinates');
        
        if (outerBoundary && outerBoundary.textContent) {
          const coordsText = outerBoundary.textContent.trim();
          const coordPairs = coordsText.split(/\s+/).filter(s => s.length > 0);
          
          const coordinates: [number, number][] = coordPairs
            .map(pair => {
              const parts = pair.split(',');
              if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                  return [lng, lat] as [number, number];
                }
              }
              return null;
            })
            .filter((coord): coord is [number, number] => coord !== null);

          if (coordinates.length >= 3) {
            polygons.push({
              name,
              description,
              coordinates: [coordinates],
              properties
            });
          }
        }
      });
    }
  });

  return polygons;
};

export const convertKMLToPolygonObjects = (kmlPolygons: KMLPolygon[]) => {
  const colors = ['#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#EAB308', '#EC4899', '#06B6D4', '#8B5CF6'];
  
  return kmlPolygons.flatMap((kmlPoly, index) => {
    return kmlPoly.coordinates.map((coords, polyIndex) => {
      const normalizedCoords = coords.map(([lng, lat]: [number, number]) => {
        const x = ((lng + 180) / 360) * 100;
        const y = ((90 - lat) / 180) * 100;
        return [x, y] as [number, number];
      });

      const color = colors[(index + polyIndex) % colors.length];

      const calculateArea = (coordinates: [number, number][]) => {
        let area = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
          area += coordinates[i][0] * coordinates[i + 1][1];
          area -= coordinates[i + 1][0] * coordinates[i][1];
        }
        return Math.abs(area / 2) * 12.3;
      };

      const area = calculateArea(normalizedCoords);
      const validArea = isNaN(area) || area < 0.01 ? 20.82 : parseFloat(area.toFixed(2));

      return {
        id: `kml-${Date.now()}-${index}-${polyIndex}-${Math.random().toString(36).substr(2, 9)}`,
        name: kmlPoly.name || 'Безымянный объект',
        type: kmlPoly.properties.type || kmlPoly.properties.category || 'KML объект',
        area: validArea,
        population: kmlPoly.properties.population ? parseInt(kmlPoly.properties.population) : undefined,
        status: kmlPoly.properties.status || 'Импортирован',
        coordinates: normalizedCoords,
        color: color,
        layer: 'KML импорт',
        visible: true,
        attributes: {
          ...kmlPoly.properties,
          описание: kmlPoly.description || '',
          источник: 'KML'
        }
      };
    });
  });
};