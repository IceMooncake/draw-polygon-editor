import { Tool } from './Tool.js';
import { EditorContext } from '../core/EditorContext.js';
import { Point } from '../types.js';
import { getDistance, adjustAlpha } from '../utils.js';

export class PolygonTool implements Tool {
  name = 'polygon';
  private currentPoints: Point[] = [];
  private mousePos: Point | null = null;
  private ghostPoint: { polyIndex: number; insertIndex: number; point: Point } | null = null;

  constructor(private context: EditorContext) {}

  activate() {
    this.context.canvas.style.cursor = 'crosshair';
    this.currentPoints = [];
  }

  deactivate() {
    this.currentPoints = [];
    this.mousePos = null;
    this.context.requestDraw();
  }

  onMouseDown(_e: MouseEvent) {}

  onMouseMove(e: MouseEvent) {
    this.mousePos = this.getRelativePos(e);
    this.getHoverPoint(this.mousePos);

    // Check close condition
    if (this.currentPoints.length >= 3) {
      const firstPoint = this.currentPoints[0];
      const threshold = this.context.options.pointRadius * 2;
      if (getDistance(this.mousePos, firstPoint) <= threshold) {
        this.context.canvas.style.cursor = 'pointer';
      } else {
        this.context.canvas.style.cursor = 'crosshair';
      }
    } else {
      this.context.canvas.style.cursor = 'crosshair';
    }

    this.context.requestDraw();
  }

  onMouseUp(_e: MouseEvent) {}

  onClick(_e: MouseEvent) {
    if (!this.mousePos) return;

    // Check if clicking on the first point to close polygon
    if (this.currentPoints.length >= 3) {
      const firstPoint = this.currentPoints[0];
      const threshold = this.context.options.pointRadius * 2;
      if (getDistance(this.mousePos, firstPoint) <= threshold) {
        this.completePolygon();
        return;
      }
    }

    // Add point
    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    if (
      !this.currentPoints.length ||
      lastPoint.x !== this.mousePos.x ||
      lastPoint.y !== this.mousePos.y
    ) {
      this.currentPoints.push({ ...this.mousePos });
      this.context.requestDraw();
    }
  }

  onDblClick(_e: MouseEvent) {
    this.completePolygon();
  }

  private completePolygon() {
    if (this.currentPoints.length >= 3) {
      this.context.history.pushState(); // Save state before adding

      const index = this.context.scene.getPolygons().length;
      const strokeColor = this.getColor(this.context.options.strokeColor, index);
      const fillColor = this.getColor(this.context.options.fillColor, index, strokeColor);

      this.context.scene.addPolygon({
        points: [...this.currentPoints],
        fillColor,
        strokeColor,
      });
      this.currentPoints = [];
      this.mousePos = null;
      this.context.requestDraw();
      this.context.notifyPolygonComplete();
    }
  }

  // Capture undo to remove last added point
  undo(): boolean {
    if (this.currentPoints.length > 0) {
      this.currentPoints.pop();
      this.context.requestDraw();
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw current polygon
    if (this.currentPoints.length > 0) {
      const tempIndex = this.context.scene.getPolygons().length;
      const strokeColor = this.getColor(this.context.options.strokeColor, tempIndex);
      const fillColor = this.getColor(this.context.options.fillColor, tempIndex, strokeColor);

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;

      ctx.beginPath();
      ctx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);
      for (let i = 1; i < this.currentPoints.length; i++) {
        ctx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
      }

      // Rubber band to mouse
      if (this.mousePos) {
        ctx.lineTo(this.mousePos.x, this.mousePos.y);
      }

      ctx.stroke();

      // Draw vertices
      ctx.fillStyle = this.context.options.pointColor;
      ctx.strokeStyle = '#ffffff';
      this.currentPoints.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.context.options.pointRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Preview line for first point
      if (this.currentPoints.length > 1 && this.mousePos) {
        ctx.beginPath();
        const first = this.currentPoints[0];
        ctx.moveTo(first.x, first.y);
        ctx.lineTo(this.mousePos.x, this.mousePos.y);
        ctx.strokeStyle = '#888';
        ctx.setLineDash(this.context.options.lineDash);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private getRelativePos(e: MouseEvent): Point {
    const rect = this.context.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private getHoverPoint(pos: Point): boolean {
    // Simplified check just for cursor update in draw mode
    // Real checking is done in onClick
    if (this.currentPoints.length >= 3) {
      const firstPoint = this.currentPoints[0];
      const threshold = this.context.options.pointRadius * 2;
      return getDistance(pos, firstPoint) <= threshold;
    }
    return false;
  }

  private getColor(
    color: string | string[] | undefined,
    index: number,
    fallbackColor?: string,
  ): string {
    if (color === undefined || color === '') {
      if (fallbackColor) {
        return adjustAlpha(fallbackColor, 0.2);
      }
      return 'rgba(0, 0, 0, 0.2)';
    }
    if (Array.isArray(color)) {
      return color[index % color.length];
    }
    return color;
  }
}
