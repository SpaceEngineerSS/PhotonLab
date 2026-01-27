/* @ts-self-types="./photonlab_core.d.ts" */

/**
 * CPML boundary handler for 2D FDTD
 */
export class CPML {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CPMLFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cpml_free(ptr, 0);
    }
    /**
     * Get CPML thickness
     * @returns {number}
     */
    get_thickness() {
        const ret = wasm.cpml_get_thickness(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create new CPML boundaries for a grid
     * @param {number} width
     * @param {number} height
     * @param {number} dt
     */
    constructor(width, height, dt) {
        const ret = wasm.cpml_new(width, height, dt);
        this.__wbg_ptr = ret >>> 0;
        CPMLFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Reset all psi arrays to zero
     */
    reset() {
        wasm.cpml_reset(this.__wbg_ptr);
    }
}
if (Symbol.dispose) CPML.prototype[Symbol.dispose] = CPML.prototype.free;

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
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FDTDGridFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fdtdgrid_free(ptr, 0);
    }
    /**
     * Add sinusoidal soft source at location
     * frequency: normalized frequency (typical: 0.1 to 0.3)
     * @param {number} x
     * @param {number} y
     * @param {number} frequency
     * @param {number} amplitude
     */
    add_soft_source(x, y, frequency, amplitude) {
        wasm.fdtdgrid_add_soft_source(this.__wbg_ptr, x, y, frequency, amplitude);
    }
    /**
     * Apply simple absorbing boundary conditions (first-order Mur ABC)
     * This prevents waves from reflecting at edges
     */
    apply_abc() {
        wasm.fdtdgrid_apply_abc(this.__wbg_ptr);
    }
    /**
     * Clear only material settings (keep fields)
     */
    clear_materials() {
        wasm.fdtdgrid_clear_materials(this.__wbg_ptr);
    }
    /**
     * Get the Courant number (useful for source calibration)
     * @returns {number}
     */
    static get_courant() {
        const ret = wasm.fdtdgrid_get_courant();
        return ret;
    }
    /**
     * Get the length of the Ez array (for JavaScript to create typed array view)
     * @returns {number}
     */
    get_ez_len() {
        const ret = wasm.fdtdgrid_get_ez_len(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get raw pointer to Ez field data for zero-copy WebGL access
     *
     * # Safety
     * The returned pointer is valid only as long as this FDTDGrid exists
     * and no mutable operations are performed on the grid.
     * @returns {number}
     */
    get_ez_ptr() {
        const ret = wasm.fdtdgrid_get_ez_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get Ez field value at a specific point
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    get_field_at(x, y) {
        const ret = wasm.fdtdgrid_get_field_at(this.__wbg_ptr, x, y);
        return ret;
    }
    /**
     * Get grid height
     * @returns {number}
     */
    get_height() {
        const ret = wasm.fdtdgrid_get_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get material ID at a specific cell (for property inspector)
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    get_material_at(x, y) {
        const ret = wasm.fdtdgrid_get_material_at(this.__wbg_ptr, x, y);
        return ret >>> 0;
    }
    /**
     * Get scenario count
     * @returns {number}
     */
    static get_scenario_count() {
        const ret = wasm.fdtdgrid_get_scenario_count();
        return ret;
    }
    /**
     * Get current simulation time step
     * @returns {bigint}
     */
    get_time_step() {
        const ret = wasm.fdtdgrid_get_time_step(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Calculate total electromagnetic energy in the grid
     * Useful for monitoring simulation stability
     * @returns {number}
     */
    get_total_energy() {
        const ret = wasm.fdtdgrid_get_total_energy(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get grid width
     * @returns {number}
     */
    get_width() {
        const ret = wasm.fdtdgrid_get_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Inject Gaussian pulse plane wave
     * t0: center time, tau: pulse width
     * @param {number} x
     * @param {number} t0
     * @param {number} tau
     */
    inject_gaussian_plane_wave(x, t0, tau) {
        wasm.fdtdgrid_inject_gaussian_plane_wave(this.__wbg_ptr, x, t0, tau);
    }
    /**
     * Inject a vertical plane wave (along constant x)
     * Uses soft source injection for clean wave fronts
     * @param {number} x
     * @param {number} amplitude
     */
    inject_plane_wave_x(x, amplitude) {
        wasm.fdtdgrid_inject_plane_wave_x(this.__wbg_ptr, x, amplitude);
    }
    /**
     * Inject a horizontal plane wave (along constant y)
     * @param {number} y
     * @param {number} amplitude
     */
    inject_plane_wave_y(y, amplitude) {
        wasm.fdtdgrid_inject_plane_wave_y(this.__wbg_ptr, y, amplitude);
    }
    /**
     * Inject sinusoidal plane wave at position x
     * frequency: normalized frequency (0.01-0.1 typical)
     * @param {number} x
     * @param {number} frequency
     */
    inject_sinusoidal_plane_wave(x, frequency) {
        wasm.fdtdgrid_inject_sinusoidal_plane_wave(this.__wbg_ptr, x, frequency);
    }
    /**
     * Check if simulation has become unstable (NaN or Inf values)
     * @returns {boolean}
     */
    is_stable() {
        const ret = wasm.fdtdgrid_is_stable(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Load a preset scenario by ID
     * 0=Empty, 1=DoubleSlit, 2=Waveguide, 3=ParabolicReflector,
     * 4=TotalInternalReflection, 5=PhotonicCrystal, 6=Lens, 7=FresnelLens
     * @param {number} scenario_id
     */
    load_preset(scenario_id) {
        wasm.fdtdgrid_load_preset(this.__wbg_ptr, scenario_id);
    }
    /**
     * Create a new FDTD grid with specified dimensions
     *
     * # Arguments
     * * `width` - Number of cells in x direction
     * * `height` - Number of cells in y direction
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        const ret = wasm.fdtdgrid_new(width, height);
        this.__wbg_ptr = ret >>> 0;
        FDTDGridFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Paint a filled circle with the specified material
     * Uses material_id: 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @param {number} material_id
     */
    paint_circle(cx, cy, radius, material_id) {
        wasm.fdtdgrid_paint_circle(this.__wbg_ptr, cx, cy, radius, material_id);
    }
    /**
     * Paint an axis-aligned ellipse with the specified material
     * Uses midpoint ellipse algorithm for rasterization
     * @param {number} cx
     * @param {number} cy
     * @param {number} rx
     * @param {number} ry
     * @param {number} material_id
     */
    paint_ellipse(cx, cy, rx, ry, material_id) {
        wasm.fdtdgrid_paint_ellipse(this.__wbg_ptr, cx, cy, rx, ry, material_id);
    }
    /**
     * Paint a line from (x1,y1) to (x2,y2) with specified brush size and material
     * Uses Bresenham's line algorithm for smooth lines
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} brush_size
     * @param {number} material_id
     */
    paint_line(x1, y1, x2, y2, brush_size, material_id) {
        wasm.fdtdgrid_paint_line(this.__wbg_ptr, x1, y1, x2, y2, brush_size, material_id);
    }
    /**
     * Paint a filled rectangle with the specified material
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} material_id
     */
    paint_rect(x1, y1, x2, y2, material_id) {
        wasm.fdtdgrid_paint_rect(this.__wbg_ptr, x1, y1, x2, y2, material_id);
    }
    /**
     * Place a Gaussian pulse at specified location
     * Useful for testing wave propagation
     * @param {number} x
     * @param {number} y
     * @param {number} amplitude
     */
    place_pulse(x, y, amplitude) {
        wasm.fdtdgrid_place_pulse(this.__wbg_ptr, x, y, amplitude);
    }
    /**
     * Reset the simulation to initial state
     */
    reset() {
        wasm.fdtdgrid_reset(this.__wbg_ptr);
    }
    /**
     * Set a single cell's material by ID
     * 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
     * @param {number} x
     * @param {number} y
     * @param {number} material_id
     */
    set_cell_material(x, y, material_id) {
        wasm.fdtdgrid_set_cell_material(this.__wbg_ptr, x, y, material_id);
    }
    /**
     * Set material properties in a rectangular region
     * epsilon_r: relative permittivity (1.0 = vacuum, 2.25 = glass, 4.0 = silicon)
     * sigma: conductivity (0.0 = lossless)
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} epsilon_r
     * @param {number} sigma
     */
    set_material_region(x1, y1, x2, y2, epsilon_r, sigma) {
        wasm.fdtdgrid_set_material_region(this.__wbg_ptr, x1, y1, x2, y2, epsilon_r, sigma);
    }
    /**
     * Set a single cell as perfect electric conductor (PEC/metal)
     * PEC forces Ez = 0 at this cell (perfect reflection)
     * @param {number} x
     * @param {number} y
     */
    set_pec(x, y) {
        wasm.fdtdgrid_set_pec(this.__wbg_ptr, x, y);
    }
    /**
     * Perform one complete FDTD time step
     * Order: H update -> E update -> Boundaries -> Sources
     */
    step() {
        wasm.fdtdgrid_step(this.__wbg_ptr);
    }
    /**
     * Run multiple time steps at once (for performance)
     * @param {number} n
     */
    step_n(n) {
        wasm.fdtdgrid_step_n(this.__wbg_ptr, n);
    }
    /**
     * Update electric field component (E-field update)
     *
     * Implements:
     * Ez(i,j) = ca(i,j) * Ez(i,j) + cb(i,j) * ((Hy(i,j) - Hy(i-1,j)) - (Hx(i,j) - Hx(i,j-1)))
     */
    update_e() {
        wasm.fdtdgrid_update_e(this.__wbg_ptr);
    }
    /**
     * Update magnetic field components (H-field update)
     *
     * Implements:
     * Hx(i,j) -= Courant * (Ez(i,j+1) - Ez(i,j))
     * Hy(i,j) += Courant * (Ez(i+1,j) - Ez(i,j))
     */
    update_h() {
        wasm.fdtdgrid_update_h(this.__wbg_ptr);
    }
}
if (Symbol.dispose) FDTDGrid.prototype[Symbol.dispose] = FDTDGrid.prototype.free;

/**
 * Gaussian Beam Source with spatial intensity profile
 * I(y) = I_0 * exp(-2(y-y_c)²/w²) where w is beam waist
 */
export class GaussianBeamSource {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GaussianBeamSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gaussianbeamsource_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get_frequency() {
        const ret = wasm.gaussianbeamsource_get_frequency(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get beam parameters for UI display
     * @returns {number}
     */
    get_waist() {
        const ret = wasm.gaussianbeamsource_get_waist(this.__wbg_ptr);
        return ret;
    }
    /**
     * Inject Gaussian beam into Ez field
     * @param {Float32Array} ez
     * @param {number} t
     * @param {number} width
     * @param {number} height
     */
    inject(ez, t, width, height) {
        var ptr0 = passArrayF32ToWasm0(ez, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.gaussianbeamsource_inject(this.__wbg_ptr, ptr0, len0, ez, t, width, height);
    }
    /**
     * @param {number} x
     * @param {number} y_center
     * @param {number} waist
     * @param {number} frequency
     * @param {number} amplitude
     * @param {number} courant
     */
    constructor(x, y_center, waist, frequency, amplitude, courant) {
        const ret = wasm.gaussianbeamsource_new(x, y_center, waist, frequency, amplitude, courant);
        this.__wbg_ptr = ret >>> 0;
        GaussianBeamSourceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set center position
     * @param {number} y_center
     */
    set_center(y_center) {
        wasm.gaussianbeamsource_set_center(this.__wbg_ptr, y_center);
    }
    /**
     * Set beam waist (width at 1/e² intensity)
     * @param {number} waist
     */
    set_waist(waist) {
        wasm.gaussianbeamsource_set_waist(this.__wbg_ptr, waist);
    }
}
if (Symbol.dispose) GaussianBeamSource.prototype[Symbol.dispose] = GaussianBeamSource.prototype.free;

/**
 * Material properties for electromagnetic simulation
 */
export class Material {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Material.prototype);
        obj.__wbg_ptr = ptr;
        MaterialFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MaterialFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_material_free(ptr, 0);
    }
    /**
     * Relative permittivity (dielectric constant)
     * ε_r = 1.0 for vacuum, 2.25 for glass, 78 for water
     * @returns {number}
     */
    get epsilon_r() {
        const ret = wasm.__wbg_get_material_epsilon_r(this.__wbg_ptr);
        return ret;
    }
    /**
     * Material type identifier for special handling
     * @returns {MaterialType}
     */
    get material_type() {
        const ret = wasm.__wbg_get_material_material_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * Relative permeability (usually 1.0 for non-magnetic materials)
     * @returns {number}
     */
    get mu_r() {
        const ret = wasm.__wbg_get_material_mu_r(this.__wbg_ptr);
        return ret;
    }
    /**
     * Electrical conductivity (S/m)
     * σ = 0 for perfect dielectrics, high for metals
     * @returns {number}
     */
    get sigma() {
        const ret = wasm.__wbg_get_material_sigma(this.__wbg_ptr);
        return ret;
    }
    /**
     * Create an absorbing material
     * @param {number} sigma
     * @returns {Material}
     */
    static absorber(sigma) {
        const ret = wasm.material_absorber(sigma);
        return Material.__wrap(ret);
    }
    /**
     * Check if this is a PEC material
     * @returns {boolean}
     */
    is_pec() {
        const ret = wasm.material_is_pec(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Create a new material with specified properties
     * @param {number} epsilon_r
     * @param {number} mu_r
     * @param {number} sigma
     */
    constructor(epsilon_r, mu_r, sigma) {
        const ret = wasm.material_new(epsilon_r, mu_r, sigma);
        this.__wbg_ptr = ret >>> 0;
        MaterialFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create a PEC (Perfect Electric Conductor) material
     * @returns {Material}
     */
    static pec() {
        const ret = wasm.material_pec();
        return Material.__wrap(ret);
    }
    /**
     * Relative permittivity (dielectric constant)
     * ε_r = 1.0 for vacuum, 2.25 for glass, 78 for water
     * @param {number} arg0
     */
    set epsilon_r(arg0) {
        wasm.__wbg_set_material_epsilon_r(this.__wbg_ptr, arg0);
    }
    /**
     * Material type identifier for special handling
     * @param {MaterialType} arg0
     */
    set material_type(arg0) {
        wasm.__wbg_set_material_material_type(this.__wbg_ptr, arg0);
    }
    /**
     * Relative permeability (usually 1.0 for non-magnetic materials)
     * @param {number} arg0
     */
    set mu_r(arg0) {
        wasm.__wbg_set_material_mu_r(this.__wbg_ptr, arg0);
    }
    /**
     * Electrical conductivity (S/m)
     * σ = 0 for perfect dielectrics, high for metals
     * @param {number} arg0
     */
    set sigma(arg0) {
        wasm.__wbg_set_material_sigma(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) Material.prototype[Symbol.dispose] = Material.prototype.free;

/**
 * Material ID constants for JavaScript interop
 */
export class MaterialPresets {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MaterialPresetsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_materialpresets_free(ptr, 0);
    }
    /**
     * Get Lossy material (absorber)
     * High conductivity causes wave attenuation
     * @returns {Material}
     */
    static absorber() {
        const ret = wasm.materialpresets_absorber();
        return Material.__wrap(ret);
    }
    /**
     * Get Air material (essentially vacuum, ε≈1)
     * @returns {Material}
     */
    static air() {
        const ret = wasm.materialpresets_air();
        return Material.__wrap(ret);
    }
    /**
     * Get Dense Glass/Crystal material (ε=4.0)
     * Wave speed = c/2
     * @returns {Material}
     */
    static crystal() {
        const ret = wasm.materialpresets_crystal();
        return Material.__wrap(ret);
    }
    /**
     * Get Glass material (ε=2.25)
     * Wave speed = c/1.5
     * @returns {Material}
     */
    static glass() {
        const ret = wasm.materialpresets_glass();
        return Material.__wrap(ret);
    }
    /**
     * Get Metal (PEC) material
     * Perfect reflector - Ez forced to zero
     * @returns {Material}
     */
    static metal() {
        const ret = wasm.material_pec();
        return Material.__wrap(ret);
    }
    /**
     * Get Silicon material (ε=11.7)
     * @returns {Material}
     */
    static silicon() {
        const ret = wasm.materialpresets_silicon();
        return Material.__wrap(ret);
    }
    /**
     * Get Strong Absorber for PML-like boundaries
     * @returns {Material}
     */
    static strong_absorber() {
        const ret = wasm.materialpresets_strong_absorber();
        return Material.__wrap(ret);
    }
    /**
     * Get Vacuum material (ε=1, σ=0)
     * @returns {Material}
     */
    static vacuum() {
        const ret = wasm.materialpresets_vacuum();
        return Material.__wrap(ret);
    }
    /**
     * Get Water material (ε=78, slight conductivity)
     * Extremely high dielectric constant
     * @returns {Material}
     */
    static water() {
        const ret = wasm.materialpresets_water();
        return Material.__wrap(ret);
    }
}
if (Symbol.dispose) MaterialPresets.prototype[Symbol.dispose] = MaterialPresets.prototype.free;

/**
 * Material type for special handling in physics engine
 * @enum {0 | 1 | 2 | 3}
 */
export const MaterialType = Object.freeze({
    /**
     * Normal dielectric material
     */
    Dielectric: 0, "0": "Dielectric",
    /**
     * Perfect Electric Conductor (metal) - forces Ez = 0
     */
    PEC: 1, "1": "PEC",
    /**
     * Absorbing material for boundaries
     */
    Absorber: 2, "2": "Absorber",
    /**
     * Source region - does not block fields
     */
    Source: 3, "3": "Source",
});

/**
 * Phased Array Source for beamforming applications
 * E(t) = Σ A_n * sin(ωt + φ_n) where φ_n is the phase offset for element n
 */
export class PhasedArraySource {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PhasedArraySourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_phasedarraysource_free(ptr, 0);
    }
    /**
     * Get number of elements
     * @returns {number}
     */
    get_element_count() {
        const ret = wasm.phasedarraysource_get_element_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Inject phased array into Ez field
     * @param {Float32Array} ez
     * @param {number} t
     * @param {number} width
     * @param {number} height
     */
    inject(ez, t, width, height) {
        var ptr0 = passArrayF32ToWasm0(ez, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.phasedarraysource_inject(this.__wbg_ptr, ptr0, len0, ez, t, width, height);
    }
    /**
     * Create a linear phased array along y-axis at position x
     * @param {number} x
     * @param {number} y_start
     * @param {number} num_elements
     * @param {number} spacing
     * @param {number} frequency
     * @param {number} courant
     */
    constructor(x, y_start, num_elements, spacing, frequency, courant) {
        const ret = wasm.phasedarraysource_new_linear(x, y_start, num_elements, spacing, frequency, courant);
        this.__wbg_ptr = ret >>> 0;
        PhasedArraySourceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set phase for a specific element (for beam steering)
     * @param {number} index
     * @param {number} phase
     */
    set_element_phase(index, phase) {
        wasm.phasedarraysource_set_element_phase(this.__wbg_ptr, index, phase);
    }
    /**
     * Set progressive phase shift for beam steering
     * delta_phi: phase difference between adjacent elements
     * @param {number} delta_phi
     */
    set_progressive_phase(delta_phi) {
        wasm.phasedarraysource_set_progressive_phase(this.__wbg_ptr, delta_phi);
    }
}
if (Symbol.dispose) PhasedArraySource.prototype[Symbol.dispose] = PhasedArraySource.prototype.free;

/**
 * Plane wave source configuration
 */
export class PlaneWaveSource {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PlaneWaveSource.prototype);
        obj.__wbg_ptr = ptr;
        PlaneWaveSourceFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlaneWaveSourceFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_planewavesource_free(ptr, 0);
    }
    /**
     * Get the position
     * @returns {number}
     */
    get_position() {
        const ret = wasm.planewavesource_get_position(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Inject plane wave into Ez field at time step t
     * Uses Total-Field/Scattered-Field (TF/SF) formulation for clean injection
     * @param {Float32Array} ez
     * @param {number} t
     * @param {number} width
     * @param {number} height
     */
    inject(ez, t, width, height) {
        var ptr0 = passArrayF32ToWasm0(ez, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.planewavesource_inject(this.__wbg_ptr, ptr0, len0, ez, t, width, height);
    }
    /**
     * Create a horizontal plane wave source at y = position
     * @param {number} position
     * @param {number} frequency
     * @param {number} courant
     * @returns {PlaneWaveSource}
     */
    static new_horizontal(position, frequency, courant) {
        const ret = wasm.planewavesource_new_horizontal(position, frequency, courant);
        return PlaneWaveSource.__wrap(ret);
    }
    /**
     * Create a new vertical plane wave source at x = position
     * @param {number} position
     * @param {number} frequency
     * @param {number} courant
     */
    constructor(position, frequency, courant) {
        const ret = wasm.planewavesource_new_vertical(position, frequency, courant);
        this.__wbg_ptr = ret >>> 0;
        PlaneWaveSourceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set to Gaussian pulse mode
     * @param {number} t0
     * @param {number} tau
     */
    set_gaussian(t0, tau) {
        wasm.planewavesource_set_gaussian(this.__wbg_ptr, t0, tau);
    }
}
if (Symbol.dispose) PlaneWaveSource.prototype[Symbol.dispose] = PlaneWaveSource.prototype.free;

/**
 * Probe for measuring field values at a specific point
 */
export class Probe {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ProbeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_probe_free(ptr, 0);
    }
    /**
     * Clear the buffer
     */
    clear() {
        wasm.probe_clear(this.__wbg_ptr);
    }
    /**
     * Get the recorded buffer for visualization
     * Returns values in chronological order (oldest first)
     * @returns {number}
     */
    get_buffer_ptr() {
        const ret = wasm.probe_get_buffer_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get buffer size
     * @returns {number}
     */
    get_buffer_size() {
        const ret = wasm.probe_get_buffer_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the most recent value
     * @returns {number}
     */
    get_current_value() {
        const ret = wasm.probe_get_current_value(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get write position for proper buffer reading
     * @returns {number}
     */
    get_write_pos() {
        const ret = wasm.planewavesource_get_position(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get probe X position
     * @returns {number}
     */
    get_x() {
        const ret = wasm.probe_get_x(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get probe Y position
     * @returns {number}
     */
    get_y() {
        const ret = wasm.probe_get_y(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new probe at position (x, y)
     * @param {number} x
     * @param {number} y
     * @param {number} buffer_size
     */
    constructor(x, y, buffer_size) {
        const ret = wasm.probe_new(x, y, buffer_size);
        this.__wbg_ptr = ret >>> 0;
        ProbeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Record current field value
     * @param {Float32Array} ez
     * @param {number} width
     */
    record(ez, width) {
        const ptr0 = passArrayF32ToWasm0(ez, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.probe_record(this.__wbg_ptr, ptr0, len0, width);
    }
    /**
     * Set probe position
     * @param {number} x
     * @param {number} y
     */
    set_position(x, y) {
        wasm.probe_set_position(this.__wbg_ptr, x, y);
    }
}
if (Symbol.dispose) Probe.prototype[Symbol.dispose] = Probe.prototype.free;

/**
 * Scenario preset IDs
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}
 */
export const ScenarioId = Object.freeze({
    /**
     * Empty grid - just vacuum
     */
    Empty: 0, "0": "Empty",
    /**
     * Double slit diffraction experiment
     */
    DoubleSlit: 1, "1": "DoubleSlit",
    /**
     * Dielectric waveguide (bent fiber optic)
     */
    Waveguide: 2, "2": "Waveguide",
    /**
     * Parabolic metal reflector with point source
     */
    ParabolicReflector: 3, "3": "ParabolicReflector",
    /**
     * Glass prism demonstrating total internal reflection
     */
    TotalInternalReflection: 4, "4": "TotalInternalReflection",
    /**
     * Photonic crystal lattice
     */
    PhotonicCrystal: 5, "5": "PhotonicCrystal",
    /**
     * Lens focusing demonstration
     */
    Lens: 6, "6": "Lens",
    /**
     * Fresnel zone plate lens
     */
    FresnelLens: 7, "7": "FresnelLens",
});

/**
 * Single element in a phased array
 */
export class SourceElement {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SourceElementFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sourceelement_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get amplitude() {
        const ret = wasm.__wbg_get_sourceelement_amplitude(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get phase_offset() {
        const ret = wasm.__wbg_get_sourceelement_phase_offset(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_sourceelement_x(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_sourceelement_y(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set amplitude(arg0) {
        wasm.__wbg_set_sourceelement_amplitude(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set phase_offset(arg0) {
        wasm.__wbg_set_sourceelement_phase_offset(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_sourceelement_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_sourceelement_y(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} phase_offset
     * @param {number} amplitude
     */
    constructor(x, y, phase_offset, amplitude) {
        const ret = wasm.sourceelement_new(x, y, phase_offset, amplitude);
        this.__wbg_ptr = ret >>> 0;
        SourceElementFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) SourceElement.prototype[Symbol.dispose] = SourceElement.prototype.free;

/**
 * Time-domain source function
 */
export class SourceFunction {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SourceFunction.prototype);
        obj.__wbg_ptr = ptr;
        SourceFunctionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SourceFunctionFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sourcefunction_free(ptr, 0);
    }
    /**
     * Source waveform type
     * @returns {Waveform}
     */
    get waveform() {
        const ret = wasm.__wbg_get_sourcefunction_waveform(this.__wbg_ptr);
        return ret;
    }
    /**
     * Source waveform type
     * @param {Waveform} arg0
     */
    set waveform(arg0) {
        wasm.__wbg_set_sourcefunction_waveform(this.__wbg_ptr, arg0);
    }
    /**
     * Evaluate source function at time t
     * @param {number} t
     * @returns {number}
     */
    evaluate(t) {
        const ret = wasm.sourcefunction_evaluate(this.__wbg_ptr, t);
        return ret;
    }
    /**
     * Get amplitude
     * @returns {number}
     */
    get_amplitude() {
        const ret = wasm.gaussianbeamsource_get_frequency(this.__wbg_ptr);
        return ret;
    }
    /**
     * Create a Gaussian pulse source
     * t0: center time (in time steps)
     * tau: pulse width (in time steps)
     * @param {number} t0
     * @param {number} tau
     * @param {number} amplitude
     * @returns {SourceFunction}
     */
    static new_gaussian(t0, tau, amplitude) {
        const ret = wasm.sourcefunction_new_gaussian(t0, tau, amplitude);
        return SourceFunction.__wrap(ret);
    }
    /**
     * Create a modulated Gaussian (Gaussian envelope with carrier)
     * @param {number} frequency
     * @param {number} t0
     * @param {number} tau
     * @param {number} amplitude
     * @returns {SourceFunction}
     */
    static new_modulated_gaussian(frequency, t0, tau, amplitude) {
        const ret = wasm.sourcefunction_new_modulated_gaussian(frequency, t0, tau, amplitude);
        return SourceFunction.__wrap(ret);
    }
    /**
     * Create a Ricker wavelet (second derivative of Gaussian)
     * @param {number} t0
     * @param {number} tau
     * @param {number} amplitude
     * @returns {SourceFunction}
     */
    static new_ricker(t0, tau, amplitude) {
        const ret = wasm.sourcefunction_new_ricker(t0, tau, amplitude);
        return SourceFunction.__wrap(ret);
    }
    /**
     * Create a continuous sinusoidal source
     * @param {number} frequency
     * @param {number} amplitude
     */
    constructor(frequency, amplitude) {
        const ret = wasm.sourcefunction_new_sinusoidal(frequency, amplitude);
        this.__wbg_ptr = ret >>> 0;
        SourceFunctionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set amplitude
     * @param {number} amplitude
     */
    set_amplitude(amplitude) {
        wasm.sourcefunction_set_amplitude(this.__wbg_ptr, amplitude);
    }
}
if (Symbol.dispose) SourceFunction.prototype[Symbol.dispose] = SourceFunction.prototype.free;

/**
 * Source type enumeration
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const SourceType = Object.freeze({
    /**
     * Single point continuous sinusoidal
     */
    PointContinuous: 0, "0": "PointContinuous",
    /**
     * Single point Gaussian pulse
     */
    PointGaussian: 1, "1": "PointGaussian",
    /**
     * Plane wave along vertical line
     */
    PlaneWaveX: 2, "2": "PlaneWaveX",
    /**
     * Plane wave along horizontal line
     */
    PlaneWaveY: 3, "3": "PlaneWaveY",
    /**
     * Soft source (additive)
     */
    Soft: 4, "4": "Soft",
    /**
     * Hard source (replacement)
     */
    Hard: 5, "5": "Hard",
});

/**
 * Spectrum Analyzer using FFT for frequency domain analysis
 * Uses Hann windowing to reduce spectral leakage
 */
export class SpectrumAnalyzer {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SpectrumAnalyzerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_spectrumanalyzer_free(ptr, 0);
    }
    /**
     * Convert bin index to normalized frequency
     * @param {number} bin
     * @returns {number}
     */
    bin_to_frequency(bin) {
        const ret = wasm.spectrumanalyzer_bin_to_frequency(this.__wbg_ptr, bin);
        return ret;
    }
    /**
     * Compute spectrum from time-domain samples
     * Returns magnitude in dB (20 * log10(|X|))
     * @param {Float32Array} samples
     * @returns {Float32Array}
     */
    compute(samples) {
        const ptr0 = passArrayF32ToWasm0(samples, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.spectrumanalyzer_compute(this.__wbg_ptr, ptr0, len0);
        var v2 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * Find peak frequency bin
     * @returns {number}
     */
    find_peak_bin() {
        const ret = wasm.spectrumanalyzer_find_peak_bin(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get FFT size
     * @returns {number}
     */
    get_size() {
        const ret = wasm.spectrumanalyzer_get_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get spectrum pointer for JS access
     * @returns {number}
     */
    get_spectrum_ptr() {
        const ret = wasm.spectrumanalyzer_get_spectrum_ptr(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get spectrum size (N/2 bins)
     * @returns {number}
     */
    get_spectrum_size() {
        const ret = wasm.spectrumanalyzer_get_spectrum_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new spectrum analyzer
     * size: FFT size (should be power of 2, e.g., 256, 512, 1024)
     * @param {number} size
     */
    constructor(size) {
        const ret = wasm.spectrumanalyzer_new(size);
        this.__wbg_ptr = ret >>> 0;
        SpectrumAnalyzerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) SpectrumAnalyzer.prototype[Symbol.dispose] = SpectrumAnalyzer.prototype.free;

/**
 * Waveform types
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const Waveform = Object.freeze({
    /**
     * Continuous sinusoidal: sin(2πft)
     */
    Sinusoidal: 0, "0": "Sinusoidal",
    /**
     * Gaussian pulse: exp(-((t-t0)/τ)²)
     */
    Gaussian: 1, "1": "Gaussian",
    /**
     * Modulated Gaussian: sin(2πft) * exp(-((t-t0)/τ)²)
     */
    ModulatedGaussian: 2, "2": "ModulatedGaussian",
    /**
     * Ricker wavelet (Mexican hat)
     */
    Ricker: 3, "3": "Ricker",
    /**
     * Step function
     */
    Step: 4, "4": "Step",
});

/**
 * Helper function to create a Gaussian pulse at specific parameters
 * @param {number} t
 * @param {number} t0
 * @param {number} tau
 * @returns {number}
 */
export function gaussian_pulse(t, t0, tau) {
    const ret = wasm.gaussian_pulse(t, t0, tau);
    return ret;
}

/**
 * Get material by ID (for JavaScript interop)
 * 0 = Vacuum, 1 = Glass, 2 = Water, 3 = Metal, 4 = Absorber, 5 = Crystal, 6 = Silicon
 * @param {number} id
 * @returns {Material}
 */
export function get_material_by_id(id) {
    const ret = wasm.get_material_by_id(id);
    return Material.__wrap(ret);
}

/**
 * Get material name by ID
 * @param {number} id
 * @returns {string}
 */
export function get_material_name(id) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_material_name(id);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get scenario description
 * @param {number} id
 * @returns {string}
 */
export function get_scenario_description(id) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_scenario_description(id);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get scenario name by ID
 * @param {number} id
 * @returns {string}
 */
export function get_scenario_name(id) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_scenario_name(id);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get library version string
 * @returns {string}
 */
export function get_version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get WebAssembly memory for zero-copy array access
 * JavaScript can create Float32Array views over this memory
 * @returns {any}
 */
export function get_wasm_memory() {
    const ret = wasm.get_wasm_memory();
    return ret;
}

/**
 * Initialize the Wasm module (call once at startup)
 */
export function init() {
    wasm.init();
}

/**
 * Helper function for modulated Gaussian
 * @param {number} t
 * @param {number} frequency
 * @param {number} t0
 * @param {number} tau
 * @returns {number}
 */
export function modulated_gaussian(t, frequency, t0, tau) {
    const ret = wasm.modulated_gaussian(t, frequency, t0, tau);
    return ret;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_fc0809a4dec43528: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_memory_bd1fbcf21fbef3c8: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./photonlab_core_bg.js": import0,
    };
}

const CPMLFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cpml_free(ptr >>> 0, 1));
const FDTDGridFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fdtdgrid_free(ptr >>> 0, 1));
const GaussianBeamSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gaussianbeamsource_free(ptr >>> 0, 1));
const MaterialFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_material_free(ptr >>> 0, 1));
const MaterialPresetsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_materialpresets_free(ptr >>> 0, 1));
const PhasedArraySourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_phasedarraysource_free(ptr >>> 0, 1));
const PlaneWaveSourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_planewavesource_free(ptr >>> 0, 1));
const ProbeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_probe_free(ptr >>> 0, 1));
const SourceElementFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sourceelement_free(ptr >>> 0, 1));
const SourceFunctionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sourcefunction_free(ptr >>> 0, 1));
const SpectrumAnalyzerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_spectrumanalyzer_free(ptr >>> 0, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('photonlab_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
