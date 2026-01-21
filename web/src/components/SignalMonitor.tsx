/**
 * SignalMonitor Component
 * 
 * Real-time oscilloscope-style display for field probe data.
 * Uses raw Canvas2D for 60fps rendering without charting library overhead.
 */

import { useRef, useEffect, useCallback } from 'react';
import './SignalMonitor.css';

interface SignalMonitorProps {
    /** Probe X coordinate */
    probeX: number;
    /** Probe Y coordinate */
    probeY: number;
    /** Current field value at probe */
    value: number;
    /** Whether probe is active */
    isActive: boolean;
    /** Data buffer (circular) */
    dataBuffer: number[];
    /** Callback when closing the monitor */
    onClose: () => void;
}

// Visual constants
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 120;
const PADDING = 20;
const GRAPH_WIDTH = CANVAS_WIDTH - PADDING * 2;
const GRAPH_HEIGHT = CANVAS_HEIGHT - PADDING * 2;

export function SignalMonitor({
    probeX,
    probeY,
    value,
    isActive,
    dataBuffer,
    onClose,
}: SignalMonitorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the signal graph
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear with dark background
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw grid lines
        ctx.strokeStyle = '#252530';
        ctx.lineWidth = 1;

        // Horizontal grid (5 lines)
        for (let i = 0; i <= 4; i++) {
            const y = PADDING + (GRAPH_HEIGHT / 4) * i;
            ctx.beginPath();
            ctx.moveTo(PADDING, y);
            ctx.lineTo(PADDING + GRAPH_WIDTH, y);
            ctx.stroke();
        }

        // Vertical grid (10 lines)
        for (let i = 0; i <= 10; i++) {
            const x = PADDING + (GRAPH_WIDTH / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, PADDING);
            ctx.lineTo(x, PADDING + GRAPH_HEIGHT);
            ctx.stroke();
        }

        // Zero line
        ctx.strokeStyle = '#444455';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING, PADDING + GRAPH_HEIGHT / 2);
        ctx.lineTo(PADDING + GRAPH_WIDTH, PADDING + GRAPH_HEIGHT / 2);
        ctx.stroke();

        // Draw signal
        if (dataBuffer.length > 1) {
            // Find min/max for auto-scaling
            let min = Infinity;
            let max = -Infinity;
            for (const v of dataBuffer) {
                if (v < min) min = v;
                if (v > max) max = v;
            }

            // Symmetric scale around zero
            const absMax = Math.max(Math.abs(min), Math.abs(max), 0.1);
            const scale = GRAPH_HEIGHT / 2 / absMax;

            // Create gradient for signal line
            const gradient = ctx.createLinearGradient(0, PADDING, 0, PADDING + GRAPH_HEIGHT);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(0.5, '#00ff88');
            gradient.addColorStop(1, '#ff00aa');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.beginPath();
            const step = GRAPH_WIDTH / (dataBuffer.length - 1);

            for (let i = 0; i < dataBuffer.length; i++) {
                const x = PADDING + i * step;
                const y = PADDING + GRAPH_HEIGHT / 2 - dataBuffer[i] * scale;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Draw current value marker
            const lastX = PADDING + GRAPH_WIDTH;
            const lastY = PADDING + GRAPH_HEIGHT / 2 - dataBuffer[dataBuffer.length - 1] * scale;

            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw scale labels
        ctx.fillStyle = '#666677';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';

        // Find current scale
        let absMax = 0.1;
        for (const v of dataBuffer) {
            absMax = Math.max(absMax, Math.abs(v));
        }

        ctx.fillText(`+${absMax.toFixed(2)}`, PADDING - 4, PADDING + 6);
        ctx.fillText('0', PADDING - 4, PADDING + GRAPH_HEIGHT / 2 + 3);
        ctx.fillText(`-${absMax.toFixed(2)}`, PADDING - 4, PADDING + GRAPH_HEIGHT);

    }, [dataBuffer]);

    // Redraw on data change
    useEffect(() => {
        draw();
    }, [draw, dataBuffer, value]);

    if (!isActive) {
        return null;
    }

    return (
        <div className="signal-monitor">
            <div className="monitor-header">
                <span className="monitor-title">📊 Signal Monitor</span>
                <button className="monitor-close" onClick={onClose}>×</button>
            </div>

            <div className="monitor-info">
                <span className="probe-pos">Probe: ({probeX}, {probeY})</span>
                <span className="current-value">Ez: {value.toExponential(2)}</span>
            </div>

            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="monitor-canvas"
            />
        </div>
    );
}
