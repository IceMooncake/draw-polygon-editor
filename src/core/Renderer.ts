import { Tool } from '../tools/Tool.js';
import { EditorContext } from './EditorContext.js';

export class Renderer {
    constructor(private context: EditorContext) {}

    draw(activeTool: Tool | null) {
        const { canvas, scene } = this.context;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.clearRect(0, 0, width, height);

        // Draw completed polygons (Fill + Stroke)
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        for (const polyObj of scene.getPolygons()) {
            const poly = polyObj.points;
            if (poly.length < 1) continue;
            
            ctx.fillStyle = polyObj.fillColor;
            ctx.strokeStyle = polyObj.strokeColor;

            ctx.beginPath();
            ctx.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) {
                ctx.lineTo(poly[i].x, poly[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Draw active tool overlay
        if (activeTool) {
            activeTool.draw(ctx);
        }
    }
}
