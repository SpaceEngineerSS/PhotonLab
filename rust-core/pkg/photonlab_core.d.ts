/* tslint:disable */
/* eslint-disable */

/**
 * CPML boundary handler for 2D FDTD
 */
export class CPML {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get CPML thickness
     */
    get_thickness(): number;
    /**
     * Create new CPML boundaries for a grid
     */
    constructor(width: number, height: number, dt: number);
    /**
     * Reset all psi arrays to zero
     */
    reset(): void;
}

/**
 * FDTD Grid holding all electromagnetic field components
 *
 * Memory layout: Flat 1D arrays in row-major order for cache efficiency.
 * Field positions follow Yee staggering:
 * - Ez at integer grid points (i, j)
 * - Hx at (i, j+1/2)
 * - Hy at (i+1/2, j)
 */
export class FDTDGrid {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add sinusoidal soft source at location
     * frequency: normalized frequency (typical: 0.1 to 0.3)
     */
    add_soft_source(x: number, y: number, frequency: number, amplitude: number): void;
    /**
     * Apply simple absorbing boundary conditions (first-order Mur ABC)
     * This prevents waves from reflecting at edges
     */
    apply_abc(): void;
    /**
     * Clear only material settings (keep fields)
     */
    clear_materials(): void;
    /**
     * Get the Courant number (useful for source calibration)
     */
    static get_courant(): number;
    /**
     * Get the length of the Ez array (for JavaScript to create typed array view)
     */
    get_ez_len(): number;
    /**
     * Get raw pointer to Ez field data for zero-copy WebGL access
     *
     * # Safety
     * The returned pointer is valid only as long as this FDTDGrid exists
     * and no mutable operations are performed on the grid.
     */
    get_ez_ptr(): number;
    /**
     * Get Ez field value at a specific point
     */
    get_field_at(x: number, y: number): number;
    /**
     * Get grid height
     */
    get_height(): number;
    /**
     * Get material ID at a specific cell (for property inspector)
     */
    get_material_at(x: number, y: number): number;
    /**
     * Get scenario count
     */
    static get_scenario_count(): number;
    /**
     * Get current simulation time step
     */
    get_time_step(): bigint;
    /**
     * Calculate total electromagnetic energy in the grid
     * Useful for monitoring simulation stability
     */
    get_total_energy(): number;
    /**
     * Get grid width
     */
    get_width(): number;
    /**
     * Inject Gaussian pulse plane wave
     * t0: center time, tau: pulse width
     */
    inject_gaussian_plane_wave(x: number, t0: number, tau: number): void;
    /**
     * Inject a vertical plane wave (along constant x)
     * Uses soft source injection for clean wave fronts
     */
    inject_plane_wave_x(x: number, amplitude: number): void;
    /**
     * Inject a horizontal plane wave (along constant y)
     */
    inject_plane_wave_y(y: number, amplitude: number): void;
    /**
     * Inject sinusoidal plane wave at position x
     * frequency: normalized frequency (0.01-0.1 typical)
     */
    inject_sinusoidal_plane_wave(x: number, frequency: number): void;
    /**
     * Check if simulation has become unstable (NaN or Inf values)
     */
    is_stable(): boolean;
    /**
     * Load a preset scenario by ID
     * 0=Empty, 1=DoubleSlit, 2=Waveguide, 3=ParabolicReflector,
     * 4=TotalInternalReflection, 5=PhotonicCrystal, 6=Lens, 7=FresnelLens
     */
    load_preset(scenario_id: number): void;
    /**
     * Create a new FDTD grid with specified dimensions
     *
     * # Arguments
     * * `width` - Number of cells in x direction
     * * `height` - Number of cells in y direction
     */
    constructor(width: number, height: number);
    /**
     * Paint a filled circle with the specified material
     * Uses material_id: 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
     */
    paint_circle(cx: number, cy: number, radius: number, material_id: number): void;
    /**
     * Paint an axis-aligned ellipse with the specified material
     * Uses midpoint ellipse algorithm for rasterization
     */
    paint_ellipse(cx: number, cy: number, rx: number, ry: number, material_id: number): void;
    /**
     * Paint a line from (x1,y1) to (x2,y2) with specified brush size and material
     * Uses Bresenham's line algorithm for smooth lines
     */
    paint_line(x1: number, y1: number, x2: number, y2: number, brush_size: number, material_id: number): void;
    /**
     * Paint a filled rectangle with the specified material
     */
    paint_rect(x1: number, y1: number, x2: number, y2: number, material_id: number): void;
    /**
     * Place a Gaussian pulse at specified location
     * Useful for testing wave propagation
     */
    place_pulse(x: number, y: number, amplitude: number): void;
    /**
     * Reset the simulation to initial state
     */
    reset(): void;
    /**
     * Set a single cell's material by ID
     * 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
     */
    set_cell_material(x: number, y: number, material_id: number): void;
    /**
     * Set material properties in a rectangular region
     * epsilon_r: relative permittivity (1.0 = vacuum, 2.25 = glass, 4.0 = silicon)
     * sigma: conductivity (0.0 = lossless)
     */
    set_material_region(x1: number, y1: number, x2: number, y2: number, epsilon_r: number, sigma: number): void;
    /**
     * Set a single cell as perfect electric conductor (PEC/metal)
     * PEC forces Ez = 0 at this cell (perfect reflection)
     */
    set_pec(x: number, y: number): void;
    /**
     * Perform one complete FDTD time step
     * Order: H update -> E update -> Boundaries -> Sources
     */
    step(): void;
    /**
     * Run multiple time steps at once (for performance)
     */
    step_n(n: number): void;
    /**
     * Update electric field component (E-field update)
     *
     * Implements:
     * Ez(i,j) = ca(i,j) * Ez(i,j) + cb(i,j) * ((Hy(i,j) - Hy(i-1,j)) - (Hx(i,j) - Hx(i,j-1)))
     */
    update_e(): void;
    /**
     * Update magnetic field components (H-field update)
     *
     * Implements:
     * Hx(i,j) -= Courant * (Ez(i,j+1) - Ez(i,j))
     * Hy(i,j) += Courant * (Ez(i+1,j) - Ez(i,j))
     */
    update_h(): void;
}

