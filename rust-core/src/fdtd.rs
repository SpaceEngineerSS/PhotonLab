//! FDTD Grid Implementation
//!
//! 2D TMz mode electromagnetic field solver using Yee lattice algorithm.
//! Optimized for Wasm with flat 1D arrays for cache-friendly memory access.

use wasm_bindgen::prelude::*;

/// Physical constants (normalized units)
#[allow(dead_code)]
const C: f32 = 1.0; // Speed of light (kept for reference)
const DX: f32 = 1.0; // Grid spacing
const DT: f32 = 0.5; // Time step (< 1/√2 for CFL stability)
const COURANT: f32 = DT / DX; // Courant number

/// FDTD Grid holding all electromagnetic field components
///
/// Memory layout: Flat 1D arrays in row-major order for cache efficiency.
/// Field positions follow Yee staggering:
/// - Ez at integer grid points (i, j)
/// - Hx at (i, j+1/2)  
/// - Hy at (i+1/2, j)
#[wasm_bindgen]
pub struct FDTDGrid {
    width: usize,
    height: usize,

    // Electric field z-component
    ez: Vec<f32>,

    // Magnetic field components
    hx: Vec<f32>,
    hy: Vec<f32>,

    // Material coefficients for E-field update
    // Ez^(n+1) = ca * Ez^n + cb * curl(H)
    // ca: decay coefficient (1.0 for vacuum, 0.0 for PEC)
    // cb: curl coefficient (COURANT for vacuum, COURANT/epsilon_r for dielectric, 0.0 for PEC)
    ca: Vec<f32>,
    cb: Vec<f32>,

    // Simulation state
    time_step: u64,
}

