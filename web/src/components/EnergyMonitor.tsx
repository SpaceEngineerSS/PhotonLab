/**
 * EnergyMonitor Component
 * 
 * Displays total electromagnetic energy and auto-pauses on instability.
 */

import { useEffect, useState } from 'react';
import './EnergyMonitor.css';

interface EnergyMonitorProps {
    /** Current total energy from simulation */
    energy: number;
    /** Whether simulation is running */
    isRunning: boolean;
    /** Callback to pause simulation */
    onPause: () => void;
}

export function EnergyMonitor({ energy, isRunning, onPause }: EnergyMonitorProps) {
    const [showAlert, setShowAlert] = useState(false);

    // Detect instability (energy = -1.0 means NaN/Infinity detected)
    useEffect(() => {
        if (energy < 0 && isRunning) {
            // Simulation unstable - auto-pause
            onPause();
            setShowAlert(true);
        }
    }, [energy, isRunning, onPause]);

    // Format energy for display
    const formatEnergy = (e: number): string => {
        if (e < 0) return 'UNSTABLE';
        if (e === 0) return '0.00';
        if (e < 0.001) return e.toExponential(2);
        if (e > 1000000) return e.toExponential(2);
        return e.toFixed(2);
    };

    // Determine energy level for color coding
    const getEnergyLevel = (): string => {
        if (energy < 0) return 'critical';
        if (energy > 100000) return 'high';
        if (energy > 1000) return 'medium';
        return 'low';
    };

    return (
        <>
            <div className={`energy-monitor ${getEnergyLevel()}`}>
                <span className="energy-label">⚡ Energy:</span>
                <span className="energy-value">{formatEnergy(energy)}</span>
            </div>

            {/* Instability Alert Modal */}
            {showAlert && (
                <div className="instability-alert-overlay">
                    <div className="instability-alert">
                        <div className="alert-icon">⚠️</div>
                        <h3>Simulation Unstable</h3>
                        <p>CFL condition violated or numerical explosion detected.</p>
                        <p className="alert-hint">
                            Try reducing source amplitude or check material properties.
                        </p>
                        <button onClick={() => setShowAlert(false)}>Dismiss</button>
                    </div>
                </div>
            )}
        </>
    );
}
