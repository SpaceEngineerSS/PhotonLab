/**
 * InteractionLayer Component
 * 
 * SVG overlay for CAD-style shape preview during drawing.
 * Shows real-time preview of rectangles, circles, ellipses, and lines.
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useMemo } from 'react';
import type { DrawShape } from '../hooks/useDrawTool';
import { MATERIALS } from './Toolbar';
import './InteractionLayer.css';

interface InteractionLayerProps {
    width: number;
    height: number;
    previewShape: DrawShape | null;
}

export function InteractionLayer({ width, height, previewShape }: InteractionLayerProps) {
    const shapeElement = useMemo(() => {
        if (!previewShape) return null;

        const { type, start, end, materialId } = previewShape;
        const material = MATERIALS.find(m => m.id === materialId);
        const color = material?.color || '#4ecdc4';

        // Convert grid coordinates (origin bottom-left) back to SVG coordinates (origin top-left)
        const toSvgY = (gridY: number) => height - 1 - gridY;
        const svgStart = { x: start.x, y: toSvgY(start.y) };
        const svgEnd = { x: end.x, y: toSvgY(end.y) };

        switch (type) {
            case 'rect': {
                const x = Math.min(svgStart.x, svgEnd.x);
                const y = Math.min(svgStart.y, svgEnd.y);
                const w = Math.abs(svgEnd.x - svgStart.x);
                const h = Math.abs(svgEnd.y - svgStart.y);
                return (
                    <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={color}
                        fillOpacity={0.3}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    />
                );
            }
            case 'circle': {
                const cx = svgStart.x;
                const cy = svgStart.y;
                const dx = svgEnd.x - svgStart.x;
                const dy = svgEnd.y - svgStart.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                return (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={color}
                        fillOpacity={0.3}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    />
                );
            }
            case 'ellipse': {
                const cx = (svgStart.x + svgEnd.x) / 2;
                const cy = (svgStart.y + svgEnd.y) / 2;
                const rx = Math.abs(svgEnd.x - svgStart.x) / 2;
                const ry = Math.abs(svgEnd.y - svgStart.y) / 2;
                return (
                    <ellipse
                        cx={cx}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        fill={color}
                        fillOpacity={0.3}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    />
                );
            }
            case 'line': {
                return (
                    <line
                        x1={svgStart.x}
                        y1={svgStart.y}
                        x2={svgEnd.x}
                        y2={svgEnd.y}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    />
                );
            }
            default:
                return null;
        }
    }, [previewShape, height]);

    return (
        <svg
            className="interaction-layer"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
        >
            {shapeElement}
        </svg>
    );
}