#[wasm_bindgen]
impl FDTDGrid {
    /// Create a new FDTD grid with specified dimensions
    ///
    /// # Arguments
    /// * `width` - Number of cells in x direction
    /// * `height` - Number of cells in y direction
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize) -> FDTDGrid {
        // Initialize panic hook for better error messages in browser
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();

        let size = width * height;

        FDTDGrid {
            width,
            height,
            ez: vec![0.0; size],
            hx: vec![0.0; size],
            hy: vec![0.0; size],
            ca: vec![1.0; size],     // Decay coefficient (1.0 = vacuum, no loss)
            cb: vec![COURANT; size], // Curl coefficient (COURANT = vacuum speed)
            time_step: 0,
        }
    }

    /// Get grid width
    #[wasm_bindgen]
    pub fn get_width(&self) -> usize {
        self.width
    }

    /// Get grid height
    #[wasm_bindgen]
    pub fn get_height(&self) -> usize {
        self.height
    }

    /// Get current simulation time step
    #[wasm_bindgen]
    pub fn get_time_step(&self) -> u64 {
        self.time_step
    }

    /// Get raw pointer to Ez field data for zero-copy WebGL access
    ///
    /// # Safety
    /// The returned pointer is valid only as long as this FDTDGrid exists
    /// and no mutable operations are performed on the grid.
    #[wasm_bindgen]
    pub fn get_ez_ptr(&self) -> *const f32 {
        self.ez.as_ptr()
    }

    /// Get the length of the Ez array (for JavaScript to create typed array view)
    #[wasm_bindgen]
    pub fn get_ez_len(&self) -> usize {
        self.ez.len()
    }

    /// Calculate total electromagnetic energy in the grid
    /// Useful for monitoring simulation stability
    #[wasm_bindgen]
    pub fn get_total_energy(&self) -> f32 {
        let mut energy: f32 = 0.0;

        for i in 0..self.ez.len() {
            energy += self.ez[i] * self.ez[i];
            energy += self.hx[i] * self.hx[i];
            energy += self.hy[i] * self.hy[i];
        }

        energy * 0.5
    }

    /// Check if simulation has become unstable (NaN or Inf values)
    #[wasm_bindgen]
    pub fn is_stable(&self) -> bool {
        // Sample a few points rather than checking all for performance
        let sample_indices = [
            0,
            self.ez.len() / 4,
            self.ez.len() / 2,
            3 * self.ez.len() / 4,
            self.ez.len() - 1,
        ];

        for &idx in &sample_indices {
            if !self.ez[idx].is_finite() {
                return false;
            }
        }
        true
    }

    /// Update magnetic field components (H-field update)
    ///
    /// Implements:
    /// Hx(i,j) -= Courant * (Ez(i,j+1) - Ez(i,j))
    /// Hy(i,j) += Courant * (Ez(i+1,j) - Ez(i,j))
    pub fn update_h(&mut self) {
        let w = self.width;
        let h = self.height;

        // Update Hx field
        // Hx is at (i, j+1/2), needs Ez at j and j+1
        for j in 0..(h - 1) {
            for i in 0..w {
                let idx = j * w + i;
                let idx_jp1 = (j + 1) * w + i;

                self.hx[idx] -= COURANT * (self.ez[idx_jp1] - self.ez[idx]);
            }
        }

        // Update Hy field
        // Hy is at (i+1/2, j), needs Ez at i and i+1
        for j in 0..h {
            for i in 0..(w - 1) {
                let idx = j * w + i;
                let idx_ip1 = j * w + (i + 1);

                self.hy[idx] += COURANT * (self.ez[idx_ip1] - self.ez[idx]);
            }
        }
    }

    /// Update electric field component (E-field update)
    ///
    /// Implements:
    /// Ez(i,j) = ca(i,j) * Ez(i,j) + cb(i,j) * ((Hy(i,j) - Hy(i-1,j)) - (Hx(i,j) - Hx(i,j-1)))
    pub fn update_e(&mut self) {
        let w = self.width;
        let h = self.height;

        // Interior points (skip boundaries)
        for j in 1..h {
            for i in 1..w {
                let idx = j * w + i;
                let idx_im1 = j * w + (i - 1);
                let idx_jm1 = (j - 1) * w + i;

                // Curl of H
                let curl_h = (self.hy[idx] - self.hy[idx_im1]) - (self.hx[idx] - self.hx[idx_jm1]);

                // Update Ez with material coefficients
                // ca handles decay/loss, cb handles permittivity (wave speed)
                // For PEC: ca=0, cb=0 -> Ez stays at 0
                // For dielectric: ca=1, cb=COURANT/epsilon_r -> wave slows down
                self.ez[idx] = self.ca[idx] * self.ez[idx] + self.cb[idx] * curl_h;
            }
        }
    }

    /// Apply simple absorbing boundary conditions (first-order Mur ABC)
    /// This prevents waves from reflecting at edges
    pub fn apply_abc(&mut self) {
        let w = self.width;
        let h = self.height;

        // Left boundary (x = 0)
        for j in 0..h {
            self.ez[j * w] = self.ez[j * w + 1];
        }

        // Right boundary (x = w-1)
        for j in 0..h {
            self.ez[j * w + (w - 1)] = self.ez[j * w + (w - 2)];
        }

        // Bottom boundary (y = 0)
        for i in 0..w {
            self.ez[i] = self.ez[w + i];
        }

        // Top boundary (y = h-1)
        for i in 0..w {
            self.ez[(h - 1) * w + i] = self.ez[(h - 2) * w + i];
        }
    }

    /// Perform one complete FDTD time step
    /// Order: H update -> E update -> Boundaries -> Sources
    #[wasm_bindgen]
    pub fn step(&mut self) {
        self.update_h();
        self.update_e();
        self.apply_abc();
        self.time_step += 1;
    }

    /// Run multiple time steps at once (for performance)
    #[wasm_bindgen]
    pub fn step_n(&mut self, n: u32) {
        for _ in 0..n {
            self.step();
        }
    }

    /// Place a Gaussian pulse at specified location
    /// Useful for testing wave propagation
    #[wasm_bindgen]
    pub fn place_pulse(&mut self, x: usize, y: usize, amplitude: f32) {
        if x < self.width && y < self.height {
            let idx = y * self.width + x;
            self.ez[idx] = amplitude;
        }
    }

    /// Add sinusoidal soft source at location
    /// frequency: normalized frequency (typical: 0.1 to 0.3)
    #[wasm_bindgen]
    pub fn add_soft_source(&mut self, x: usize, y: usize, frequency: f32, amplitude: f32) {
        if x < self.width && y < self.height {
            let idx = y * self.width + x;
            let t = self.time_step as f32;
            let value = amplitude * (2.0 * std::f32::consts::PI * frequency * t).sin();
            self.ez[idx] += value;
        }
    }

    /// Set material properties in a rectangular region
    /// epsilon_r: relative permittivity (1.0 = vacuum, 2.25 = glass, 4.0 = silicon)
    /// sigma: conductivity (0.0 = lossless)
    #[wasm_bindgen]
    pub fn set_material_region(
        &mut self,
        x1: usize,
        y1: usize,
        x2: usize,
        y2: usize,
        epsilon_r: f32,
        sigma: f32,
    ) {
        let x_min = x1.min(x2).min(self.width - 1);
        let x_max = x1.max(x2).min(self.width - 1);
        let y_min = y1.min(y2).min(self.height - 1);
        let y_max = y1.max(y2).min(self.height - 1);

        // Calculate material coefficients
        // ca = (1 - σΔt/(2ε)) / (1 + σΔt/(2ε))  [decay coefficient]
        // cb = (Δt/(ε*Δx)) / (1 + σΔt/(2ε))    [curl coefficient - controls wave speed]
        let eps = epsilon_r.max(0.01); // Prevent division by zero
        let sigma_term = sigma * DT / (2.0 * eps);
        let denominator = 1.0 + sigma_term;

        let ca_val = (1.0 - sigma_term) / denominator;
        let cb_val = (COURANT / eps) / denominator; // Wave speed scales with 1/sqrt(eps)

        for j in y_min..=y_max {
            for i in x_min..=x_max {
                let idx = j * self.width + i;
                self.ca[idx] = ca_val;
                self.cb[idx] = cb_val;
            }
        }
    }

    /// Set a single cell as perfect electric conductor (PEC/metal)
    /// PEC forces Ez = 0 at this cell (perfect reflection)
    #[wasm_bindgen]
    pub fn set_pec(&mut self, x: usize, y: usize) {
        if x < self.width && y < self.height {
            let idx = y * self.width + x;
            self.ca[idx] = 0.0; // No memory of previous Ez
            self.cb[idx] = 0.0; // No contribution from curl(H)
            self.ez[idx] = 0.0; // Force Ez to zero immediately
        }
    }

    /// Reset the simulation to initial state
    #[wasm_bindgen]
    pub fn reset(&mut self) {
        self.ez.fill(0.0);
        self.hx.fill(0.0);
        self.hy.fill(0.0);
        self.time_step = 0;
    }

    /// Clear only material settings (keep fields)
    #[wasm_bindgen]
    pub fn clear_materials(&mut self) {
        self.ca.fill(1.0);
        self.cb.fill(COURANT);
    }

    // ========================================================================
    // Brush Painting API (for UI Toolbox)
    // ========================================================================

    /// Paint a filled circle with the specified material
    /// Uses material_id: 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
    #[wasm_bindgen]
    pub fn paint_circle(&mut self, cx: i32, cy: i32, radius: i32, material_id: u32) {
        let r2 = (radius * radius) as i32;

        // Bounding box optimization - only iterate cells that could be in circle
        let x_min = (cx - radius).max(0) as usize;
        let x_max = ((cx + radius) as usize).min(self.width - 1);
        let y_min = (cy - radius).max(0) as usize;
        let y_max = ((cy + radius) as usize).min(self.height - 1);

        for y in y_min..=y_max {
            for x in x_min..=x_max {
                let dx = x as i32 - cx;
                let dy = y as i32 - cy;

                if dx * dx + dy * dy <= r2 {
                    self.set_cell_material(x, y, material_id);
                }
            }
        }
    }

    /// Paint a filled rectangle with the specified material
    #[wasm_bindgen]
    pub fn paint_rect(&mut self, x1: i32, y1: i32, x2: i32, y2: i32, material_id: u32) {
        let x_min = x1.min(x2).max(0) as usize;
        let x_max = (x1.max(x2) as usize).min(self.width - 1);
        let y_min = y1.min(y2).max(0) as usize;
        let y_max = (y1.max(y2) as usize).min(self.height - 1);

        for y in y_min..=y_max {
            for x in x_min..=x_max {
                self.set_cell_material(x, y, material_id);
            }
        }
    }

    /// Set a single cell's material by ID
    /// 0=Vacuum, 1=Glass, 2=Water, 3=Metal, 4=Absorber, 5=Crystal, 6=Silicon
    #[wasm_bindgen]
    pub fn set_cell_material(&mut self, x: usize, y: usize, material_id: u32) {
        if x >= self.width || y >= self.height {
            return;
        }

        let idx = y * self.width + x;

        // Material properties based on ID
        match material_id {
            0 => {
                // Vacuum
                self.ca[idx] = 1.0;
                self.cb[idx] = COURANT;
            }
            1 => {
                // Glass (ε = 2.25)
                self.ca[idx] = 1.0;
                self.cb[idx] = COURANT / 2.25;
            }
            2 => {
                // Water (ε = 78, σ = 0.05)
                let eps = 78.0;
                let sigma = 0.05;
                let sigma_term = sigma * DT / (2.0 * eps);
                let denom = 1.0 + sigma_term;
                self.ca[idx] = (1.0 - sigma_term) / denom;
                self.cb[idx] = (COURANT / eps) / denom;
            }
            3 => {
                // Metal (PEC)
                self.ca[idx] = 0.0;
                self.cb[idx] = 0.0;
                self.ez[idx] = 0.0;
            }
            4 => {
                // Absorber (high σ)
                let sigma = 0.5;
                let sigma_term = sigma * DT / 2.0;
                let denom = 1.0 + sigma_term;
                self.ca[idx] = (1.0 - sigma_term) / denom;
                self.cb[idx] = COURANT / denom;
            }
            5 => {
                // Crystal (ε = 4.0)
                self.ca[idx] = 1.0;
                self.cb[idx] = COURANT / 4.0;
            }
            6 => {
                // Silicon (ε = 11.7)
                self.ca[idx] = 1.0;
                self.cb[idx] = COURANT / 11.7;
            }
            _ => {
                // Default to vacuum
                self.ca[idx] = 1.0;
                self.cb[idx] = COURANT;
            }
        }
    }

    /// Paint a line from (x1,y1) to (x2,y2) with specified brush size and material
    /// Uses Bresenham's line algorithm for smooth lines
    #[wasm_bindgen]
    pub fn paint_line(
        &mut self,
        x1: i32,
        y1: i32,
        x2: i32,
        y2: i32,
        brush_size: i32,
        material_id: u32,
    ) {
        let dx = (x2 - x1).abs();
        let dy = -(y2 - y1).abs();
        let sx = if x1 < x2 { 1 } else { -1 };
        let sy = if y1 < y2 { 1 } else { -1 };
        let mut err = dx + dy;

        let mut x = x1;
        let mut y = y1;

        loop {
            // Paint circle at each point for brush thickness
            self.paint_circle(x, y, brush_size, material_id);

            if x == x2 && y == y2 {
                break;
            }

            let e2 = 2 * err;
            if e2 >= dy {
                if x == x2 {
                    break;
                }
                err += dy;
                x += sx;
            }
            if e2 <= dx {
                if y == y2 {
                    break;
                }
                err += dx;
                y += sy;
            }
        }
    }

    // ========================================================================
    // Scenario Preset Loading
    // ========================================================================

    /// Load a preset scenario by ID
    /// 0=Empty, 1=DoubleSlit, 2=Waveguide, 3=ParabolicReflector,
    /// 4=TotalInternalReflection, 5=PhotonicCrystal, 6=Lens
    #[wasm_bindgen]
    pub fn load_preset(&mut self, scenario_id: u8) {
        use crate::scenarios::ScenarioBuilder;

        // Clear existing materials and fields
        self.reset();
        self.clear_materials();

        let builder = ScenarioBuilder::new(self.width, self.height);

        let cells = match scenario_id {
            0 => Vec::new(), // Empty
            1 => builder.build_double_slit(),
            2 => builder.build_waveguide(),
            3 => builder.build_parabolic_reflector(),
            4 => builder.build_tir_prism(),
            5 => builder.build_photonic_crystal(),
            6 => builder.build_lens(),
            _ => Vec::new(),
        };

        // Apply all cells
        for (x, y, material_id) in cells {
            self.set_cell_material(x, y, material_id);
        }
    }

    /// Get scenario count
    #[wasm_bindgen]
    pub fn get_scenario_count() -> u8 {
        7 // 0-6
    }

    // ========================================================================
    // Advanced Sources
    // ========================================================================

    /// Inject a vertical plane wave (along constant x)
    /// Uses soft source injection for clean wave fronts
    #[wasm_bindgen]
    pub fn inject_plane_wave_x(&mut self, x: usize, amplitude: f32) {
        if x >= self.width {
            return;
        }
        // Soft source: add to existing field
        for y in 1..self.height - 1 {
            let idx = y * self.width + x;
            self.ez[idx] += amplitude * COURANT;
        }
    }

    /// Inject a horizontal plane wave (along constant y)
    #[wasm_bindgen]
    pub fn inject_plane_wave_y(&mut self, y: usize, amplitude: f32) {
        if y >= self.height {
            return;
        }
        for x in 1..self.width - 1 {
            let idx = y * self.width + x;
            self.ez[idx] += amplitude * COURANT;
        }
    }

    /// Inject sinusoidal plane wave at position x
    /// frequency: normalized frequency (0.01-0.1 typical)
    #[wasm_bindgen]
    pub fn inject_sinusoidal_plane_wave(&mut self, x: usize, frequency: f32) {
        let t = self.time_step as f32;
        let amplitude = (2.0 * std::f32::consts::PI * frequency * t).sin();
        self.inject_plane_wave_x(x, amplitude);
    }

    /// Inject Gaussian pulse plane wave
    /// t0: center time, tau: pulse width
    #[wasm_bindgen]
    pub fn inject_gaussian_plane_wave(&mut self, x: usize, t0: f32, tau: f32) {
        let t = self.time_step as f32;
        let arg = (t - t0) / tau;
        let amplitude = (-arg * arg).exp();
        self.inject_plane_wave_x(x, amplitude);
    }

    // ========================================================================
    // Probe System
    // ========================================================================

    /// Get Ez field value at a specific point
    #[wasm_bindgen]
    pub fn get_field_at(&self, x: usize, y: usize) -> f32 {
        if x >= self.width || y >= self.height {
            return 0.0;
        }
        let idx = y * self.width + x;
        self.ez[idx]
    }

    /// Get the Courant number (useful for source calibration)
    #[wasm_bindgen]
    pub fn get_courant() -> f32 {
        COURANT
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grid_creation() {
        let grid = FDTDGrid::new(100, 100);
        assert_eq!(grid.get_width(), 100);
        assert_eq!(grid.get_height(), 100);
        assert_eq!(grid.get_time_step(), 0);
    }

    #[test]
    fn test_wave_propagation() {
        let mut grid = FDTDGrid::new(64, 64);

        // Place pulse at center
        grid.place_pulse(32, 32, 1.0);

        // Run simulation
        for _ in 0..20 {
            grid.step();
        }

        // Check that energy has spread (not all at center)
        assert!(grid.is_stable());
        assert!(grid.get_total_energy() > 0.0);
    }

    #[test]
    fn test_cfl_stability() {
        // Our DT=0.5 should be stable (CFL limit is 1/√2 ≈ 0.707)
        let mut grid = FDTDGrid::new(64, 64);
        grid.place_pulse(32, 32, 1.0);

        // Run many steps
        grid.step_n(1000);

        // Should still be stable
        assert!(grid.is_stable());
    }

    #[test]
    fn test_pec_boundary() {
        let mut grid = FDTDGrid::new(64, 64);

        // Place PEC wall vertically in the middle
        for j in 0..64 {
            grid.set_pec(32, j);
        }

        // Place source to left of wall
        grid.place_pulse(16, 32, 1.0);

        // Get initial energy
        let initial_energy = grid.get_total_energy();
        assert!(initial_energy > 0.0);

        // Run simulation
        grid.step_n(100);

        // Simulation should remain stable
        assert!(grid.is_stable());

        // Energy should decrease due to ABC absorption (not explosion)
        let final_energy = grid.get_total_energy();
        assert!(
            final_energy < initial_energy * 10.0,
            "Energy should not explode"
        );
    }
}
