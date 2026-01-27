import { SignalMonitor } from '../SignalMonitor';
import { EnergyMonitor } from '../EnergyMonitor';
import type { SimulationState } from '../../hooks/useSimulation';

interface DataPanelProps {
    state: SimulationState;
    probePos: { x: number; y: number } | null;
    currentProbeValue: number;
    probeBuffer: number[];
    onCloseProbe: () => void;
    onPause: () => void;
}

export function DataPanel({
    state,
    probePos,
    currentProbeValue,
    probeBuffer,
    onCloseProbe,
    onPause
}: DataPanelProps) {
    return (
        <aside className="datapanel-area">
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 5, letterSpacing: '0.05em' }}>OSCILLOSCOPE</div>
            {probePos ? (
                <SignalMonitor
                    probeX={probePos.x}
                    probeY={probePos.y}
                    value={currentProbeValue}
                    isActive={true}
                    dataBuffer={probeBuffer}
                    onClose={onCloseProbe}
                />
            ) : (
                <div style={{
                    padding: '20px',
                    border: '1px dashed #22262F',
                    borderRadius: '4px',
                    color: '#444',
                    fontSize: '12px',
                    textAlign: 'center'
                }}>
                    Select 'Probe' tool to monitor signal
                </div>
            )}

            <div style={{ height: 20 }} />

            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 5, letterSpacing: '0.05em' }}>SYSTEM INTEGRITY</div>
            <EnergyMonitor
                energy={state.energy}
                isRunning={state.isRunning}
                onPause={onPause}
            />
        </aside>
    );
}
