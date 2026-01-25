/**
 * PhotonLab - FDTD Electromagnetic Simulator
 * 
 * Main application with CSS Grid Layout and Scientific Lab aesthetic.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimulation } from './hooks/useSimulation';
import { SimCanvas } from './components/SimCanvas';
import { Controls } from './components/Controls';
import { Toolbar } from './components/Toolbar';
import { ScenarioMenu } from './components/ScenarioMenu';
import { SignalMonitor } from './components/SignalMonitor';
import { FPSCounter } from './components/FPSCounter';
import { EnergyMonitor } from './components/EnergyMonitor';
import type { ToolbarState } from './components/Toolbar';
import './App.css';

function App() {
    const { state, controls, gridRef, memoryRef, onFrame } = useSimulation();

    // Tool state - matching Toolbar interface
    const [toolState, setToolState] = useState<ToolbarState>({
        tool: 'brush',
        materialId: 1, // Glass
        brushSize: 15,
    });

    // Mobile sidebar toggle
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

            // Add to buffer (keep last 200 samples)
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

    // Handle canvas interactions based on tool
    const handleCanvasClick = useCallback((x: number, y: number) => {
        if (toolState.tool === 'select') {
            // Place probe at click location
            setProbePos({ x, y });
            probeBufferRef.current = [];
            setProbeBuffer([]);
        } else if (toolState.tool === 'source') {
            controls.placePulse(x, y);
        }
    }, [toolState.tool, controls]);

    const handleCanvasDraw = useCallback((x1: number, y1: number, x2: number, y2: number) => {
        const grid = gridRef.current;
        if (!grid) return;

        if (toolState.tool === 'brush') {
            grid.paint_line(
                x1, y1, x2, y2,
                toolState.brushSize,
                toolState.materialId
            );
        } else if (toolState.tool === 'eraser') {
            grid.paint_line(x1, y1, x2, y2, toolState.brushSize, 0); // 0 = Vacuum
        } else if (toolState.tool === 'rect') {
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);
            grid.paint_rect(minX, minY, maxX, maxY, toolState.materialId);
        }
    }, [toolState, gridRef]);

    // Handle scenario loading  
    const handleScenarioLoad = useCallback((scenarioId: number) => {
        gridRef.current?.load_preset(scenarioId);
    }, [gridRef]);

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
                </h1>
                <span className="app-subtitle">FDTD Electromagnetic Simulator</span>
                <div className="header-spacer" />
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


            {/* MAIN CANVAS */}
            <main className="canvas-area">
                <SimCanvas
                    gridRef={gridRef}
                    memoryRef={memoryRef}
                    width={512}
                    height={512}
                    onFrame={onFrame}
                    onMouseDown={(e) => {
                        const canvas = e.currentTarget;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = 512 / rect.width;
                        const scaleY = 512 / rect.height;
                        const x = Math.floor((e.clientX - rect.left) * scaleX);
                        const y = Math.floor((e.clientY - rect.top) * scaleY);
                        handleCanvasClick(x, y);
                    }}
                    onMouseMove={(e) => {
                        if (e.buttons !== 1) return; // Only on drag
                        const canvas = e.currentTarget;
                        const rect = canvas.getBoundingClientRect();
                        const scaleX = 512 / rect.width;
                        const scaleY = 512 / rect.height;
                        const x = Math.floor((e.clientX - rect.left) * scaleX);
                        const y = Math.floor((e.clientY - rect.top) * scaleY);
                        handleCanvasDraw(x, y, x, y);
                    }}
                    cursorStyle={toolState.tool === 'select' ? 'crosshair' : 'pointer'}
                />

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
            </main>

            {/* FOOTER */}
            <footer className="footer-area">
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
                </div>
            </footer>
        </div>
    );
}

export default App;
