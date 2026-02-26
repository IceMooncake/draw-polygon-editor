import { Point, EditorOptions, PolygonCallback } from './types.js';

export class PolygonEditor {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // state
    private polygons: { points: Point[], fillColor: string, strokeColor: string }[] = [];
    private currentPoints: Point[] = [];
    private isActive: boolean = true;
    private mousePos: Point | null = null;
    private draggingPoint: { polyIndex: number, pointIndex: number } | null = null;
    private isDraggingOperation: boolean = false;
    private hasSavedStateForDrag: boolean = false;
    private ghostPoint: { polyIndex: number, insertIndex: number, point: Point } | null = null;
    
    // history
    private history: { polygons: { points: Point[], fillColor: string, strokeColor: string }[], currentPoints: Point[] }[] = [];

    // lifecycle
    private resizeObserver: ResizeObserver | null = null;
    private handlers: { [key: string]: (e: any) => void } = {};
    private rafId: number | null = null;

    // options
    private options: Required<EditorOptions>;
    private onComplete: PolygonCallback | null = null;

    /**
     * constructor
     * @param element target DOM
     * @param options options
     */
    constructor(element: HTMLElement, options: EditorOptions = {}) {
        this.container = element;
        this.options = {
            fillColor: options.fillColor || '',
            strokeColor: options.strokeColor ?? "#ff0000",
            pointRadius: options.pointRadius ?? 4,
            pointColor: options.pointColor ?? "#ffffff",
            lineDash: options.lineDash ?? [5, 5],
            maxHistorySize: options.maxHistorySize ?? 20
        };

        // init canvas
        this.canvas = document.createElement('canvas');
        const context = this.canvas.getContext('2d');
        if (!context) throw new Error("canvas context not supported");
        this.ctx = context;

        this.initDOM();
        this.bindEvents();
        this.startLoop();
    }

    /**
     * callback when polygon is completed (double-click)
     * @param callback callback function
     */
    public setOnComplete(callback: PolygonCallback) {
        this.onComplete = callback;
    }

