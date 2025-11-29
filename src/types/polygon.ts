export interface PolygonObject {
  id: string;
  name: string;
  type: string;
  area: number;
  population?: number;
  status: string;
  coordinates: [number, number][];
  color: string;
  layer: string;
  visible: boolean;
  attributes: Record<string, any>;
}