/**
 * Gaussian Beam Source with spatial intensity profile
 * I(y) = I_0 * exp(-2(y-y_c)²/w²) where w is beam waist
 */
export class GaussianBeamSource {
    free(): void;
    [Symbol.dispose](): void;
    get_frequency(): number;
    /**
     * Get beam parameters for UI display
     */
    get_waist(): number;
    /**
     * Inject Gaussian beam into Ez field
     */
    inject(ez: Float32Array, t: number, width: number, height: number): void;
    constructor(x: number, y_center: number, waist: number, frequency: number, amplitude: number, courant: number);
    /**
     * Set center position
     */
    set_center(y_center: number): void;
    /**
     * Set beam waist (width at 1/e² intensity)
     */
    set_waist(waist: number): void;
}

/**
 * Material properties for electromagnetic simulation
 */
export class Material {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Create an absorbing material
     */
    static absorber(sigma: number): Material;
    /**
     * Check if this is a PEC material
     */
    is_pec(): boolean;
    /**
     * Create a new material with specified properties
     */
    constructor(epsilon_r: number, mu_r: number, sigma: number);
    /**
     * Create a PEC (Perfect Electric Conductor) material
     */
    static pec(): Material;
    /**
     * Relative permittivity (dielectric constant)
     * ε_r = 1.0 for vacuum, 2.25 for glass, 78 for water
     */
    epsilon_r: number;
    /**
     * Material type identifier for special handling
     */
    material_type: MaterialType;
    /**
     * Relative permeability (usually 1.0 for non-magnetic materials)
     */
    mu_r: number;
    /**
     * Electrical conductivity (S/m)
     * σ = 0 for perfect dielectrics, high for metals
     */
    sigma: number;
}

/**
 * Material ID constants for JavaScript interop
 */
export class MaterialPresets {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get Lossy material (absorber)
     * High conductivity causes wave attenuation
     */
    static absorber(): Material;
    /**
     * Get Air material (essentially vacuum, ε≈1)
     */
    static air(): Material;
    /**
     * Get Dense Glass/Crystal material (ε=4.0)
     * Wave speed = c/2
     */
    static crystal(): Material;
    /**
     * Get Glass material (ε=2.25)
     * Wave speed = c/1.5
     */
    static glass(): Material;
    /**
     * Get Metal (PEC) material
     * Perfect reflector - Ez forced to zero
     */
    static metal(): Material;
    /**
     * Get Silicon material (ε=11.7)
     */
    static silicon(): Material;
    /**
     * Get Strong Absorber for PML-like boundaries
     */
    static strong_absorber(): Material;
    /**
     * Get Vacuum material (ε=1, σ=0)
     */
    static vacuum(): Material;
    /**
     * Get Water material (ε=78, slight conductivity)
     * Extremely high dielectric constant
     */
    static water(): Material;
}

