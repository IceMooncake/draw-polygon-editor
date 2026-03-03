import { Tool } from './Tool.js';
import { EditorContext } from '../core/EditorContext.js';
import { Point } from '../types.js';
import { getDistance, getClosestPointOnSegment, adjustAlpha } from '../utils.js';

export class EditTool implements Tool {
    name = 'edit';
    private draggingPoint: { polyIndex: number, pointIndex: number } | null = null;
    private ghostPoint: { polyIndex: number, insertIndex: number, point: Point } | null = null;
    private mousePos: Point | null = null;
    private isDragging: boolean = false;
    private hasSavedState: boolean = false;

    constructor(private context: EditorContext) {}

    activate() {
        this.context.canvas.style.cursor = 'default';
        this.context.requestDraw();
    }

    deactivate() {
        this.draggingPoint = null;
        this.ghostPoint = null;
        this.mousePos = null;
        this.context.requestDraw();
    }

    onMouseDown(e: MouseEvent) {
        this.mousePos = this.getRelativePos(e);
        const hover = this.getHoverPoint(this.mousePos);
        if (hover) {
            this.draggingPoint = hover;
            this.isDragging = false;
            this.hasSavedState = false;
            this.context.canvas.style.cursor = 'move';
        }
    }

    onMouseMove(e: MouseEvent) {
        this.mousePos = this.getRelativePos(e);
        const isCtrl = e.ctrlKey || e.metaKey;

        if (this.draggingPoint) {
            this.isDragging = true;
            if (!this.hasSavedState) {
                this.context.history.pushState();
                this.hasSavedState = true;
            }
            const { polyIndex, pointIndex } = this.draggingPoint;
            const polygons = this.context.scene.getPolygons();
            if (polygons[polyIndex] && polygons[polyIndex].points[pointIndex]) {
                polygons[polyIndex].points[pointIndex] = { ...this.mousePos };
                this.context.requestDraw();
            }
        } else {
            const hover = this.getHoverPoint(this.mousePos);
            this.context.canvas.style.cursor = hover ? 'move' : 'default';

            // Calculate ghost point for insertion
            this.ghostPoint = null;
            if (isCtrl && !hover) {
                const threshold = this.context.options.pointRadius * 2;
                const polygons = this.context.scene.getPolygons();
                
                for (let i = 0; i < polygons.length; i++) {
                    const points = polygons[i].points;
                    for (let j = 0; j < points.length; j++) {
                        const p1 = points[j];
                        const p2 = points[(j + 1) % points.length];
                        
                        const closest = getClosestPointOnSegment(this.mousePos, p1, p2);
                        const dist = getDistance(this.mousePos, closest);
                        
                        if (dist <= threshold) {
                            this.ghostPoint = {
                                polyIndex: i,
                                insertIndex: j + 1,
                                point: closest
                            };
                            this.context.canvas.style.cursor = 'copy';
                            break;
                        }
                    }
                    if (this.ghostPoint) break;
                }
                this.context.requestDraw();
            } else if (this.ghostPoint) {
                // clear ghost point if not ctrl or hovering
                this.ghostPoint = null; 
                this.context.requestDraw();
            }
        }
    }

    onMouseUp(e: MouseEvent) {
        this.draggingPoint = null;
        this.isDragging = false;
    }

    onClick(e: MouseEvent) {
        if (this.isDragging) return;
        
        // Handle insertion
        if ((e.ctrlKey || e.metaKey) && this.ghostPoint) {
            this.context.history.pushState();
            const { polyIndex, insertIndex, point } = this.ghostPoint;
            const polygons = this.context.scene.getPolygons();
            if (polygons[polyIndex]) {
                polygons[polyIndex].points.splice(insertIndex, 0, point);
                this.ghostPoint = null;
                this.context.requestDraw();
            }
        }
    }

    onDblClick(e: MouseEvent) {}

    draw(ctx: CanvasRenderingContext2D) {
        // EditTool just draws UI overlays (vertices, ghost points)
        // The main polygons are drawn by Renderer from Scene.
        // Wait, Renderer draws polygons. Tool draws EXTRA stuff.
        
        // We should draw vertices of ALL polygons here because usually they are not drawn in "View Mode", 
        // but in "Edit Mode" they are visible.
        // Actually, the original code always drew vertices.
        // Let's assume Renderer draws the polygons (filled/stroked).
        // And Tool draws the handles (vertices).

        const polygons = this.context.scene.getPolygons();
        ctx.fillStyle = this.context.options.pointColor;
        ctx.strokeStyle = "#ffffff";
        
        polygons.forEach(poly => {
            poly.points.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.context.options.pointRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        });

        // Draw ghost point
        if (this.ghostPoint) {
            ctx.fillStyle = adjustAlpha(this.context.options.pointColor, 0.5);
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(this.ghostPoint.point.x, this.ghostPoint.point.y, this.context.options.pointRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    private getRelativePos(e: MouseEvent): Point {
        const rect = this.context.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    private getHoverPoint(pos: Point): { polyIndex: number, pointIndex: number } | null {
        const threshold = this.context.options.pointRadius * 2;
        const polygons = this.context.scene.getPolygons();

        for (let i = 0; i < polygons.length; i++) {
            const poly = polygons[i].points;
            for (let j = 0; j < poly.length; j++) {
                if (getDistance(pos, poly[j]) <= threshold) {
                    return { polyIndex: i, pointIndex: j };
                }
            }
        }
        return null;
    }
}
