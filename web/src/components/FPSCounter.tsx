/**
 * FPSCounter Component
 * 
 * Real-time FPS display with color-coded performance indicator.
 */

import { useState, useEffect, useRef } from 'react';
import './FPSCounter.css';

interface FPSCounterProps {
    /** Current FPS from simulation */
    fps?: number;
    /** Whether to track FPS internally (if not provided externally) */
    autoTrack?: boolean;
}

export function FPSCounter({ fps: externalFps, autoTrack = false }: FPSCounterProps) {
    const [fps, setFps] = useState(0);
    const frameTimesRef = useRef<number[]>([]);
    const lastTimeRef = useRef(performance.now());

    useEffect(() => {
        if (!autoTrack) return;

        let animationId: number;

        const tick = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;
            lastTimeRef.current = now;

            // Store frame time
            frameTimesRef.current.push(delta);

            // Keep only last 30 frames
            if (frameTimesRef.current.length > 30) {
                frameTimesRef.current.shift();
            }

            // Calculate average FPS
            const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
            setFps(Math.round(1000 / avgDelta));

            animationId = requestAnimationFrame(tick);
        };

        animationId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [autoTrack]);

    const displayFps = externalFps ?? fps;

    // Color based on performance
    const getColor = () => {
        if (displayFps >= 55) return 'good';
        if (displayFps >= 30) return 'ok';
        return 'bad';
    };

    return (
        <div className={`fps-counter ${getColor()}`}>
            <span className="fps-value">{displayFps}</span>
            <span className="fps-label">FPS</span>
        </div>
    );
}
