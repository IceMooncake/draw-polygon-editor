import { Point, EditorOptions, PolygonCallback } from './types.js';

export class PolygonEditor {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // state
    private polygons: Point[][] = [];
    private currentPoints: Point[] = [];
    private isActive: boolean = true;
    private mousePos: Point | null = null;
    
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
            fillColor: options.fillColor ?? "rgba(0, 0, 0, 0.2)",
            strokeColor: options.strokeColor ?? "#ff0000",
            pointRadius: options.pointRadius ?? 4,
            pointColor: options.pointColor ?? "#ffffff",
            lineDash: options.lineDash ?? [5, 5]
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
        return this.polygons.map(p => [...p]);
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
        this.handlers.contextmenu = (e: MouseEvent) => {
            e.preventDefault();
            this.undo(e);
        };
        this.canvas.addEventListener('click', this.handlers.click);
        this.canvas.addEventListener('dblclick', this.handlers.dblclick);
        this.canvas.addEventListener('mousemove', this.handlers.mousemove);
        this.canvas.addEventListener('contextmenu', this.handlers.contextmenu);
    }

    private unbindEvents() {
        if (this.handlers.click) this.canvas.removeEventListener('click', this.handlers.click);
        if (this.handlers.dblclick) this.canvas.removeEventListener('dblclick', this.handlers.dblclick);
        if (this.handlers.mousemove) this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
        if (this.handlers.contextmenu) this.canvas.removeEventListener('contextmenu', this.handlers.contextmenu);
    }

    private getRelativePos(e: MouseEvent): Point {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    private onClick(e: MouseEvent) {
        if (!this.isActive) return;
        const p = this.getRelativePos(e);
        // Avoid duplicates
        if(!this.currentPoints.length || (!(this.currentPoints[this.currentPoints.length - 1].x === p.x && this.currentPoints[this.currentPoints.length - 1].y === p.y))) {
             this.currentPoints.push(p);
        }
    }

    private onDblClick(e: MouseEvent) {
        if (!this.isActive) return;

        if (this.currentPoints.length >= 3) {
            this.polygons.push([...this.currentPoints]);
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
    }

    private undo(e: MouseEvent) {
        if (this.currentPoints.length > 0) {
            this.currentPoints.pop();
        } else if (this.polygons.length > 0) {
             this.currentPoints = this.polygons.pop()!;
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
        this.ctx.fillStyle = this.options.fillColor;
        this.ctx.strokeStyle = this.options.strokeColor;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);

        for (const poly of this.polygons) {
            if (poly.length < 1) continue;
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
        
        const drawPoint = (p: Point) => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.options.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        };

        this.polygons.forEach(poly => poly.forEach(drawPoint));
        this.currentPoints.forEach(drawPoint);
        
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