    /**
     * enable/show overlay (start/continue drawing)
     */
    public enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.canvas.style.display = 'block';
        this.startLoop();
    }

    /**
     * disable/hide overlay (pause drawing)
     */
    public disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.canvas.style.display = 'none';
        this.stopLoop();
    }

    /**
     * reset canvas
     */
    public reset() {
        this.polygons = [];
        this.currentPoints = [];
        this.mousePos = null;
    }

    /**
     * destroy instance, clean up DOM and events
     */
    public destroy() {
        this.stopLoop();
        this.unbindEvents();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }

    /**
     * get all polygons (2D array)
     */
    public getPolygons(): Point[][] {
        return this.polygons.map(p => [...p.points]);
    }

    private getColor(color: string | string[] | undefined, index: number, fallbackColor?: string): string {
        if (color === undefined || color === '') {
             if (fallbackColor) {
                 return this.adjustAlpha(fallbackColor, 0.2);
             }
             return "rgba(0, 0, 0, 0.2)";
        }
        if (Array.isArray(color)) {
            return color[index % color.length];
        }
        return color;
    }

    private adjustAlpha(color: string, alpha: number): string {
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

    // --- internal implementation ---

    private initDOM() {
        // ensure container position is not static
        const style = window.getComputedStyle(this.container);
        if (style.position === 'static') {
            this.container.style.position = 'relative';
        }

        // set Canvas style
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.cursor = 'crosshair';

        this.container.appendChild(this.canvas);

        // observe container size changes
        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(this.container);
        this.resizeCanvas();
    }

    private resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        // set logical resolution
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // scale context so drawing operations are based on CSS pixels
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    private bindEvents() {
        this.handlers.click = (e: MouseEvent) => this.onClick(e);
        this.handlers.dblclick = (e: MouseEvent) => this.onDblClick(e);
        this.handlers.mousemove = (e: MouseEvent) => this.onMouseMove(e);
        this.handlers.mousedown = (e: MouseEvent) => this.onMouseDown(e);
        this.handlers.mouseup = (e: MouseEvent) => this.onMouseUp();
        this.handlers.contextmenu = (e: MouseEvent) => {
            e.preventDefault();
            this.undo();
        };
        this.handlers.keydown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
        };

        this.canvas.addEventListener('click', this.handlers.click);
        this.canvas.addEventListener('dblclick', this.handlers.dblclick);
        this.canvas.addEventListener('mousemove', this.handlers.mousemove);
        this.canvas.addEventListener('mousedown', this.handlers.mousedown);
        this.canvas.addEventListener('mouseup', this.handlers.mouseup);
        this.canvas.addEventListener('contextmenu', this.handlers.contextmenu);
        window.addEventListener('keydown', this.handlers.keydown);
    }

    private unbindEvents() {
        if (this.handlers.click) this.canvas.removeEventListener('click', this.handlers.click);
        if (this.handlers.dblclick) this.canvas.removeEventListener('dblclick', this.handlers.dblclick);
        if (this.handlers.mousemove) this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
        if (this.handlers.mousedown) this.canvas.removeEventListener('mousedown', this.handlers.mousedown);
        if (this.handlers.mouseup) this.canvas.removeEventListener('mouseup', this.handlers.mouseup);
        if (this.handlers.contextmenu) this.canvas.removeEventListener('contextmenu', this.handlers.contextmenu);
        if (this.handlers.keydown) window.removeEventListener('keydown', this.handlers.keydown);
    }

    private getRelativePos(e: MouseEvent): Point {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    private getDistance(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    private getClosestPointOnSegment(p: Point, p1: Point, p2: Point): Point {
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

    private getHoverPoint(pos: Point): { polyIndex: number, pointIndex: number } | null {
        // defined threshold for grabbing a point
        const threshold = this.options.pointRadius * 2;
        
        // Search in current points
        for (let i = 0; i < this.currentPoints.length; i++) {
            if (this.getDistance(pos, this.currentPoints[i]) <= threshold) {
                return { polyIndex: -1, pointIndex: i };
            }
        }

        // Search in completed polygons
        for (let i = 0; i < this.polygons.length; i++) {
            const poly = this.polygons[i].points;
            for (let j = 0; j < poly.length; j++) {
                if (this.getDistance(pos, poly[j]) <= threshold) {
                    return { polyIndex: i, pointIndex: j };
                }
            }
        }
        return null;
    }

    private onClick(e: MouseEvent) {
        if (!this.isActive) return;
        
        // Handle insertion if ghost point exists and ctrl key is pressed
        if ((e.ctrlKey || e.metaKey) && this.ghostPoint) {
            this.saveState();
            const { polyIndex, insertIndex, point } = this.ghostPoint;
            this.polygons[polyIndex].points.splice(insertIndex, 0, point);
            this.ghostPoint = null;
            return;
        }

        // If a drag operation happened, don't add a point
        if (this.isDraggingOperation) {
            this.isDraggingOperation = false;
            return;
        }

        const p = this.getRelativePos(e);
        // Avoid duplicates
        const lastPoint = this.currentPoints[this.currentPoints.length - 1];
        if(!this.currentPoints.length || (!(lastPoint.x === p.x && lastPoint.y === p.y))) {
             this.saveState();
             this.currentPoints.push(p);
        }
    }

    private onDblClick(e: MouseEvent) {
        if (!this.isActive) return;

        if (this.currentPoints.length >= 3) {
            this.saveState();
            const index = this.polygons.length;
            const strokeColor = this.getColor(this.options.strokeColor, index);
            const fillColor = this.getColor(this.options.fillColor, index, strokeColor);
            
            this.polygons.push({
                points: [...this.currentPoints],
                fillColor: fillColor,
                strokeColor: strokeColor
            });
            this.currentPoints = [];
            this.mousePos = null;
            if (this.onComplete) {
                this.onComplete(this.getPolygons());
            }
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isActive) return;
        this.mousePos = this.getRelativePos(e);
        const isCtrl = e.ctrlKey || e.metaKey;

        if (this.draggingPoint) {
            this.isDraggingOperation = true;
            if (!this.hasSavedStateForDrag) {
                this.saveState();
                this.hasSavedStateForDrag = true;
            }
            const { polyIndex, pointIndex } = this.draggingPoint;
            
            // Check if draggingPoint refers to currentPoints (polyIndex === -1)
            // or existing polygons
            if (polyIndex === -1) {
                 if (this.currentPoints[pointIndex]) {
                     this.currentPoints[pointIndex] = { ...this.mousePos };
                 }
            } else if (this.polygons[polyIndex]) {
                 if (this.polygons[polyIndex].points[pointIndex]) {
                     this.polygons[polyIndex].points[pointIndex] = { ...this.mousePos };
                 }
            }
        } else {
            const hover = this.getHoverPoint(this.mousePos);
            this.canvas.style.cursor = hover ? 'move' : 'crosshair';

            // Calculate ghost point for insertion
            this.ghostPoint = null;
            if (isCtrl && !hover) {
                const threshold = this.options.pointRadius * 2;
                
                // Only check completed polygons
                for (let i = 0; i < this.polygons.length; i++) {
                    const points = this.polygons[i].points;
                    for (let j = 0; j < points.length; j++) {
                        const p1 = points[j];
                        const p2 = points[(j + 1) % points.length]; // wrapping
                        
                        const closest = this.getClosestPointOnSegment(this.mousePos, p1, p2);
                        const dist = this.getDistance(this.mousePos, closest);
                        
                        if (dist <= threshold) {
                            this.ghostPoint = {
                                polyIndex: i,
                                insertIndex: j + 1,
                                point: closest
                            };
                            this.canvas.style.cursor = 'copy'; // indicating add
                            break;
                        }
                    }
                    if (this.ghostPoint) break;
                }
            }
        }
    }

    private onMouseDown(e: MouseEvent) {
        if (!this.isActive) return;
        const p = this.getRelativePos(e);
        const hover = this.getHoverPoint(p);
        if (hover) {
            this.draggingPoint = hover;
            this.isDraggingOperation = false; 
            this.hasSavedStateForDrag = false;
        }
    }

    private onMouseUp() {
        this.draggingPoint = null;
    }

    private saveState() {
        // limit history size
        if (this.history.length >= this.options.maxHistorySize) {
            this.history.shift();
        }

        const snapshot = {
            polygons: this.polygons.map(p => ({
                points: p.points.map(pt => ({ ...pt })),
                fillColor: p.fillColor,
                strokeColor: p.strokeColor
            })),
            currentPoints: this.currentPoints.map(pt => ({ ...pt }))
        };

        this.history.push(snapshot);
    }

    private undo() {
        if (this.history.length > 0) {
            const prevState = this.history.pop()!;
            // deep copy again to avoid reference issues if we undo then redo (or modify)
            this.polygons = prevState.polygons.map(p => ({
                points: p.points.map(pt => ({ ...pt })),
                fillColor: p.fillColor,
                strokeColor: p.strokeColor
            }));
            this.currentPoints = prevState.currentPoints.map(pt => ({ ...pt }));
            
            // clear states
            this.mousePos = null;
            this.ghostPoint = null;
            this.draggingPoint = null;
        }
    }

    private startLoop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        const loop = () => {
            this.draw();
            if (this.isActive) {
                this.rafId = requestAnimationFrame(loop);
            }
        };
        this.rafId = requestAnimationFrame(loop);
    }

    private stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private draw() {
        if (!this.ctx) return;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);

        // Draw completed polygons
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);

        for (const polyObj of this.polygons) {
            const poly = polyObj.points;
            if (poly.length < 1) continue;
            
            this.ctx.fillStyle = polyObj.fillColor;
            this.ctx.strokeStyle = polyObj.strokeColor;

            this.ctx.beginPath();
            this.ctx.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) {
                this.ctx.lineTo(poly[i].x, poly[i].y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Draw current polygon (being drawn)
        if (this.currentPoints.length > 0) {
            const tempIndex = this.polygons.length;
            const strokeColor = this.getColor(this.options.strokeColor, tempIndex);
            const fillColor = this.getColor(this.options.fillColor, tempIndex, strokeColor);

            this.ctx.fillStyle = fillColor;
            this.ctx.strokeStyle = strokeColor;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);
            for (let i = 1; i < this.currentPoints.length; i++) {
                this.ctx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
            }
            
            // Rubber band to mouse
            if (this.mousePos && this.isActive) {
                this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            }

            // Stroke current path (open)
            this.ctx.stroke();
        }

        // Draw vertices
        this.ctx.fillStyle = this.options.pointColor;
        this.ctx.strokeStyle = "#ffffff";
        
        const drawPoint = (p: Point) => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.options.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        };

        this.polygons.forEach(poly => poly.points.forEach(drawPoint));
        this.currentPoints.forEach(drawPoint);

        // Draw ghost point
        if (this.ghostPoint) {
            this.ctx.fillStyle = this.adjustAlpha(this.options.pointColor, 0.5);
            this.ctx.setLineDash([2, 2]);
            this.ctx.beginPath();
            this.ctx.arc(this.ghostPoint.point.x, this.ghostPoint.point.y, this.options.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Preview line for first point (if starting new polygon)
        if (this.currentPoints.length > 1 && this.mousePos && this.isActive) {
            this.ctx.beginPath();
            const first = this.currentPoints[0];
            this.ctx.moveTo(first.x, first.y);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            this.ctx.strokeStyle = '#888';
            this.ctx.setLineDash(this.options.lineDash);
            this.ctx.stroke();
        }
    }
}
