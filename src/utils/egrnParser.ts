import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { MapObject } from '@/types';

interface EgrnCoordinate {
  X: string;
  Y: string;
}

interface EgrnContour {
  EntitySpatial?: {
    SpatialElement?: {
      SpelementUnit?: {
        SpatialPoint?: EgrnCoordinate | EgrnCoordinate[];
      };
      Ordinate?: {
        X: string;
        Y: string;
      } | Array<{ X: string; Y: string }>;
    };
  };
}

export async function parseEgrnZip(file: File): Promise<Partial<MapObject>[]> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    const results: Partial<MapObject>[] = [];
    
    for (const [filename, zipEntry] of Object.entries(contents.files)) {
      if (filename.endsWith('.xml') && !zipEntry.dir) {
        const xmlContent = await zipEntry.async('text');
        const parsed = await parseEgrnXml(xmlContent);
        if (parsed) {
          results.push(parsed);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Ошибка парсинга ЕГРН ZIP:', error);
    throw new Error('Не удалось прочитать ZIP архив');
  }
}

export async function parseEgrnXml(xmlContent: string): Promise<Partial<MapObject> | null> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    
    const result = parser.parse(xmlContent);
    
    // Ищем данные участка в разных возможных путях ЕГРН XML
    const extract = result?.extract_cadastral_plan_territory || result?.ExtractCadastralPlanTerritory;
    const parcels = extract?.ReestrExtract?.Parcel || extract?.Parcels?.Parcel;
    
    if (!parcels) {
      console.warn('Не найдены данные участка в XML');
      return null;
    }
    
    const parcel = Array.isArray(parcels) ? parcels[0] : parcels;
    
    // Извлекаем кадастровый номер
    const cadastralNumber = parcel['@_CadastralNumber'] || parcel.CadastralNumber || 'Без номера';
    
    // Извлекаем площадь
    const areaValue = parcel.Area?.['@_value'] || parcel.Area || 0;
    const area = typeof areaValue === 'string' ? parseFloat(areaValue) : areaValue;
    
    // Извлекаем координаты
    const contours = parcel.Contours?.Contour || parcel.EntitySpatial;
    const contour = Array.isArray(contours) ? contours[0] : contours;
    
    const coordinates = extractCoordinatesFromContour(contour);
    
    if (coordinates.length === 0) {
      console.warn('Не найдены координаты в XML');
      return null;
    }
    
    // Конвертируем координаты из МСК в WGS-84
    const wgs84Coords = coordinates.map(coord => msk77ToWgs84(coord[0], coord[1]));
    
    return {
      id: `egrn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Участок ${cadastralNumber}`,
      cadastralNumber,
      area: Math.round(area),
      coordinates: wgs84Coords,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    };
  } catch (error) {
    console.error('Ошибка парсинга ЕГРН XML:', error);
    return null;
  }
}

function extractCoordinatesFromContour(contour: EgrnContour): [number, number][] {
  const coords: [number, number][] = [];
  
  if (!contour) return coords;
  
  // Вариант 1: EntitySpatial -> SpatialElement -> SpelementUnit -> SpatialPoint
  const spatialElement = contour.EntitySpatial?.SpatialElement;
  if (spatialElement) {
    const points = spatialElement.SpelementUnit?.SpatialPoint;
    if (points) {
      const pointArray = Array.isArray(points) ? points : [points];
      pointArray.forEach(point => {
        const x = parseFloat(point.X);
        const y = parseFloat(point.Y);
        if (!isNaN(x) && !isNaN(y)) {
          coords.push([x, y]);
        }
      });
    }
    
    // Альтернатива: Ordinate
    const ordinates = spatialElement.Ordinate;
    if (ordinates && coords.length === 0) {
      const ordArray = Array.isArray(ordinates) ? ordinates : [ordinates];
      ordArray.forEach(ord => {
        const x = parseFloat(ord.X);
        const y = parseFloat(ord.Y);
        if (!isNaN(x) && !isNaN(y)) {
          coords.push([x, y]);
        }
      });
    }
  }
  
  return coords;
}

/**
 * Конвертация координат из МСК-77 (Москва) в WGS-84 (lat, lon)
 * Это упрощенная реализация. Для точной конвертации нужна библиотека proj4js
 * 
 * МСК-77: X (север), Y (восток) в метрах от условного начала координат
 * WGS-84: latitude (широта), longitude (долгота) в градусах
 */
export function msk77ToWgs84(x: number, y: number): [number, number] {
  // Параметры для МСК-77 (зона 1 - Москва)
  // Центр системы: 37.5° в.д., 55.5° с.ш.
  const centerLon = 37.5;
  const centerLat = 55.5;
  
  // Масштабный коэффициент (примерный для Москвы)
  // 1 градус широты ≈ 111 км
  // 1 градус долготы на широте Москвы ≈ 65 км
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLon = 65000;
  
  // Конвертация
  const lon = centerLon + (y / metersPerDegreeLon);
  const lat = centerLat + (x / metersPerDegreeLat);
  
  return [lat, lon];
}

/**
 * Более точная конвертация с использованием proj4
 * Требует установки: bun add proj4
 */
/*
import proj4 from 'proj4';

// Определение МСК-77 (зона 1)
proj4.defs('EPSG:32637', '+proj=tmerc +lat_0=0 +lon_0=39 +k=1 +x_0=500000 +y_0=0 +ellps=krass +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12 +units=m +no_defs');

export function msk77ToWgs84Precise(x: number, y: number): [number, number] {
  const [lon, lat] = proj4('EPSG:32637', 'EPSG:4326', [y, x]);
  return [lat, lon];
}
*/
