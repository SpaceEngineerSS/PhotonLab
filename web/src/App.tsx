/**
 * PhotonLab v2.0 - FDTD Electromagnetic Engineering Suite
 * 
 * Professional CAD-style simulation environment with:
 * - Interactive drawing tools (brush, line, rect, circle, ellipse)
 * - Advanced source configuration
 * - Real-time FFT spectrum analysis
 * - Data export (CSV, PNG, Video)
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { useDrawTool, type DrawShape } from './hooks/useDrawTool';
import { SimCanvas } from './components/SimCanvas';
import { Controls } from './components/Controls';
import { Toolbar, type ToolbarState } from './components/Toolbar';
import { ScenarioMenu } from './components/ScenarioMenu';
import { SignalMonitor } from './components/SignalMonitor';
import { FPSCounter } from './components/FPSCounter';
import { EnergyMonitor } from './components/EnergyMonitor';
import { InteractionLayer } from './components/InteractionLayer';
import { ExportMenu } from './components/ExportMenu';
import { Footer } from './components/layout/Footer';
import './App.css';

const GRID_SIZE = 512;

function App() {
    const { state, controls, gridRef, memoryRef, onFrame } = useSimulation();

    // Canvas ref for export functionality
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Tool state
    const [toolState, setToolState] = useState<ToolbarState>({
        tool: 'brush',
        materialId: 1, // Glass
        brushSize: 15,
    });

    // Mobile sidebar toggle
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);

    // Probe position state
    const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);
    const [currentProbeValue, setCurrentProbeValue] = useState(0);
    const probeBufferRef = useRef<number[]>([]);
    const [probeBuffer, setProbeBuffer] = useState<number[]>([]);

    // Update probe value every frame
    useEffect(() => {
        if (!probePos) return;

        const updateProbe = () => {
            const value = controls.getFieldAt(probePos.x, probePos.y);
            setCurrentProbeValue(value);

            probeBufferRef.current.push(value);
            if (probeBufferRef.current.length > 200) {
                probeBufferRef.current.shift();
            }
            setProbeBuffer([...probeBufferRef.current]);
        };

        onFrame(updateProbe);

        return () => {
            onFrame(() => { });
        };
    }, [probePos, controls, onFrame]);

    // Handle shape drawing completion from InteractionLayer
    const handleDrawComplete = useCallback((shape: DrawShape) => {
        const grid = gridRef.current;
        if (!grid) return;

        const { type, start, end, materialId } = shape;

        switch (type) {
            case 'rect': {
                const x1 = Math.min(start.x, end.x);
                const y1 = Math.min(start.y, end.y);
                const x2 = Math.max(start.x, end.x);
                const y2 = Math.max(start.y, end.y);
                grid.paint_rect(x1, y1, x2, y2, materialId);
                break;
            }
            case 'circle': {
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const radius = Math.round(Math.sqrt(dx * dx + dy * dy));
                grid.paint_circle(start.x, start.y, radius, materialId);
                break;
            }
            case 'ellipse': {
                const cx = Math.round((start.x + end.x) / 2);
                const cy = Math.round((start.y + end.y) / 2);
                const rx = Math.abs(Math.round((end.x - start.x) / 2));
                const ry = Math.abs(Math.round((end.y - start.y) / 2));
                grid.paint_ellipse(cx, cy, rx, ry, materialId);
                break;
            }
            case 'line': {
                grid.paint_line(start.x, start.y, end.x, end.y, shape.brushSize, materialId);
                break;
            }
        }
    }, [gridRef]);

    // Handle brush strokes
    const handleBrushStroke = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
        const grid = gridRef.current;
        if (!grid) return;

        const matId = toolState.tool === 'eraser' ? 0 : toolState.materialId;
        grid.paint_line(from.x, from.y, to.x, to.y, toolState.brushSize, matId);
    }, [gridRef, toolState.tool, toolState.materialId, toolState.brushSize]);

    // useDrawTool hook for unified input handling
    const drawTool = useDrawTool({
        tool: toolState.tool,
        materialId: toolState.materialId,
        brushSize: toolState.brushSize,
        canvasWidth: GRID_SIZE,
        canvasHeight: GRID_SIZE,
        onDrawComplete: handleDrawComplete,
        onBrushStroke: handleBrushStroke,
    });

    // Handle canvas click for select/source tools
    const handleCanvasClick = useCallback((x: number, y: number) => {
        if (toolState.tool === 'select') {
            setProbePos({ x, y });
            probeBufferRef.current = [];
            setProbeBuffer([]);
        } else if (toolState.tool === 'source') {
            controls.placePulse(x, y);
        }
    }, [toolState.tool, controls]);

    // Handle scenario loading  
    const handleScenarioLoad = useCallback((scenarioId: number) => {
        gridRef.current?.load_preset(scenarioId);
    }, [gridRef]);

    // Get cursor style based on tool
    const getCursorStyle = () => {
        switch (toolState.tool) {
            case 'select': return 'crosshair';
            case 'source': return 'cell';
            case 'eraser': return 'not-allowed';
            default: return 'pointer';
        }
    };

    return (
        <div className="app-container">
            {/* HEADER */}
            <header className="header-area">
                <button
                    className="menu-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle Menu"
                >
                    ☰
                </button>
                <h1 className="app-title">
                    <span className="app-icon">⚡</span>
                    PhotonLab
                    <span className="version-tag">v2.0</span>
                </h1>
                <span className="app-subtitle">Engineering Suite</span>
                <div className="header-spacer" />
                <ExportMenu
                    canvasRef={canvasRef}
                    probeData={probeBuffer.length > 0 ? new Float32Array(probeBuffer) : null}
                    timeStep={state.timeStep}
                    isRecording={isRecording}
                    onRecordingChange={setIsRecording}
                />
                <FPSCounter fps={state.fps} />
            </header>

            {/* SIDEBAR (Mobile Slide-in) */}
            <aside className={`sidebar-area ${sidebarOpen ? 'open' : ''}`}>
                <button
                    className="mobile-close"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close Menu"
                >
                    ✕
                </button>
                <ScenarioMenu onLoadScenario={(id) => {
                    handleScenarioLoad(id);
                    setSidebarOpen(false);
                }} />
                <div className="sidebar-divider" />
                <Toolbar
                    state={toolState}
                    onChange={(partial) => setToolState(prev => ({ ...prev, ...partial }))}
                    onClearMaterials={() => gridRef.current?.clear_materials()}
                />
            </aside>

            {/* MAIN CANVAS with Interaction Layer */}
            <main className="canvas-area">
                <div
                    className="canvas-wrapper"
                    {...drawTool.handlers}
                    onPointerDown={(e) => {
                        // Handle select/source tools with click
                        if (toolState.tool === 'select' || toolState.tool === 'source') {
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Calculate relative position (0.0 to 1.0)
                            const relX = (e.clientX - rect.left) / rect.width;
                            const relY = (e.clientY - rect.top) / rect.height;
                            // Scale to grid resolution
                            const rawX = Math.floor(relX * GRID_SIZE);
                            const rawY = Math.floor(relY * GRID_SIZE);
                            // Clamp and apply Y-axis inversion
                            const x = Math.max(0, Math.min(rawX, GRID_SIZE - 1));
                            const y = Math.max(0, Math.min(GRID_SIZE - 1 - rawY, GRID_SIZE - 1));
                            handleCanvasClick(x, y);
                            return;
                        }
                        drawTool.handlers.onPointerDown(e);
                    }}
                    style={{ cursor: getCursorStyle() }}
                >
                    <SimCanvas
                        gridRef={gridRef}
                        memoryRef={memoryRef}
                        width={GRID_SIZE}
                        height={GRID_SIZE}
                        onFrame={onFrame}
                        canvasRef={canvasRef}
                    />
                    <InteractionLayer
                        width={GRID_SIZE}
                        height={GRID_SIZE}
                        previewShape={drawTool.previewShape}
                    />
                </div>

                {/* Floating Monitors */}
                <div className="monitor-container">
                    {probePos && (
                        <SignalMonitor
                            probeX={probePos.x}
                            probeY={probePos.y}
                            value={currentProbeValue}
                            isActive={true}
                            dataBuffer={probeBuffer}
                            onClose={() => setProbePos(null)}
                        />
                    )}
                </div>
            </main >

            {/* FOOTER with Controls */}
            < footer className="footer-area" >
                <Controls state={state} controls={controls} />
                <div className="status-bar">
                    <span className="status-item">
                        Step: <strong>{state.timeStep.toLocaleString()}</strong>
                    </span>
                    <EnergyMonitor
                        energy={state.energy}
                        isRunning={state.isRunning}
                        onPause={controls.pause}
                    />
                    <span className={`status-item ${state.isStable ? 'success' : 'danger'}`}>
                        Status: {state.isStable ? '✓ Stable' : '⚠ Unstable'}
                    </span>
                    {isRecording && (
                        <span className="status-item recording">
                            🔴 Recording...
                        </span>
                    )}
                </div>
                <Footer version="2.0.0" />
            </footer >
        </div >
    );
}

export default App;
