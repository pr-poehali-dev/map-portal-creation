import * as turf from '@turf/turf';

export function percentToGeo(percentCoords: number[][]): number[][] {
  return percentCoords.map(([x, y]) => [
    (x / 100) * 360 - 180,
    90 - (y / 100) * 180
  ]);
}

export function calculatePolygonArea(coordinates: number[][], isPercent: boolean = true): number {
  if (!coordinates || coordinates.length < 3) {
    return 0;
  }

  const geoCoords = isPercent ? percentToGeo(coordinates) : coordinates;
  
  const closedCoordinates = [...geoCoords];
  if (
    closedCoordinates[0][0] !== closedCoordinates[closedCoordinates.length - 1][0] ||
    closedCoordinates[0][1] !== closedCoordinates[closedCoordinates.length - 1][1]
  ) {
    closedCoordinates.push(closedCoordinates[0]);
  }

  const polygon = turf.polygon([closedCoordinates]);
  const areaInSquareMeters = turf.area(polygon);
  
  return areaInSquareMeters;
}

export function formatArea(areaInSquareMeters: number): string {
  if (areaInSquareMeters < 1000000) {
    const areaInHectares = areaInSquareMeters / 10000;
    return `${areaInHectares.toFixed(2)} га`;
  } else {
    const areaKm2 = areaInSquareMeters / 1000000;
    return `${areaKm2.toFixed(2)} км²`;
  }
}