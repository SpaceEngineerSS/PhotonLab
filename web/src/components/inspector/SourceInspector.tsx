/**
 * SourceInspector Component
 * 
 * Panel for configuring advanced source parameters:
 * - Frequency (Hz with normalized mapping)
 * - Phase (0 to 2π radians)
 * - Amplitude
 * - Position X/Y
 * - Source type selector
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import { useState, useCallback } from 'react';
import './SourceInspector.css';

export type SourceType = 'point' | 'planewave' | 'phasedarray' | 'gaussianbeam';

export interface SourceConfig {
    type: SourceType;
    x: number;
    y: number;
    frequency: number;
    phase: number;
    amplitude: number;
    // Phased array specific
    numElements?: number;
    spacing?: number;
    steeringAngle?: number;
    // Gaussian beam specific
    beamWaist?: number;
}

interface SourceInspectorProps {
    config: SourceConfig;
    gridWidth: number;
    gridHeight: number;
    onChange: (config: SourceConfig) => void;
    onApply: () => void;
}

const SOURCE_TYPES: { id: SourceType; name: string; icon: string }[] = [
    { id: 'point', name: 'Point Source', icon: '💥' },
    { id: 'planewave', name: 'Plane Wave', icon: '〰️' },
    { id: 'phasedarray', name: 'Phased Array', icon: '📡' },
    { id: 'gaussianbeam', name: 'Gaussian Beam', icon: '🔦' },
];

export function SourceInspector({
    config,
    gridWidth,
    gridHeight,
    onChange,
    onApply,
}: SourceInspectorProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleTypeChange = useCallback((type: SourceType) => {
        onChange({
            ...config,
            type,
            numElements: type === 'phasedarray' ? 8 : undefined,
            spacing: type === 'phasedarray' ? 10 : undefined,
            steeringAngle: type === 'phasedarray' ? 0 : undefined,
            beamWaist: type === 'gaussianbeam' ? 30 : undefined,
        });
    }, [config, onChange]);

    const updateConfig = useCallback(<K extends keyof SourceConfig>(
        key: K,
        value: SourceConfig[K]
    ) => {
        onChange({ ...config, [key]: value });
    }, [config, onChange]);

    return (
        <div className={`source-inspector ${isCollapsed ? 'collapsed' : ''}`}>
            <div
                className="inspector-header"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span className="inspector-icon">⚡</span>
                <span className="inspector-title">Source Inspector</span>
                <span className="collapse-icon">{isCollapsed ? '▼' : '▲'}</span>
            </div>

            {!isCollapsed && (
                <div className="inspector-content">
                    {/* Source Type Selector */}
                    <div className="inspector-section">
                        <label className="section-label">Type</label>
                        <div className="type-selector">
                            {SOURCE_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    className={`type-btn ${config.type === type.id ? 'active' : ''}`}
                                    onClick={() => handleTypeChange(type.id)}
                                    title={type.name}
                                >
                                    <span className="type-icon">{type.icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Position */}
                    <div className="inspector-section">
                        <label className="section-label">Position</label>
                        <div className="dual-input">
                            <div className="input-group">
                                <span className="input-label">X</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={gridWidth - 1}
                                    value={config.x}
                                    onChange={e => updateConfig('x', Number(e.target.value))}
                                />
                            </div>
                            <div className="input-group">
                                <span className="input-label">Y</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={gridHeight - 1}
                                    value={config.y}
                                    onChange={e => updateConfig('y', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="inspector-section">
                        <label className="section-label">
                            Frequency: {(config.frequency * 100).toFixed(1)}%
                        </label>
                        <input
                            type="range"
                            className="slider"
                            min={0.01}
                            max={0.3}
                            step={0.01}
                            value={config.frequency}
                            onChange={e => updateConfig('frequency', Number(e.target.value))}
                        />
                    </div>

                    {/* Phase (for Phased Array) */}
                    {config.type === 'phasedarray' && (
                        <div className="inspector-section">
                            <label className="section-label">
                                Steering Angle: {((config.steeringAngle || 0) * 180 / Math.PI).toFixed(0)}°
                            </label>
                            <input
                                type="range"
                                className="slider"
                                min={-Math.PI / 2}
                                max={Math.PI / 2}
                                step={0.05}
                                value={config.steeringAngle || 0}
                                onChange={e => updateConfig('steeringAngle', Number(e.target.value))}
                            />
                        </div>
                    )}

                    {/* Number of Elements (for Phased Array) */}
                    {config.type === 'phasedarray' && (
                        <div className="inspector-section">
                            <label className="section-label">
                                Elements: {config.numElements}
                            </label>
                            <input
                                type="range"
                                className="slider"
                                min={2}
                                max={16}
                                step={1}
                                value={config.numElements || 8}
                                onChange={e => updateConfig('numElements', Number(e.target.value))}
                            />
                        </div>
                    )}

                    {/* Beam Waist (for Gaussian Beam) */}
                    {config.type === 'gaussianbeam' && (
                        <div className="inspector-section">
                            <label className="section-label">
                                Beam Waist: {config.beamWaist} cells
                            </label>
                            <input
                                type="range"
                                className="slider"
                                min={5}
                                max={100}
                                step={1}
                                value={config.beamWaist || 30}
                                onChange={e => updateConfig('beamWaist', Number(e.target.value))}
                            />
                        </div>
                    )}

                    {/* Amplitude */}
                    <div className="inspector-section">
                        <label className="section-label">
                            Amplitude: {config.amplitude.toFixed(2)}
                        </label>
                        <input
                            type="range"
                            className="slider"
                            min={0.1}
                            max={2.0}
                            step={0.1}
                            value={config.amplitude}
                            onChange={e => updateConfig('amplitude', Number(e.target.value))}
                        />
                    </div>

                    {/* Apply Button */}
                    <button className="apply-btn" onClick={onApply}>
                        Apply Source
                    </button>
                </div>
            )}
        </div>
    );
}
