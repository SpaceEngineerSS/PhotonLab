/**
 * SpectrumMonitor Component
 * 
 * FFT visualization showing Frequency vs Power (dB) plot.
 * Canvas-based rendering for performance with probe data.
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import './SpectrumMonitor.css';

interface SpectrumMonitorProps {
    /** Spectrum data in dB (from SpectrumAnalyzer.compute()) */
    spectrumData: Float32Array | null;
    /** FFT size for frequency axis scaling */
    fftSize: number;
    /** Whether the simulation is running */
    isRunning: boolean;
}

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 150;
const PADDING = { top: 10, right: 10, bottom: 30, left: 40 };
const PLOT_WIDTH = CANVAS_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CANVAS_HEIGHT - PADDING.top - PADDING.bottom;

export function SpectrumMonitor({ spectrumData, fftSize, isRunning }: SpectrumMonitorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peakInfo, setPeakInfo] = useState<{ bin: number; db: number } | null>(null);
    const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');

    const drawSpectrum = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CANVAS_WIDTH * dpr;
        canvas.height = CANVAS_HEIGHT * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal grid lines (dB scale)
        const dbRange = { min: -80, max: 0 };
        for (let db = dbRange.min; db <= dbRange.max; db += 20) {
            const y = PADDING.top + PLOT_HEIGHT * (1 - (db - dbRange.min) / (dbRange.max - dbRange.min));
            ctx.beginPath();
            ctx.moveTo(PADDING.left, y);
            ctx.lineTo(PADDING.left + PLOT_WIDTH, y);
            ctx.stroke();

            // dB label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${db}`, PADDING.left - 5, y + 3);
        }

        // Vertical grid lines (frequency bins)
        const numBins = spectrumData?.length || fftSize / 2;
        const gridDivisions = Math.min(4, numBins);
        for (let i = 0; i <= gridDivisions; i++) {
            const x = PADDING.left + (PLOT_WIDTH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(x, PADDING.top);
            ctx.lineTo(x, PADDING.top + PLOT_HEIGHT);
            ctx.stroke();

            // Frequency label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            const freq = ((i / 4) * 0.5).toFixed(2);
            ctx.fillText(`${freq}`, x, CANVAS_HEIGHT - 5);
        }

        // Axis labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Normalized Frequency', PADDING.left + PLOT_WIDTH / 2, CANVAS_HEIGHT - 15);

        // Draw spectrum if data available
        if (spectrumData && spectrumData.length > 0) {
            const gradient = ctx.createLinearGradient(PADDING.left, PADDING.top, PADDING.left, PADDING.top + PLOT_HEIGHT);
            gradient.addColorStop(0, '#4ecdc4');
            gradient.addColorStop(0.5, '#45b7aa');
            gradient.addColorStop(1, '#2d7a75');

            ctx.beginPath();
            ctx.moveTo(PADDING.left, PADDING.top + PLOT_HEIGHT);

            let peakBin = 0;
            let peakDb = -Infinity;

            for (let i = 0; i < spectrumData.length; i++) {
                const x = PADDING.left + (i / spectrumData.length) * PLOT_WIDTH;
                const db = Math.max(dbRange.min, Math.min(dbRange.max, spectrumData[i]));
                const y = PADDING.top + PLOT_HEIGHT * (1 - (db - dbRange.min) / (dbRange.max - dbRange.min));

                if (i === 0) {
                    ctx.lineTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                if (spectrumData[i] > peakDb) {
                    peakDb = spectrumData[i];
                    peakBin = i;
                }
            }

            ctx.lineTo(PADDING.left + PLOT_WIDTH, PADDING.top + PLOT_HEIGHT);
            ctx.closePath();

            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Draw line
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < spectrumData.length; i++) {
                const x = PADDING.left + (i / spectrumData.length) * PLOT_WIDTH;
                const db = Math.max(dbRange.min, Math.min(dbRange.max, spectrumData[i]));
                const y = PADDING.top + PLOT_HEIGHT * (1 - (db - dbRange.min) / (dbRange.max - dbRange.min));
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Draw peak marker
            if (peakDb > dbRange.min) {
                const peakX = PADDING.left + (peakBin / spectrumData.length) * PLOT_WIDTH;
                const peakY = PADDING.top + PLOT_HEIGHT * (1 - (Math.max(dbRange.min, Math.min(dbRange.max, peakDb)) - dbRange.min) / (dbRange.max - dbRange.min));

                ctx.beginPath();
                ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ff6b6b';
                ctx.fill();

                setPeakInfo({ bin: peakBin, db: peakDb });
            }
        } else {
            // No data message
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                isRunning ? 'Waiting for data...' : 'Start simulation to see spectrum',
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2
            );
        }
    }, [spectrumData, fftSize, isRunning]);

    useEffect(() => {
        drawSpectrum();
    }, [drawSpectrum]);

    return (
        <div className="spectrum-monitor">
            <div className="spectrum-header">
                <span className="spectrum-title">📊 Spectrum Analyzer</span>
                <div className="spectrum-controls">
                    <button
                        className={`scale-btn ${scaleMode === 'linear' ? 'active' : ''}`}
                        onClick={() => setScaleMode('linear')}
                    >
                        Lin
                    </button>
                    <button
                        className={`scale-btn ${scaleMode === 'log' ? 'active' : ''}`}
                        onClick={() => setScaleMode('log')}
                    >
                        Log
                    </button>
                </div>
            </div>
            <canvas
                ref={canvasRef}
                className="spectrum-canvas"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            />
            {peakInfo && peakInfo.db > -80 && (
                <div className="peak-info">
                    Peak: Bin {peakInfo.bin} ({peakInfo.db.toFixed(1)} dB)
                </div>
            )}
        </div>
    );
}
