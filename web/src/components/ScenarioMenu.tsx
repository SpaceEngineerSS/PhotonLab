/**
 * ScenarioMenu Component
 * 
 * Dropdown menu for loading pre-built physics experiments.
 */

import { useState, useCallback } from 'react';
import './ScenarioMenu.css';

// Scenario definitions (must match Rust scenario IDs)
export const SCENARIOS = [
    { id: 0, name: 'Empty Grid', icon: '🌌', description: 'Clean vacuum' },
    { id: 1, name: 'Double Slit', icon: '🌊', description: 'Wave diffraction' },
    { id: 2, name: 'Waveguide', icon: '〰️', description: 'Bent fiber optic' },
    { id: 3, name: 'Parabolic Reflector', icon: '📡', description: 'Focused waves' },
    { id: 4, name: 'TIR Prism', icon: '🔺', description: 'Total internal reflection' },
    { id: 5, name: 'Photonic Crystal', icon: '🔮', description: 'Periodic structure' },
    { id: 6, name: 'Lens', icon: '🔍', description: 'Wave focusing' },
] as const;

interface ScenarioMenuProps {
    onLoadScenario: (id: number) => void;
    currentScenario?: number;
}

export function ScenarioMenu({ onLoadScenario, currentScenario }: ScenarioMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const handleSelect = useCallback((id: number, name: string) => {
        onLoadScenario(id);
        setIsOpen(false);

        // Show toast notification
        setToast(`Loaded: ${name}`);
        setTimeout(() => setToast(null), 2000);
    }, [onLoadScenario]);

    const currentName = SCENARIOS.find(s => s.id === currentScenario)?.name || 'Select Scenario';

    return (
        <div className="scenario-menu">
            {/* Trigger button */}
            <button
                className="scenario-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="trigger-icon">🧪</span>
                <span className="trigger-label">{currentName}</span>
                <span className="trigger-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="scenario-dropdown">
                    <div className="dropdown-header">Experiments</div>
                    {SCENARIOS.map(scenario => (
                        <button
                            key={scenario.id}
                            className={`scenario-item ${currentScenario === scenario.id ? 'active' : ''}`}
                            onClick={() => handleSelect(scenario.id, scenario.name)}
                        >
                            <span className="item-icon">{scenario.icon}</span>
                            <div className="item-content">
                                <span className="item-name">{scenario.name}</span>
                                <span className="item-desc">{scenario.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div className="scenario-toast">
                    {toast}
                </div>
            )}
        </div>
    );
}