/**
 * Material type for special handling in physics engine
 */
export enum MaterialType {
    /**
     * Normal dielectric material
     */
    Dielectric = 0,
    /**
     * Perfect Electric Conductor (metal) - forces Ez = 0
     */
    PEC = 1,
    /**
     * Absorbing material for boundaries
     */
    Absorber = 2,
    /**
     * Source region - does not block fields
     */
    Source = 3,
}

/**
 * Phased Array Source for beamforming applications
 * E(t) = Σ A_n * sin(ωt + φ_n) where φ_n is the phase offset for element n
 */
export class PhasedArraySource {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get number of elements
     */
    get_element_count(): number;
    /**
     * Inject phased array into Ez field
     */
    inject(ez: Float32Array, t: number, width: number, height: number): void;
    /**
     * Create a linear phased array along y-axis at position x
     */
    constructor(x: number, y_start: number, num_elements: number, spacing: number, frequency: number, courant: number);
    /**
     * Set phase for a specific element (for beam steering)
     */
    set_element_phase(index: number, phase: number): void;
    /**
     * Set progressive phase shift for beam steering
     * delta_phi: phase difference between adjacent elements
     */
    set_progressive_phase(delta_phi: number): void;
}

/**
 * Plane wave source configuration
 */
export class PlaneWaveSource {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the position
     */
    get_position(): number;
    /**
     * Inject plane wave into Ez field at time step t
     * Uses Total-Field/Scattered-Field (TF/SF) formulation for clean injection
     */
    inject(ez: Float32Array, t: number, width: number, height: number): void;
    /**
     * Create a horizontal plane wave source at y = position
     */
    static new_horizontal(position: number, frequency: number, courant: number): PlaneWaveSource;
    /**
     * Create a new vertical plane wave source at x = position
     */
    constructor(position: number, frequency: number, courant: number);
    /**
     * Set to Gaussian pulse mode
     */
    set_gaussian(t0: number, tau: number): void;
}

/**
 * Probe for measuring field values at a specific point
 */
export class Probe {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Clear the buffer
     */
    clear(): void;
    /**
     * Get the recorded buffer for visualization
     * Returns values in chronological order (oldest first)
     */
    get_buffer_ptr(): number;
    /**
     * Get buffer size
     */
    get_buffer_size(): number;
    /**
     * Get the most recent value
     */
    get_current_value(): number;
    /**
     * Get write position for proper buffer reading
     */
    get_write_pos(): number;
    /**
     * Get probe X position
     */
    get_x(): number;
    /**
     * Get probe Y position
     */
    get_y(): number;
    /**
     * Create a new probe at position (x, y)
     */
    constructor(x: number, y: number, buffer_size: number);
    /**
     * Record current field value
     */
    record(ez: Float32Array, width: number): void;
    /**
     * Set probe position
     */
    set_position(x: number, y: number): void;
}

/**
 * Scenario preset IDs
 */
export enum ScenarioId {
    /**
     * Empty grid - just vacuum
     */
    Empty = 0,
    /**
     * Double slit diffraction experiment
     */
    DoubleSlit = 1,
    /**
     * Dielectric waveguide (bent fiber optic)
     */
    Waveguide = 2,
    /**
     * Parabolic metal reflector with point source
     */
    ParabolicReflector = 3,
    /**
     * Glass prism demonstrating total internal reflection
     */
    TotalInternalReflection = 4,
    /**
     * Photonic crystal lattice
     */
    PhotonicCrystal = 5,
    /**
     * Lens focusing demonstration
     */
    Lens = 6,
    /**
     * Fresnel zone plate lens
     */
    FresnelLens = 7,
}

/**
 * Single element in a phased array
 */
export class SourceElement {
    free(): void;
    [Symbol.dispose](): void;
    constructor(x: number, y: number, phase_offset: number, amplitude: number);
    amplitude: number;
    phase_offset: number;
    x: number;
    y: number;
}

/**
 * Time-domain source function
 */
