import { Tool } from './Tool.js';
import { EditorContext } from '../core/EditorContext.js';
import { Point } from '../types.js';
import { getDistance, getClosestPointOnSegment, checkModifier, adjustAlpha } from '../utils.js';

export class EditTool implements Tool {
    name = 'edit';
    private draggingPoint: { polyIndex: number, pointIndex: number } | null = null;
    private ghostPoint: { polyIndex: number, insertIndex: number, point: Point } | null = null;
    private mousePos: Point | null = null;
    private isDragging: boolean = false;
    private hasSavedState: boolean = false;

    constructor(private context: EditorContext) {}

    private isAxisAligned(points: Point[]): boolean {
        // Simple heuristic: Must have 4 points
        if (points.length !== 4) return false;
        
        // Each point must share roughly x with one other point and y with one other point
        for (let i = 0; i < 4; i++) {
            const p = points[i];
            const hasMatchX = points.some((other, idx) => idx !== i && Math.abs(other.x - p.x) < 2);
            const hasMatchY = points.some((other, idx) => idx !== i && Math.abs(other.y - p.y) < 2);
            if (!hasMatchX || !hasMatchY) return false;
        }
        return true;
    }

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
        const allowInsert = checkModifier(e, this.context.options.keyMap?.insertPoint || ['Control', 'Meta']);

        if (this.draggingPoint) {
            this.isDragging = true;
            if (!this.hasSavedState) {
                this.context.history.pushState();
                this.hasSavedState = true;
            }
            const { polyIndex, pointIndex } = this.draggingPoint;
            const polygons = this.context.scene.getPolygons();
            if (polygons[polyIndex] && polygons[polyIndex].points[pointIndex]) {
                const polygon = polygons[polyIndex];
                const points = polygon.points;
                
                // Check if it's an axis-aligned rectangle before modification
                // If it is, we try to maintain it
                const isRect = this.isAxisAligned(points);

                if (isRect) {
                    const currentPoint = { ...points[pointIndex] }; // value before update
                    const newX = this.mousePos.x;
                    const newY = this.mousePos.y;

                    // Update dragged point
                    points[pointIndex] = { x: newX, y: newY };

                    // Find Vertical Neighbor (shares X) - Find the one closest in X
                    let vNode: Point | null = null;
                    let minXDiff = Infinity;

                    for (let i = 0; i < points.length; i++) {
                        if (i === pointIndex) continue;
                        const dx = Math.abs(points[i].x - currentPoint.x);
                        if (dx < 2 && dx < minXDiff) {
                            minXDiff = dx;
                            vNode = points[i];
                        }
                    }

                    // Find Horizontal Neighbor (shares Y)
                    const hCandidates: Point[] = [];
                    for (let i = 0; i < points.length; i++) {
                        if (i === pointIndex) continue;
                        if (vNode && points[i] === vNode) continue; 
                        
                        // Must be close in Y
                        if (Math.abs(points[i].y - currentPoint.y) < 2) {
                            hCandidates.push(points[i]);
                        }
                    }

                    let hNode: Point | null = null;
                    if (hCandidates.length === 1) {
                         hNode = hCandidates[0];
                    } else if (hCandidates.length > 1 && vNode) {
                        // Distinguish H and D.
                        hCandidates.sort((a, b) => Math.abs(b.y - vNode!.y) - Math.abs(a.y - vNode!.y));
                        hNode = hCandidates[0];
                    } else if (hCandidates.length > 0) {
                        hNode = hCandidates[0];
                    }

                    if (vNode) vNode.x = newX;
                    if (hNode) hNode.y = newY;
                } else {
                    points[pointIndex] = { ...this.mousePos };
                }
                this.context.requestDraw();
            }
        } else {
            const hover = this.getHoverPoint(this.mousePos);
            this.context.canvas.style.cursor = hover ? 'move' : 'default';

            // Calculate ghost point for insertion
            this.ghostPoint = null;
            if (allowInsert && !hover) {
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
        const allowInsert = checkModifier(e, this.context.options.keyMap?.insertPoint || ['Control', 'Meta']);

        if (allowInsert && this.ghostPoint) {
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
