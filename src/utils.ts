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

const IS_MAC = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Check if the keyboard event matches any of the configured key combinations.
 * @param e KeyboardEvent
 * @param keyConfig string or string array.
 */
export function checkKey(e: KeyboardEvent, keyConfig: string | string[]): boolean {
    const configs = Array.isArray(keyConfig) ? keyConfig : [keyConfig];
    const key = e.key.toLowerCase();
    
    return configs.some(config => {
        const parts = config.toLowerCase().split('+').map(p => p.trim());
        const mainKey = parts[parts.length - 1]; 
        const modifiers = parts.slice(0, parts.length - 1);

        const isCtrl = e.ctrlKey;
        const isMeta = e.metaKey;
        const isAlt = e.altKey;
        const isShift = e.shiftKey;

        const reqCtrl = modifiers.includes('ctrl') || modifiers.includes('control');
        const reqMeta = modifiers.includes('meta') || modifiers.includes('cmd') || modifiers.includes('command');
        const reqAlt = modifiers.includes('alt') || modifiers.includes('option');
        const reqShift = modifiers.includes('shift');
        const reqMod = modifiers.includes('mod'); 

        // Strict modifier checks
        // Ctrl
        if (reqMod) {
            if (IS_MAC && !isMeta) return false;
            if (!IS_MAC && !isCtrl) return false;
        } else {
            if (reqCtrl && !isCtrl) return false;
            if (!reqCtrl && isCtrl && mainKey !== 'control') return false; 
            if (reqMeta && !isMeta) return false;
            if (!reqMeta && isMeta && mainKey !== 'meta') return false;
        }
        
        if (reqAlt && !isAlt) return false;
        if (!reqAlt && isAlt && mainKey !== 'alt') return false;

        if (reqShift && !isShift) return false;

        if (!reqShift && isShift && mainKey !== 'shift') return false;

        return key === mainKey;
    });
}

/**
 * Check modifiers only (useful for mouse events or state checks)
 * @param e MouseEvent | KeyboardEvent
 * @param keyConfig string or string array (e.g. ['Control', 'Meta'])
 */
export function checkModifier(e: MouseEvent | KeyboardEvent, keyConfig: string | string[]): boolean {
    const configs = Array.isArray(keyConfig) ? keyConfig : [keyConfig];
    
    return configs.some(config => {
         const k = config.toLowerCase();
         if (k === 'ctrl' || k === 'control') return e.ctrlKey;
         if (k === 'meta' || k === 'cmd' || k === 'command') return e.metaKey;
         if (k === 'alt') return e.altKey;
         if (k === 'shift') return e.shiftKey;
         if (k === 'mod') return IS_MAC ? e.metaKey : e.ctrlKey;
         return false;
    });
}