export class SourceFunction {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Evaluate source function at time t
     */
    evaluate(t: number): number;
    /**
     * Get amplitude
     */
    get_amplitude(): number;
    /**
     * Create a Gaussian pulse source
     * t0: center time (in time steps)
     * tau: pulse width (in time steps)
     */
    static new_gaussian(t0: number, tau: number, amplitude: number): SourceFunction;
    /**
     * Create a modulated Gaussian (Gaussian envelope with carrier)
     */
    static new_modulated_gaussian(frequency: number, t0: number, tau: number, amplitude: number): SourceFunction;
    /**
     * Create a Ricker wavelet (second derivative of Gaussian)
     */
    static new_ricker(t0: number, tau: number, amplitude: number): SourceFunction;
    /**
     * Create a continuous sinusoidal source
     */
    constructor(frequency: number, amplitude: number);
    /**
     * Set amplitude
     */
    set_amplitude(amplitude: number): void;
    /**
     * Source waveform type
     */
    waveform: Waveform;
}

/**
 * Source type enumeration
 */
export enum SourceType {
    /**
     * Single point continuous sinusoidal
     */
    PointContinuous = 0,
    /**
     * Single point Gaussian pulse
     */
    PointGaussian = 1,
    /**
     * Plane wave along vertical line
     */
    PlaneWaveX = 2,
    /**
     * Plane wave along horizontal line
     */
    PlaneWaveY = 3,
    /**
     * Soft source (additive)
     */
    Soft = 4,
    /**
     * Hard source (replacement)
     */
    Hard = 5,
}

/**
 * Spectrum Analyzer using FFT for frequency domain analysis
 * Uses Hann windowing to reduce spectral leakage
 */
export class SpectrumAnalyzer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Convert bin index to normalized frequency
     */
    bin_to_frequency(bin: number): number;
    /**
     * Compute spectrum from time-domain samples
     * Returns magnitude in dB (20 * log10(|X|))
     */
    compute(samples: Float32Array): Float32Array;
    /**
     * Find peak frequency bin
     */
    find_peak_bin(): number;
    /**
     * Get FFT size
     */
    get_size(): number;
    /**
     * Get spectrum pointer for JS access
     */
    get_spectrum_ptr(): number;
    /**
     * Get spectrum size (N/2 bins)
     */
    get_spectrum_size(): number;
    /**
     * Create a new spectrum analyzer
     * size: FFT size (should be power of 2, e.g., 256, 512, 1024)
     */
    constructor(size: number);
}

/**
 * Waveform types
 */
export enum Waveform {
    /**
     * Continuous sinusoidal: sin(2πft)
     */
    Sinusoidal = 0,
    /**
     * Gaussian pulse: exp(-((t-t0)/τ)²)
     */
    Gaussian = 1,
    /**
     * Modulated Gaussian: sin(2πft) * exp(-((t-t0)/τ)²)
     */
    ModulatedGaussian = 2,
    /**
     * Ricker wavelet (Mexican hat)
     */
    Ricker = 3,
    /**
     * Step function
     */
    Step = 4,
}

/**
 * Helper function to create a Gaussian pulse at specific parameters
 */
export function gaussian_pulse(t: number, t0: number, tau: number): number;

/**
 * Get material by ID (for JavaScript interop)
 * 0 = Vacuum, 1 = Glass, 2 = Water, 3 = Metal, 4 = Absorber, 5 = Crystal, 6 = Silicon
 */
export function get_material_by_id(id: number): Material;

/**
 * Get material name by ID
 */
export function get_material_name(id: number): string;

/**
 * Get scenario description
 */
export function get_scenario_description(id: number): string;

/**
 * Get scenario name by ID
 */
export function get_scenario_name(id: number): string;

/**
 * Get library version string
 */
export function get_version(): string;

/**
 * Get WebAssembly memory for zero-copy array access
 * JavaScript can create Float32Array views over this memory
 */
export function get_wasm_memory(): any;

/**
 * Initialize the Wasm module (call once at startup)
 */
export function init(): void;

/**
 * Helper function for modulated Gaussian
 */
