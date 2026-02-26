/**
 * Point interface
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Drawing options interface
 */
export interface EditorOptions {
    /** 
     * fill color of the polygon. Can be a single color or an array of colors to verify.
     */
    fillColor?: string | string[];
    
    /** 
     * line color. Can be a single color or an array of colors to verify.
     * @default "#ff0000"
     */
    strokeColor?: string | string[];
    
    /** 
     * radius of polygon vertices
     * @default 4
     */
    pointRadius?: number;

    /**
     * color of newly added points
     * @default "#ffffff"
     */
    pointColor?: string;
    
    /**
     * draw rubber band line dash pattern
     * @default [5, 5]
     */
    lineDash?: number[];
}

/**
 * callback when polygon is completed (double-click)
 * @param polygons completed polygons (2D array of points)
 */
export type PolygonCallback = (polygons: Point[][]) => void;
