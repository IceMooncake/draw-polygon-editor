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
     * fill color of the polygon
     * @default "rgba(0, 0, 0, 0.2)"
     */
    fillColor?: string;
    
    /** 
     * line color
     * @default "#ff0000"
     */
    strokeColor?: string;
    
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
 * @param points completed polygon points
 */
export type PolygonCallback = (points: Point[]) => void;
