/**
 * useDrawTool Hook
 * 
 * Unified mouse/touch drawing handler for CAD-style interactions.
 * Supports brush, line, rectangle, circle, and ellipse tools.
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useState, useCallback, useRef } from 'react';

export interface Point {
    x: number;
    y: number;
}

export interface DrawShape {
    type: 'brush' | 'line' | 'rect' | 'circle' | 'ellipse';
    start: Point;
    end: Point;
    materialId: number;
    brushSize: number;
}

export interface DrawToolOptions {
    tool: string;
    materialId: number;
    brushSize: number;
    canvasWidth: number;
    canvasHeight: number;
    onDrawComplete: (shape: DrawShape) => void;
    onBrushStroke: (from: Point, to: Point) => void;
}

export interface DrawState {
    isDrawing: boolean;
    startPoint: Point | null;
    currentPoint: Point | null;
    previewShape: DrawShape | null;
}

export function useDrawTool(options: DrawToolOptions) {
    const {
        tool,
        materialId,
        brushSize,
        canvasWidth,
        canvasHeight,
        onDrawComplete,
        onBrushStroke,
    } = options;

    const [state, setState] = useState<DrawState>({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        previewShape: null,
    });

    const lastPointRef = useRef<Point | null>(null);

    /**
     * Map DOM pointer coordinates to FDTD Grid coordinates.
     * Handles:
     * 1. Viewport offset (getBoundingClientRect)
     * 2. Scaling to internal grid resolution
     * 3. Y-axis inversion (DOM: top-left origin -> Grid: bottom-left origin)
     */
    const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLElement>): Point => {
        const rect = e.currentTarget.getBoundingClientRect();

        // 1. Calculate relative position within element (0.0 to 1.0)
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;

        // 2. Scale to internal grid resolution
        const rawX = Math.floor(relX * canvasWidth);
        const rawY = Math.floor(relY * canvasHeight);

        // 3. Clamp to valid grid bounds
        const x = Math.max(0, Math.min(rawX, canvasWidth - 1));

        // 4. Y-AXIS INVERSION: DOM(0) = Top, Grid(0) = Bottom
        // Flip: y = height - 1 - y_calculated
        const flippedY = canvasHeight - 1 - rawY;
        const y = Math.max(0, Math.min(flippedY, canvasHeight - 1));

        return { x, y };
    }, [canvasWidth, canvasHeight]);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const point = getCanvasPoint(e);

        if (tool === 'brush' || tool === 'eraser') {
            lastPointRef.current = point;
            onBrushStroke(point, point);
        }

        setState({
            isDrawing: true,
            startPoint: point,
            currentPoint: point,
            previewShape: null,
        });
    }, [tool, getCanvasPoint, onBrushStroke]);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
        if (!state.isDrawing || !state.startPoint) return;

        const point = getCanvasPoint(e);

        if (tool === 'brush' || tool === 'eraser') {
            if (lastPointRef.current) {
                onBrushStroke(lastPointRef.current, point);
            }
            lastPointRef.current = point;
            setState(prev => ({ ...prev, currentPoint: point }));
            return;
        }

        const shape: DrawShape = {
            type: tool as DrawShape['type'],
            start: state.startPoint,
            end: point,
            materialId,
            brushSize,
        };

        setState(prev => ({
            ...prev,
            currentPoint: point,
            previewShape: shape,
        }));
    }, [state.isDrawing, state.startPoint, tool, materialId, brushSize, getCanvasPoint, onBrushStroke]);

    const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (!state.isDrawing || !state.startPoint) {
            setState({
                isDrawing: false,
                startPoint: null,
                currentPoint: null,
                previewShape: null,
            });
            return;
        }

        const point = getCanvasPoint(e);

        if (tool !== 'brush' && tool !== 'eraser' && tool !== 'select' && tool !== 'source') {
            const shape: DrawShape = {
                type: tool as DrawShape['type'],
                start: state.startPoint,
                end: point,
                materialId,
                brushSize,
            };
            onDrawComplete(shape);
        }

        lastPointRef.current = null;
        setState({
            isDrawing: false,
            startPoint: null,
            currentPoint: null,
            previewShape: null,
        });
    }, [state.isDrawing, state.startPoint, tool, materialId, brushSize, getCanvasPoint, onDrawComplete]);

    const onPointerCancel = useCallback(() => {
        lastPointRef.current = null;
        setState({
            isDrawing: false,
            startPoint: null,
            currentPoint: null,
            previewShape: null,
        });
    }, []);

    return {
        ...state,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
        },
    };
}
