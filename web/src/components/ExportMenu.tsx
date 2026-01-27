/**
 * ExportMenu Component
 * 
 * Data export functionality:
 * - CSV: Time-series probe data export
 * - Snapshot: Canvas screenshot with watermark
 * - Video: MediaRecorder-based simulation recording
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useState, useCallback, useRef } from 'react';
import './ExportMenu.css';

interface ExportMenuProps {
    /** Reference to the canvas element */
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Probe buffer data for CSV export */
    probeData: Float32Array | null;
    /** Simulation time step for CSV timestamps */
    timeStep: number;
    /** Whether recording is in progress */
    isRecording: boolean;
    /** Callback to start/stop recording */
    onRecordingChange: (recording: boolean) => void;
}

export function ExportMenu({
    canvasRef,
    probeData,
    timeStep,
    isRecording,
    onRecordingChange,
}: ExportMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Export probe data as CSV
    const exportCSV = useCallback(() => {
        if (!probeData || probeData.length === 0) {
            alert('No probe data available. Place a probe and run the simulation first.');
            return;
        }

        let csv = 'TimeStep,FieldValue\n';
        for (let i = 0; i < probeData.length; i++) {
            csv += `${i},${probeData[i].toFixed(6)}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photonlab_probe_data_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setIsOpen(false);
    }, [probeData]);

    // Export snapshot with watermark
    const exportSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            alert('Canvas not available');
            return;
        }

        // Create a temporary canvas to add watermark
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        // Draw original canvas content
        ctx.drawImage(canvas, 0, 0);

        // Add watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const watermark = 'PhotonLab v2.0 | Mehmet Gümüş';
        const padding = 10;
        ctx.fillText(watermark, tempCanvas.width - padding, tempCanvas.height - padding);

        // Add timestamp
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const timestamp = new Date().toISOString();
        ctx.fillText(`t=${timeStep} | ${timestamp}`, tempCanvas.width - padding, tempCanvas.height - padding - 18);

        // Download
        const url = tempCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `photonlab_snapshot_${Date.now()}.png`;
        a.click();
        setIsOpen(false);
    }, [canvasRef, timeStep]);

    // Start video recording
    const startRecording = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            alert('Canvas not available');
            return;
        }

        try {
            const stream = canvas.captureStream(30); // 30 FPS
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 5000000, // 5 Mbps
            });

            recordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `photonlab_recording_${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                recordedChunksRef.current = [];
            };

            mediaRecorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = mediaRecorder;
            onRecordingChange(true);
            setIsOpen(false);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Video recording not supported in this browser');
        }
    }, [canvasRef, onRecordingChange]);

    // Stop video recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            onRecordingChange(false);
        }
    }, [onRecordingChange]);

    return (
        <div className="export-menu">
            <button
                className={`export-trigger ${isOpen ? 'active' : ''} ${isRecording ? 'recording' : ''}`}
                onClick={() => isRecording ? stopRecording() : setIsOpen(!isOpen)}
                title={isRecording ? 'Stop Recording' : 'Export Options'}
            >
                {isRecording ? (
                    <>
                        <span className="record-indicator"></span>
                        <span>Stop</span>
                    </>
                ) : (
                    <>
                        <span className="export-icon">📤</span>
                        <span>Export</span>
                    </>
                )}
            </button>

            {isOpen && !isRecording && (
                <div className="export-dropdown">
                    <button className="export-option" onClick={exportCSV}>
                        <span className="option-icon">📊</span>
                        <div className="option-content">
                            <span className="option-title">Export CSV</span>
                            <span className="option-desc">Probe time-series data</span>
                        </div>
                    </button>
                    <button className="export-option" onClick={exportSnapshot}>
                        <span className="option-icon">📸</span>
                        <div className="option-content">
                            <span className="option-title">Snapshot</span>
                            <span className="option-desc">PNG with watermark</span>
                        </div>
                    </button>
                    <button className="export-option" onClick={startRecording}>
                        <span className="option-icon">🎬</span>
                        <div className="option-content">
                            <span className="option-title">Record Video</span>
                            <span className="option-desc">WebM simulation recording</span>
                        </div>
                    </button>
                    <div className="export-footer">
                        <small>PhotonLab v2.0 • Mehmet Gümüş</small>
                    </div>
                </div>
            )}
        </div>
    );
}
