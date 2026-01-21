/**
 * useSimulation Hook
 * 
 * Manages the FDTD simulation lifecycle:
 * - Loads Wasm module asynchronously
 * - Provides animation loop control
 * - Exposes simulation state and controls to React components
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import init, { FDTDGrid, get_wasm_memory } from 'photonlab-core';

// Simulation configuration
const GRID_SIZE = 512;
const STEPS_PER_FRAME = 6;  // Physics steps per animation frame
const SOURCE_FREQUENCY = 0.1;  // Normalized frequency for sinusoidal source

export interface SimulationState {
  isRunning: boolean;
  isReady: boolean;
  timeStep: number;
  fps: number;
  energy: number;
  isStable: boolean;
}

export interface SimulationControls {
  play: () => void;
  pause: () => void;
  reset: () => void;
  step: () => void;
  placePulse: (x?: number, y?: number) => void;
  setPEC: (x: number, y: number) => void;
  setMaterial: (x1: number, y1: number, x2: number, y2: number, epsilonR: number) => void;
  // Brush painting API
  paintCircle: (cx: number, cy: number, radius: number, materialId: number) => void;
  paintRect: (x1: number, y1: number, x2: number, y2: number, materialId: number) => void;
  paintLine: (x1: number, y1: number, x2: number, y2: number, brushSize: number, materialId: number) => void;
  clearMaterials: () => void;
  // Scenario loading
  loadPreset: (scenarioId: number) => void;
  // Plane wave sources
  injectPlaneWaveX: (x: number, amplitude: number) => void;
  injectSinusoidalPlaneWave: (x: number, frequency: number) => void;
  injectGaussianPlaneWave: (x: number, t0: number, tau: number) => void;
  // Probe
  getFieldAt: (x: number, y: number) => number;
  // Energy monitoring
  getTotalEnergy: () => number;
}

export interface SimulationData {
  grid: FDTDGrid | null;
  memory: WebAssembly.Memory | null;
  width: number;
  height: number;
}

export function useSimulation() {
  // Refs for mutable state that shouldn't trigger re-renders
  const gridRef = useRef<FDTDGrid | null>(null);
  const memoryRef = useRef<WebAssembly.Memory | null>(null);
  const animationIdRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // React state for UI updates
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    isReady: false,
    timeStep: 0,
    fps: 0,
    energy: 0,
    isStable: true,
  });

  // Callbacks for external listeners (e.g., WebGL renderer)
  const onFrameCallbackRef = useRef<(() => void) | null>(null);

  // Initialize Wasm module
  useEffect(() => {
    let mounted = true;

    async function initWasm() {
      try {
        await init();

        if (!mounted) return;

        // Create the simulation grid
        const grid = new FDTDGrid(GRID_SIZE, GRID_SIZE);
        gridRef.current = grid;

        // Get Wasm memory for zero-copy access
        const wasmMemory = get_wasm_memory() as WebAssembly.Memory;
        memoryRef.current = wasmMemory;

        // Place initial pulse at center
        grid.place_pulse(GRID_SIZE / 2, GRID_SIZE / 2, 1.0);

        setState(prev => ({
          ...prev,
          isReady: true,
          energy: grid.get_total_energy(),
        }));

        console.log('[PhotonLab] Wasm initialized, grid size:', GRID_SIZE);
      } catch (error) {
        console.error('[PhotonLab] Failed to initialize Wasm:', error);
      }
    }

    initWasm();

    return () => {
      mounted = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (gridRef.current) {
        gridRef.current.free();
      }
    };
  }, []);

  // Animation loop
  const runSimulation = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || !isRunningRef.current) return;

    const now = performance.now();

    // Run physics steps
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      // Add continuous soft source at center
      grid.add_soft_source(
        GRID_SIZE / 2,
        GRID_SIZE / 2,
        SOURCE_FREQUENCY,
        0.5
      );
      grid.step();
    }

    // Notify renderer to update
    if (onFrameCallbackRef.current) {
      onFrameCallbackRef.current();
    }

    // Calculate FPS every 30 frames
    frameCountRef.current++;
    if (frameCountRef.current >= 30) {
      const elapsed = now - lastFrameTimeRef.current;
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);

      setState(prev => ({
        ...prev,
        timeStep: Number(grid.get_time_step()),
        fps,
        energy: grid.get_total_energy(),
        isStable: grid.is_stable(),
      }));

      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    // Check for instability
    if (!grid.is_stable()) {
      console.error('[PhotonLab] Simulation became unstable (NaN detected)!');
      isRunningRef.current = false;
      setState(prev => ({ ...prev, isRunning: false, isStable: false }));
      return;
    }

    // Continue loop
    animationIdRef.current = requestAnimationFrame(runSimulation);
  }, []);

  // Control functions - memoized with runSimulation as only active dependency
  // All other dependencies (refs, setState) are stable and don't need to be listed
  const controls: SimulationControls = useMemo(() => ({
    play: () => {
      if (!gridRef.current || isRunningRef.current) return;
      isRunningRef.current = true;
      setState(prev => ({ ...prev, isRunning: true }));
      lastFrameTimeRef.current = performance.now();
      frameCountRef.current = 0;
      runSimulation();
    },

    pause: () => {
      isRunningRef.current = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      setState(prev => ({ ...prev, isRunning: false }));
    },

    reset: () => {
      const grid = gridRef.current;
      if (!grid) return;

      grid.reset();
      grid.clear_materials();
      grid.place_pulse(GRID_SIZE / 2, GRID_SIZE / 2, 1.0);

      setState(prev => ({
        ...prev,
        timeStep: 0,
        energy: grid.get_total_energy(),
        isStable: true,
      }));

      // Trigger render update
      if (onFrameCallbackRef.current) {
        onFrameCallbackRef.current();
      }
    },

    step: () => {
      const grid = gridRef.current;
      if (!grid || isRunningRef.current) return;

      grid.add_soft_source(GRID_SIZE / 2, GRID_SIZE / 2, SOURCE_FREQUENCY, 0.5);
      grid.step();

      setState(prev => ({
        ...prev,
        timeStep: Number(grid.get_time_step()),
        energy: grid.get_total_energy(),
      }));

      if (onFrameCallbackRef.current) {
        onFrameCallbackRef.current();
      }
    },

    placePulse: (x?: number, y?: number) => {
      const grid = gridRef.current;
      if (!grid) return;

      const px = x ?? GRID_SIZE / 2;
      const py = y ?? GRID_SIZE / 2;
      grid.place_pulse(px, py, 1.0);

      if (onFrameCallbackRef.current) {
        onFrameCallbackRef.current();
      }
    },

    setPEC: (x: number, y: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.set_pec(x, y);
    },

    setMaterial: (x1: number, y1: number, x2: number, y2: number, epsilonR: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.set_material_region(x1, y1, x2, y2, epsilonR, 0.0);
    },

    // Brush painting API
    paintCircle: (cx: number, cy: number, radius: number, materialId: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.paint_circle(cx, cy, radius, materialId);
    },

    paintRect: (x1: number, y1: number, x2: number, y2: number, materialId: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.paint_rect(x1, y1, x2, y2, materialId);
    },

    paintLine: (x1: number, y1: number, x2: number, y2: number, brushSize: number, materialId: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.paint_line(x1, y1, x2, y2, brushSize, materialId);
    },

    clearMaterials: () => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.clear_materials();
      if (onFrameCallbackRef.current) {
        onFrameCallbackRef.current();
      }
    },

    loadPreset: (scenarioId: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.load_preset(scenarioId);
      if (onFrameCallbackRef.current) {
        onFrameCallbackRef.current();
      }
    },

    // Plane wave sources
    injectPlaneWaveX: (x: number, amplitude: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.inject_plane_wave_x(x, amplitude);
    },

    injectSinusoidalPlaneWave: (x: number, frequency: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.inject_sinusoidal_plane_wave(x, frequency);
    },

    injectGaussianPlaneWave: (x: number, t0: number, tau: number) => {
      const grid = gridRef.current;
      if (!grid) return;
      grid.inject_gaussian_plane_wave(x, t0, tau);
    },

    // Probe
    getFieldAt: (x: number, y: number): number => {
      const grid = gridRef.current;
      if (!grid) return 0;
      return grid.get_field_at(x, y);
    },

    // Energy monitoring
    getTotalEnergy: (): number => {
      const grid = gridRef.current;
      if (!grid) return 0;
      return grid.get_total_energy();
    },

  }), [runSimulation]);

  // Data access for renderer
  const data: SimulationData = {
    grid: gridRef.current,
    memory: memoryRef.current,
    width: GRID_SIZE,
    height: GRID_SIZE,
  };

  // Function to register frame callback
  const onFrame = useCallback((callback: () => void) => {
    onFrameCallbackRef.current = callback;
  }, []);

  return {
    state,
    controls,
    data,
    gridRef,
    memoryRef,
    onFrame,
  };
}
