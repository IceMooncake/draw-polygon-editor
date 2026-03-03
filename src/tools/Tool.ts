export interface Tool {
    name: string;
    activate(): void;
    deactivate(): void;
    onMouseDown(e: MouseEvent): void;
    onMouseMove(e: MouseEvent): void;
    onMouseUp(e: MouseEvent): void;
    onClick(e: MouseEvent): void;
    onDblClick(e: MouseEvent): void;
    draw(ctx: CanvasRenderingContext2D): void;
}
