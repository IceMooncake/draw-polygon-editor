import { Point } from './types.js';

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Get the closest point on a line segment to a given point
 */
export function getClosestPointOnSegment(p: Point, p1: Point, p2: Point): Point {
    const x = p1.x;
    const y = p1.y;
    const dx = p2.x - x;
    const dy = p2.y - y;
    const dot = dx * dx + dy * dy;
    let t;

    if (dot > 0) {
        t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
    } else {
        t = -1;
    }

    if (t < 0) {
        return p1;
    } else if (t > 1) {
        return p2;
    } else {
        return { x: x + t * dx, y: y + t * dy };
    }
}

/**
 * Adjust alpha channel of a color string
 */
export function adjustAlpha(color: string, alpha: number): string {
    try {
        // Hex
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(color)) {
            let c: any = color.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
        }
        // RGB/RGBA
        if (color.startsWith('rgb')) {
            // simple parsing for rgb/rgba
            const match = color.match(/(\d+(\.\d+)?)/g);
            if (match && match.length >= 3) {
                 return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
            }
        }
        return color; 
    } catch(e) {
        return color;
    }
}
