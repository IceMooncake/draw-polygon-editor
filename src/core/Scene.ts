import { Point } from '../types.js';

export interface Polygon {
  points: Point[];
  fillColor: string;
  strokeColor: string;
}

export class Scene {
  private polygons: Polygon[] = [];

  getPolygons(): Polygon[] {
    return this.polygons;
  }

  setPolygons(polygons: Polygon[]) {
    this.polygons = polygons;
  }

  addPolygon(polygon: Polygon) {
    this.polygons.push(polygon);
  }

  clear() {
    this.polygons = [];
  }
}
