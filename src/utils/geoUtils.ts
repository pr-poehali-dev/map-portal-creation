import * as turf from '@turf/turf';

export function calculatePolygonArea(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) {
    return 0;
  }

  const closedCoordinates = [...coordinates];
  if (
    closedCoordinates[0][0] !== closedCoordinates[closedCoordinates.length - 1][0] ||
    closedCoordinates[0][1] !== closedCoordinates[closedCoordinates.length - 1][1]
  ) {
    closedCoordinates.push(closedCoordinates[0]);
  }

  const turfCoordinates = closedCoordinates.map(coord => [coord[1], coord[0]]);
  
  const polygon = turf.polygon([turfCoordinates]);
  const areaInSquareMeters = turf.area(polygon);
  const areaInHectares = areaInSquareMeters / 10000;
  
  return areaInHectares;
}

export function formatArea(areaInHectares: number): string {
  if (areaInHectares < 0.01) {
    return `${(areaInHectares * 10000).toFixed(0)} м²`;
  } else if (areaInHectares < 100) {
    return `${areaInHectares.toFixed(2)} га`;
  } else {
    return `${(areaInHectares / 100).toFixed(2)} км²`;
  }
}
