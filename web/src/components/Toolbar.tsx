/**
 * Toolbar Component
 * 
 * Floating toolbar for selecting drawing tools, materials, and brush settings.
 */

import { useState, useCallback } from 'react';
import './Toolbar.css';

// Tool types
export type ToolType = 'select' | 'brush' | 'rect' | 'eraser' | 'source';

// Material IDs (must match Rust set_cell_material)
export const MATERIALS = [
    { id: 0, name: 'Vacuum', color: '#1a1a25', icon: '🌌' },
    { id: 1, name: 'Glass', color: '#4ecdc4', icon: '🔷' },
    { id: 2, name: 'Water', color: '#3498db', icon: '💧' },
    { id: 3, name: 'Metal', color: '#c0c0c0', icon: '🔩' },
    { id: 4, name: 'Absorber', color: '#2c3e50', icon: '🕳️' },
    { id: 5, name: 'Crystal', color: '#9b59b6', icon: '💎' },
    { id: 6, name: 'Silicon', color: '#e67e22', icon: '🔶' },
] as const;

// Tool definitions
export const TOOLS = [
    { id: 'select' as ToolType, name: 'Select', icon: '🖱️', shortcut: 'V' },
    { id: 'brush' as ToolType, name: 'Brush', icon: '✏️', shortcut: 'B' },
    { id: 'rect' as ToolType, name: 'Rectangle', icon: '🟥', shortcut: 'R' },
    { id: 'eraser' as ToolType, name: 'Eraser', icon: '🧹', shortcut: 'E' },
    { id: 'source' as ToolType, name: 'Source', icon: '💥', shortcut: 'S' },
] as const;

export interface ToolbarState {
    tool: ToolType;
    materialId: number;
    brushSize: number;
}

interface ToolbarProps {
    state: ToolbarState;
    onChange: (state: Partial<ToolbarState>) => void;
    onClearMaterials: () => void;
}

export function Toolbar({ state, onChange, onClearMaterials }: ToolbarProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleToolSelect = useCallback((tool: ToolType) => {
        onChange({ tool });
    }, [onChange]);

    const handleMaterialSelect = useCallback((materialId: number) => {
        onChange({ materialId });
    }, [onChange]);

    const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ brushSize: parseInt(e.target.value, 10) });
    }, [onChange]);

    const currentMaterial = MATERIALS.find(m => m.id === state.materialId) || MATERIALS[0];

    return (
        <div className={`toolbar ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Toggle Button */}
            <button
                className="toolbar-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
            >
                {isExpanded ? '◀' : '▶'}
            </button>

            {isExpanded && (
                <>
                    {/* Tools Section */}
                    <div className="toolbar-section">
                        <div className="section-title">Tools</div>
                        <div className="tool-grid">
                            {TOOLS.map(tool => (
                                <button
                                    key={tool.id}
                                    className={`tool-btn ${state.tool === tool.id ? 'active' : ''}`}
                                    onClick={() => handleToolSelect(tool.id)}
                                    title={`${tool.name} (${tool.shortcut})`}
                                >
                                    <span className="tool-icon">{tool.icon}</span>
                                    <span className="tool-name">{tool.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Materials Section (hidden for eraser) */}
                    {state.tool !== 'eraser' && state.tool !== 'select' && state.tool !== 'source' && (
                        <div className="toolbar-section">
                            <div className="section-title">Material</div>
                            <div className="material-grid">
                                {MATERIALS.slice(1).map(material => (
                                    <button
                                        key={material.id}
                                        className={`material-btn ${state.materialId === material.id ? 'active' : ''}`}
                                        onClick={() => handleMaterialSelect(material.id)}
                                        title={material.name}
                                        style={{ '--material-color': material.color } as React.CSSProperties}
                                    >
                                        <span className="material-icon">{material.icon}</span>
                                        <span className="material-name">{material.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Brush Size Slider (for brush tool) */}
                    {(state.tool === 'brush' || state.tool === 'eraser') && (
                        <div className="toolbar-section">
                            <div className="section-title">
                                Brush Size: {state.brushSize}px
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={state.brushSize}
                                onChange={handleBrushSizeChange}
                                className="brush-slider"
                            />
                        </div>
                    )}

                    {/* Current Selection Indicator */}
                    <div className="toolbar-section current-selection">
                        <div className="selection-indicator">
                            <span className="selection-tool">
                                {TOOLS.find(t => t.id === state.tool)?.icon}
                            </span>
                            {state.tool !== 'eraser' && state.tool !== 'select' && state.tool !== 'source' && (
                                <span
                                    className="selection-material"
                                    style={{ backgroundColor: currentMaterial.color }}
                                >
                                    {currentMaterial.icon}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="toolbar-section actions">
                        <button
                            className="action-btn clear-btn"
                            onClick={onClearMaterials}
                            title="Clear all materials"
                        >
                            🗑️ Clear All
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
