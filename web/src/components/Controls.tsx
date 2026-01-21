/**
 * Controls Component
 * 
 * Compact simulation control panel for footer integration.
 */

import type { SimulationState, SimulationControls } from '../hooks/useSimulation';
import './Controls.css';

interface ControlsProps {
    state: SimulationState;
    controls: SimulationControls;
}

export function Controls({ state, controls }: ControlsProps) {
    const { isRunning, isReady } = state;
    const { play, pause, reset, step, placePulse } = controls;

    return (
        <div className="controls-panel">
            {/* Play/Pause Button */}
            <button
                onClick={isRunning ? pause : play}
                disabled={!isReady}
                className={`control-btn ${isRunning ? 'active' : ''}`}
            >
                {isRunning ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Step Button */}
            <button
                onClick={step}
                disabled={!isReady || isRunning}
                className="control-btn"
            >
                ⏭ Step
            </button>

            {/* Reset Button */}
            <button
                onClick={reset}
                disabled={!isReady}
                className="control-btn"
            >
                ↺ Reset
            </button>

            {/* Pulse Button */}
            <button
                onClick={() => placePulse()}
                disabled={!isReady}
                className="control-btn pulse-btn"
            >
                💥 Pulse
            </button>
        </div>
    );
}
