export interface PolygonObject {
  id: string;
  name: string;
  type: string;
  area: number;
  population?: number;
  status: string;
  coordinates: [number, number][];
  color: string;
  segment: string;
  visible: boolean;
  attributes: Record<string, any>;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'cadastre' | 'wikimapia' | 'satellite' | 'terrain' | 'hybrid' | 'custom';
  enabled: boolean;
  opacity: number;
  url?: string;
  zIndex?: number;
}