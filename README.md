# Polygon Editor

![Polygon editor demo](./demo/demo.png)

A lightweight, interactive/typescript library for drawing and editing polygons on HTML Canvas.

[中文文档](#polygon-editor-中文文档)

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Usage in React (TypeScript)](#usage-in-react-typescript)
- [Usage in Vue (TypeScript)](#usage-in-vue-typescript)
- [Configuration](#configuration)
- [API Methods](#api-methods)
- [Events](#events)

## Features

*   **Interactive Drawing**: Click to add points, double-click to close the polygon.
*   **Editable Vertices**: Drag any point (vertex) to adjust the shape of completed polygons or the polygon currently being drawn.
*   **Smart Styling**:
    *   **Multiple Colors**: Pass an array of colors for `fillColor` or `strokeColor` to automatically cycle through them for each new polygon.
    *   **Auto-Transparency**: If `fillColor` is not provided, it automatically generates a 20% opacity version of the `strokeColor` (supports Hex, RGB, RGBA).
*   **Undo Support**: Right-click or Ctrl/Cmd+Z to undo the last operation (add point, move point, etc.).
*   **Edge Insertion**: Ctrl/Cmd+Click on an edge to insert a new vertex between two points.
*   **Responsive**: Automatically adjusts to the container size.
*   **TypeScript Support**: Fully typed options and methods.

## Installation

Install via your preferred modern package manager:

```bash
npm install draw-polygon
# or
pnpm add draw-polygon
# or
yarn add draw-polygon
```

## Usage

1.  **HTML Structure**
    ```html
    <div id="editor-container" style="width: 800px; height: 600px;"></div>
    ```

2.  **Initialization**
    ```typescript
    import { PolygonEditor } from './src/PolygonEditor';

    const container = document.getElementById('editor-container');
    
    const editor = new PolygonEditor(container, {
        strokeColor: ['#FF0000', '#00FF00', '#0000FF'], // Cycle through red, green, blue
        pointRadius: 5
        // fillColor is optional, defaults to transparent strokeColor
    });

    // Handle completion
    editor.setOnComplete((polygons) => {
        console.log('Current Polygons:', polygons);
    });
    ```

## Usage in React (TypeScript)

Example with a functional component using `useRef` and `useEffect`:

```tsx
import React, { useEffect, useRef } from 'react';
import { PolygonEditor } from 'draw-polygon';

export const PolygonCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<PolygonEditor | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const editor = new PolygonEditor(containerRef.current, {
            strokeColor: ['#FF0000', '#00FF00', '#0000FF'],
            pointRadius: 4,
        });

        editor.setOnComplete((polygons) => {
            console.log('Current polygons:', polygons);
        });

        editorRef.current = editor;

        // Cleanup on unmount
        return () => {
            editor.destroy();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: 400 }}
        />
    );
};
```

## Usage in Vue (TypeScript)

Example with Vue 3 `<script setup lang="ts">`:

```vue
<template>
    <div ref="container" style="width: 100%; height: 400px;"></div>
    </template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { PolygonEditor } from 'draw-polygon';

const container = ref<HTMLDivElement | null>(null);
let editor: PolygonEditor | null = null;

onMounted(() => {
    if (!container.value) return;

    editor = new PolygonEditor(container.value, {
        strokeColor: ['#FF0000', '#00FF00', '#0000FF'],
        pointRadius: 4,
    });

    editor.setOnComplete((polygons) => {
        console.log('当前多边形(React/Vue 示例共用):', polygons);
    });
});

onBeforeUnmount(() => {
    if (editor) {
        editor.destroy();
    }
});
</script>
```

## Configuration

The `PolygonEditor` constructor accepts a DOM element and an options object:

```typescript
interface EditorOptions {
    /** 
     * Fill color(s). Can be a specific color string or an array of colors to cycle through.
     * Default: 20% opacity of strokeColor 
     */
    fillColor?: string | string[];

    /** 
     * Stroke color(s). Can be a specific color string or an array of colors.
     * Default: "#ff0000" 
     */
    strokeColor?: string | string[];

    /** Radius of the vertices in pixels. Default: 4 */
    pointRadius?: number;

    /** Color of the vertices. Default: "#ffffff" */
    pointColor?: string;

    /** Line dash pattern [line, gap]. Default: [5, 5] */
    lineDash?: number[];

    /** Maximum number of undo steps. Default: 20 */
    maxHistorySize?: number;
}
```

## API Methods

| Method              | Description                                                                 | Signature / Return                                      |
|---------------------|-----------------------------------------------------------------------------|---------------------------------------------------------|
| `enable()`          | Activate the drawing layer.                                                | `void`                                                 |
| `disable()`         | Deactivate / hide the drawing layer.                                       | `void`                                                 |
| `reset()`           | Clear all polygons and reset state.                                        | `void`                                                 |
| `destroy()`         | Clean up event listeners and DOM elements.                                 | `void`                                                 |
| `getPolygons()`     | Get all completed polygons.                                                | `Point[][]`                                            |
| `setOnComplete(cb)` | Register a callback fired when a polygon is completed (double-click event). | `cb: (polygons: Point[][]) => void`                    |

## Events

*   **Left Click**: Add point.
*   **Double Click**: Finish current polygon.
*   **Right Click / Ctrl/Cmd+Z**: Undo last operation.
*   **Ctrl/Cmd+Click (edge)**: Insert a vertex between two points on an existing polygon.
*   **Drag**: Move vertices.

---

# Polygon Editor (中文文档)

一个轻量级的、基于 TypeScript 的 HTML Canvas 多边形绘制与编辑库。

## 目录
- [功能特性](#功能特性)
- [使用方法](#使用方法)
- [安装](#安装)
- [在-react-中使用](#在-react-中使用)
- [在-vue-中使用](#在-vue-中使用)
- [配置选项](#配置选项)
- [API 方法](#api-方法)
- [交互操作](#交互操作)

## 功能特性

*   **交互式绘制**: 点击添加顶点，双击闭合多边形。
*   **顶点编辑**: 支持拖拽任意顶点来调整形状（无论是已完成的多边形还是正在绘制中的）。
*   **智能样式**:
    *   **多色循环**: `fillColor` 和 `strokeColor` 支持传入颜色数组，绘制新多边形时会自动循环使用。
    *   **自动填充透明度**: 如果未指定 `fillColor`，系统会自动根据 `strokeColor` 生成透明度为 20% 的填充色（支持 Hex, RGB, RGBA 格式）。
*   **撤销功能**: 右键点击或 Ctrl/Cmd+Z 可撤销上一步操作（支持撤销移动点、添加点等）。
*   **边上插点**: 按住 Ctrl/Cmd 并在边上单击，可在两个顶点之间新增一个顶点。
*   **响应式**: 自动适应容器大小变化。
*   **TypeScript 支持**: 提供完整的类型定义。

## 安装

使用现代包管理工具安装：

```bash
npm install draw-polygon
# 或
pnpm add draw-polygon
# 或
yarn add draw-polygon
```

## 使用方法

1.  **HTML 结构**
    ```html
    <div id="editor-container" style="width: 800px; height: 600px;"></div>
    ```

2.  **初始化**
    ```typescript
    import { PolygonEditor } from './src/PolygonEditor';

    const container = document.getElementById('editor-container');
    
    const editor = new PolygonEditor(container, {
        strokeColor: ['#FF0000', '#00FF00', '#0000FF'], // 红、绿、蓝循环
        pointRadius: 5
        // 不传 fillColor，默认使用线条颜色的半透明版
    });

    // 监听绘制完成
    editor.setOnComplete((polygons) => {
        console.log('当前所有多边形:', polygons);
    });
    ```

## 在 React 中使用

在 React 函数组件中通过 `useRef` 和 `useEffect` 使用：

```tsx
import React, { useEffect, useRef } from 'react';
import { PolygonEditor } from 'draw-polygon';

export const PolygonCanvas: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<PolygonEditor | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const editor = new PolygonEditor(containerRef.current, {
            strokeColor: ['#FF0000', '#00FF00', '#0000FF'], // 红、绿、蓝循环
            pointRadius: 4,
        });

        editor.setOnComplete((polygons) => {
            console.log('当前多边形:', polygons);
        });

        editorRef.current = editor;

        // 组件卸载时清理
        return () => {
            editor.destroy();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: 400 }}
        />
    );
};
```

## 在 Vue 中使用

在 Vue 3 中使用 `<script setup lang="ts">`：

```vue
<template>
    <div ref="container" style="width: 100%; height: 400px;"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { PolygonEditor } from 'draw-polygon';

const container = ref<HTMLDivElement | null>(null);
let editor: PolygonEditor | null = null;

onMounted(() => {
    if (!container.value) return;

    editor = new PolygonEditor(container.value, {
        strokeColor: ['#FF0000', '#00FF00', '#0000FF'], // 红、绿、蓝循环
        pointRadius: 4,
    });

    editor.setOnComplete((polygons) => {
        console.log('当前多边形:', polygons);
    });
});

onBeforeUnmount(() => {
    if (editor) {
        editor.destroy();
    }
});
</script>
```

## 配置选项

`PolygonEditor` 构造函数接收一个 DOM 元素和一个配置对象：

```typescript
interface EditorOptions {
    /** 
     * 填充颜色。可以是单个颜色字符串，也可以是颜色数组（循环使用）。
     * 默认值: 自动取 strokeColor 的 20% 透明度版本
     */
    fillColor?: string | string[];

    /** 
     * 线条颜色。可以是单个颜色字符串，也可以是颜色数组。
     * 默认值: "#ff0000" 
     */
    strokeColor?: string | string[];

    /** 顶点半径 (像素)。默认值: 4 */
    pointRadius?: number;

    /** 顶点颜色。默认值: "#ffffff" */
    pointColor?: string;

    /** 虚线样式 [实线长, 间隙长]。默认值: [5, 5] */
    lineDash?: number[];

    /** 最大撤销步数。默认值: 20 */
    maxHistorySize?: number;
}
```

## API 方法

| 方法                    | 说明                                               | 函数签名 / 返回值                                  |
|-------------------------|----------------------------------------------------|---------------------------------------------------|
| `enable()`              | 启用绘制层。                                       | `void`                                            |
| `disable()`             | 禁用 / 隐藏绘制层。                               | `void`                                            |
| `reset()`               | 清空画布并重置所有状态。                         | `void`                                            |
| `destroy()`             | 销毁实例并清理事件监听、DOM 元素。               | `void`                                            |
| `getPolygons()`         | 获取所有已完成多边形。                           | `Point[][]`                                       |
| `setOnComplete(cb)`     | 在多边形闭合（双击）时触发回调。                 | `cb: (polygons: Point[][]) => void`               |

## 交互操作
*   **左键单击**: 添加顶点。
*   **双击**: 完成当前多边形绘制。
*   **右键单击 / Ctrl/Cmd+Z**: 撤销上一步操作。
*   **Ctrl/Cmd+单击（边）**: 在多边形边上插入一个新的顶点。
*   **拖拽**: 移动顶点调整形状。
