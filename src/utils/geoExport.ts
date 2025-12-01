import { PolygonObject } from '@/types/polygon';

export const convertToGeoJSON = (polygons: PolygonObject[]) => {
  const features = polygons.map(polygon => {
    const coordinates = polygon.coordinates.map(([x, y]) => {
      const lng = (x / 100) * 360 - 180;
      const lat = 90 - (y / 100) * 180;
      return [lng, lat];
    });

    coordinates.push(coordinates[0]);

    return {
      type: 'Feature',
      properties: {
        id: polygon.id,
        name: polygon.name,
        type: polygon.type,
        area: polygon.area,
        population: polygon.population,
        status: polygon.status,
        color: polygon.color,
        segment: polygon.segment,
        ...polygon.attributes
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates]
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
};

export const downloadGeoJSON = (geojson: any, filename: string = 'export.geojson') => {
  const jsonString = JSON.stringify(geojson, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const exportToGeoJSON = (polygons: PolygonObject[], filename?: string) => {
  const geojson = convertToGeoJSON(polygons);
  const defaultFilename = `geoportal_export_${new Date().toISOString().split('T')[0]}.geojson`;
  downloadGeoJSON(geojson, filename || defaultFilename);
};