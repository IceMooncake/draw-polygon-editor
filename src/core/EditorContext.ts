import {  Scene } from './Scene.js';
import { HistoryManager } from './HistoryManager.js';
import { EditorOptions } from '../types.js';

export interface EditorContext {
    scene: Scene;
    history: HistoryManager;
    options: Required<EditorOptions>;
    canvas: HTMLCanvasElement;
    requestDraw(): void;
    notifyPolygonComplete(): void;
}

