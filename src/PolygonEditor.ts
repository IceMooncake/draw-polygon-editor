import { Point, EditorOptions, PolygonCallback } from './types.js';

export class PolygonEditor {
    private container: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // state
    private points: Point[] = [];
    private isClosed: boolean = false;
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
        this.points = [];
        this.isClosed = false;
        this.mousePos = null;
        // trigger redraw
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
     * get current polygon points
     */
    public getPoints(): Point[] {
        return [...this.points];
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
            this.undo();
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
        if (!this.isActive || this.isClosed) return;
        
        const p = this.getRelativePos(e);
        this.addPoint(p);
    }

    private onDblClick(e: MouseEvent) {
        if (!this.isActive || this.isClosed) return;

        if (this.points.length > 0) {
            this.points.pop();
        }

        if (this.points.length >= 3) {
            this.isClosed = true;
            this.mousePos = null;
            if (this.onComplete) {
                this.onComplete(this.getPoints());
            }
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.isActive || this.isClosed) return;
        this.mousePos = this.getRelativePos(e);
    }

    private addPoint(p: Point) {
        this.points.push(p);
    }

    private undo() {
        if (this.isClosed) {
            this.isClosed = false;
        } else {
            this.points.pop();
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

        if (this.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }

            if (this.isClosed) {
                this.ctx.closePath();
                this.ctx.fillStyle = this.options.fillColor;
                this.ctx.fill();
            } else if (this.mousePos && this.isActive) {
                this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            }

            this.ctx.strokeStyle = this.options.strokeColor;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([]);
            if (!this.isClosed && this.mousePos) {
                 this.ctx.stroke();
                 
                 if (this.mousePos) {
                     this.ctx.beginPath();
                     const last = this.points[this.points.length - 1];
                     this.ctx.moveTo(last.x, last.y);
                     this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
                     this.ctx.strokeStyle = '#888';
                     this.ctx.setLineDash(this.options.lineDash);
                     this.ctx.stroke();
                 }
            } else {
                this.ctx.stroke();
            }
        }

        this.ctx.setLineDash([]);
        this.ctx.fillStyle = this.options.pointColor;
        this.ctx.strokeStyle = this.options.strokeColor;
        
        const drawPoint = (p: Point) => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.options.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        };

        this.points.forEach(drawPoint);
        
    }
}