export function modulated_gaussian(t: number, frequency: number, t0: number, tau: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_sourcefunction_free: (a: number, b: number) => void;
    readonly __wbg_get_sourcefunction_waveform: (a: number) => number;
    readonly __wbg_set_sourcefunction_waveform: (a: number, b: number) => void;
    readonly sourcefunction_new_sinusoidal: (a: number, b: number) => number;
    readonly sourcefunction_new_gaussian: (a: number, b: number, c: number) => number;
    readonly sourcefunction_new_modulated_gaussian: (a: number, b: number, c: number, d: number) => number;
    readonly sourcefunction_new_ricker: (a: number, b: number, c: number) => number;
    readonly sourcefunction_evaluate: (a: number, b: number) => number;
    readonly sourcefunction_set_amplitude: (a: number, b: number) => void;
    readonly __wbg_planewavesource_free: (a: number, b: number) => void;
    readonly planewavesource_new_vertical: (a: number, b: number, c: number) => number;
    readonly planewavesource_new_horizontal: (a: number, b: number, c: number) => number;
    readonly planewavesource_get_position: (a: number) => number;
    readonly planewavesource_set_gaussian: (a: number, b: number, c: number) => void;
    readonly planewavesource_inject: (a: number, b: number, c: number, d: any, e: number, f: number, g: number) => void;
    readonly __wbg_sourceelement_free: (a: number, b: number) => void;
    readonly __wbg_get_sourceelement_x: (a: number) => number;
    readonly __wbg_set_sourceelement_x: (a: number, b: number) => void;
    readonly __wbg_get_sourceelement_y: (a: number) => number;
    readonly __wbg_set_sourceelement_y: (a: number, b: number) => void;
    readonly __wbg_get_sourceelement_phase_offset: (a: number) => number;
    readonly __wbg_set_sourceelement_phase_offset: (a: number, b: number) => void;
    readonly __wbg_get_sourceelement_amplitude: (a: number) => number;
    readonly __wbg_set_sourceelement_amplitude: (a: number, b: number) => void;
    readonly sourceelement_new: (a: number, b: number, c: number, d: number) => number;
    readonly __wbg_phasedarraysource_free: (a: number, b: number) => void;
    readonly phasedarraysource_new_linear: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly phasedarraysource_set_element_phase: (a: number, b: number, c: number) => void;
    readonly phasedarraysource_set_progressive_phase: (a: number, b: number) => void;
    readonly phasedarraysource_get_element_count: (a: number) => number;
    readonly phasedarraysource_inject: (a: number, b: number, c: number, d: any, e: number, f: number, g: number) => void;
    readonly __wbg_gaussianbeamsource_free: (a: number, b: number) => void;
    readonly gaussianbeamsource_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly gaussianbeamsource_set_waist: (a: number, b: number) => void;
    readonly gaussianbeamsource_set_center: (a: number, b: number) => void;
    readonly gaussianbeamsource_inject: (a: number, b: number, c: number, d: any, e: number, f: number, g: number) => void;
    readonly gaussianbeamsource_get_waist: (a: number) => number;
    readonly gaussianbeamsource_get_frequency: (a: number) => number;
    readonly __wbg_probe_free: (a: number, b: number) => void;
    readonly probe_new: (a: number, b: number, c: number) => number;
    readonly probe_get_x: (a: number) => number;
    readonly probe_get_y: (a: number) => number;
    readonly probe_set_position: (a: number, b: number, c: number) => void;
    readonly probe_record: (a: number, b: number, c: number, d: number) => void;
    readonly probe_get_buffer_ptr: (a: number) => number;
    readonly probe_get_buffer_size: (a: number) => number;
    readonly probe_get_current_value: (a: number) => number;
    readonly probe_clear: (a: number) => void;
    readonly __wbg_spectrumanalyzer_free: (a: number, b: number) => void;
    readonly spectrumanalyzer_new: (a: number) => number;
    readonly spectrumanalyzer_get_size: (a: number) => number;
    readonly spectrumanalyzer_get_spectrum_size: (a: number) => number;
    readonly spectrumanalyzer_compute: (a: number, b: number, c: number) => [number, number];
    readonly spectrumanalyzer_get_spectrum_ptr: (a: number) => number;
    readonly spectrumanalyzer_find_peak_bin: (a: number) => number;
    readonly spectrumanalyzer_bin_to_frequency: (a: number, b: number) => number;
    readonly gaussian_pulse: (a: number, b: number, c: number) => number;
    readonly modulated_gaussian: (a: number, b: number, c: number, d: number) => number;
    readonly sourcefunction_get_amplitude: (a: number) => number;
    readonly probe_get_write_pos: (a: number) => number;
    readonly get_scenario_name: (a: number) => [number, number];
    readonly get_scenario_description: (a: number) => [number, number];
    readonly get_version: () => [number, number];
    readonly get_wasm_memory: () => any;
    readonly init: () => void;
    readonly __wbg_fdtdgrid_free: (a: number, b: number) => void;
    readonly fdtdgrid_new: (a: number, b: number) => number;
    readonly fdtdgrid_get_width: (a: number) => number;
    readonly fdtdgrid_get_height: (a: number) => number;
    readonly fdtdgrid_get_time_step: (a: number) => bigint;
    readonly fdtdgrid_get_ez_ptr: (a: number) => number;
    readonly fdtdgrid_get_ez_len: (a: number) => number;
    readonly fdtdgrid_get_total_energy: (a: number) => number;
    readonly fdtdgrid_is_stable: (a: number) => number;
    readonly fdtdgrid_update_h: (a: number) => void;
    readonly fdtdgrid_update_e: (a: number) => void;
    readonly fdtdgrid_apply_abc: (a: number) => void;
    readonly fdtdgrid_step: (a: number) => void;
    readonly fdtdgrid_step_n: (a: number, b: number) => void;
    readonly fdtdgrid_place_pulse: (a: number, b: number, c: number, d: number) => void;
    readonly fdtdgrid_add_soft_source: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fdtdgrid_set_material_region: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly fdtdgrid_set_pec: (a: number, b: number, c: number) => void;
    readonly fdtdgrid_reset: (a: number) => void;
    readonly fdtdgrid_clear_materials: (a: number) => void;
    readonly fdtdgrid_paint_circle: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fdtdgrid_paint_rect: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly fdtdgrid_set_cell_material: (a: number, b: number, c: number, d: number) => void;
    readonly fdtdgrid_paint_line: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly fdtdgrid_paint_ellipse: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly fdtdgrid_get_material_at: (a: number, b: number, c: number) => number;
    readonly fdtdgrid_load_preset: (a: number, b: number) => void;
    readonly fdtdgrid_get_scenario_count: () => number;
    readonly fdtdgrid_inject_plane_wave_x: (a: number, b: number, c: number) => void;
    readonly fdtdgrid_inject_plane_wave_y: (a: number, b: number, c: number) => void;
    readonly fdtdgrid_inject_sinusoidal_plane_wave: (a: number, b: number, c: number) => void;
    readonly fdtdgrid_inject_gaussian_plane_wave: (a: number, b: number, c: number, d: number) => void;
    readonly fdtdgrid_get_field_at: (a: number, b: number, c: number) => number;
    readonly fdtdgrid_get_courant: () => number;
    readonly __wbg_cpml_free: (a: number, b: number) => void;
    readonly cpml_new: (a: number, b: number, c: number) => number;
    readonly cpml_get_thickness: (a: number) => number;
    readonly cpml_reset: (a: number) => void;
    readonly __wbg_material_free: (a: number, b: number) => void;
    readonly __wbg_get_material_epsilon_r: (a: number) => number;
    readonly __wbg_set_material_epsilon_r: (a: number, b: number) => void;
    readonly __wbg_get_material_mu_r: (a: number) => number;
    readonly __wbg_set_material_mu_r: (a: number, b: number) => void;
    readonly __wbg_get_material_sigma: (a: number) => number;
    readonly __wbg_set_material_sigma: (a: number, b: number) => void;
    readonly __wbg_get_material_material_type: (a: number) => number;
    readonly __wbg_set_material_material_type: (a: number, b: number) => void;
    readonly material_new: (a: number, b: number, c: number) => number;
    readonly material_pec: () => number;
    readonly material_absorber: (a: number) => number;
    readonly material_is_pec: (a: number) => number;
    readonly __wbg_materialpresets_free: (a: number, b: number) => void;
    readonly materialpresets_vacuum: () => number;
    readonly materialpresets_air: () => number;
    readonly materialpresets_glass: () => number;
    readonly materialpresets_crystal: () => number;
    readonly materialpresets_water: () => number;
    readonly materialpresets_silicon: () => number;
    readonly materialpresets_absorber: () => number;
    readonly materialpresets_strong_absorber: () => number;
    readonly get_material_by_id: (a: number) => number;
    readonly get_material_name: (a: number) => [number, number];
    readonly materialpresets_metal: () => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
