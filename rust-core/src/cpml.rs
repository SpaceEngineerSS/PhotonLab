//! Convolutional Perfectly Matched Layer (CPML) Implementation
//!
//! CPML provides highly effective absorbing boundaries that minimize
//! wave reflections at the simulation edges. Uses stretched coordinate
//! formulation with auxiliary differential equation (ADE) method.
//!
//! Reference: Roden & Gedney (2000) - Convolution PML (CPML)

use wasm_bindgen::prelude::*;

/// CPML boundary thickness in cells
pub const CPML_THICKNESS: usize = 20;

/// Maximum polynomial grading order
const CPML_ORDER: f32 = 3.0;

/// Maximum sigma value for CPML (normalized)
const SIGMA_MAX: f32 = 0.75;

/// Maximum alpha value for CPML (for evanescent wave absorption)
const ALPHA_MAX: f32 = 0.05;

/// Maximum kappa value (coordinate stretching factor)
const KAPPA_MAX: f32 = 15.0;

/// CPML coefficient set for one direction
#[derive(Clone)]
pub struct CPMLCoeffs {
    /// b coefficient for recursive convolution
    pub b: Vec<f32>,
    /// c coefficient for recursive convolution  
    pub c: Vec<f32>,
    /// Kappa (coordinate stretching)
    pub kappa: Vec<f32>,
}

impl CPMLCoeffs {
    /// Create CPML coefficients for a given number of layers
    /// `dt` is the time step, `thickness` is number of CPML cells
    pub fn new(thickness: usize, dt: f32) -> Self {
        let mut b = vec![0.0; thickness];
        let mut c = vec![0.0; thickness];
        let mut kappa = vec![1.0; thickness];

        for i in 0..thickness {
            // Polynomial grading from edge (i=0) to interior (i=thickness-1)
            // At edge: maximum absorption, at interior: minimum
            let depth = (thickness - 1 - i) as f32 / (thickness - 1) as f32;

            // Graded sigma (conductivity-like parameter)
            let sigma = SIGMA_MAX * depth.powf(CPML_ORDER);

            // Graded kappa (coordinate stretching)
            let k = 1.0 + (KAPPA_MAX - 1.0) * depth.powf(CPML_ORDER);

            // Graded alpha (for evanescent waves)
            let alpha = ALPHA_MAX * (1.0 - depth);

            // CPML recursive coefficients
            // b = exp(-(sigma/kappa + alpha) * dt)
            // c = sigma / (sigma*kappa + kappa^2*alpha) * (b - 1)
            let denom = sigma + k * alpha;

            if denom.abs() > 1e-10 {
                b[i] = (-(sigma / k + alpha) * dt).exp();
                c[i] = (sigma / (k * denom)) * (b[i] - 1.0);
            } else {
                b[i] = 1.0;
                c[i] = 0.0;
            }

            kappa[i] = k;
        }

        CPMLCoeffs { b, c, kappa }
    }
}

/// CPML boundary handler for 2D FDTD
#[wasm_bindgen]
pub struct CPML {
    thickness: usize,
    #[allow(dead_code)] // Reserved for future grid resize support
    width: usize,
    height: usize,

    // Coefficients for x and y directions
    coeffs_e: CPMLCoeffs, // For E-field updates
    coeffs_h: CPMLCoeffs, // For H-field updates

    // Auxiliary (psi) fields for E-field update
    // Only stored in CPML regions to save memory
    // Left boundary: psi_ezx_left[thickness][height]
    // Right boundary: psi_ezx_right[thickness][height]
    // Bottom boundary: psi_ezy_bottom[width][thickness]
    // Top boundary: psi_ezy_top[width][thickness]
    psi_ezx_left: Vec<f32>,
    psi_ezx_right: Vec<f32>,
    psi_ezy_bottom: Vec<f32>,
    psi_ezy_top: Vec<f32>,

    // Auxiliary fields for H-field update
    psi_hxy_left: Vec<f32>,
    psi_hxy_right: Vec<f32>,
    psi_hyx_bottom: Vec<f32>,
    psi_hyx_top: Vec<f32>,
}

#[wasm_bindgen]
impl CPML {
    /// Create new CPML boundaries for a grid
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, dt: f32) -> CPML {
        let thickness = CPML_THICKNESS.min(width / 4).min(height / 4);

        let coeffs_e = CPMLCoeffs::new(thickness, dt);
        let coeffs_h = CPMLCoeffs::new(thickness, dt);

        // Allocate psi arrays for each boundary region
        let psi_ezx_left = vec![0.0; thickness * height];
        let psi_ezx_right = vec![0.0; thickness * height];
        let psi_ezy_bottom = vec![0.0; width * thickness];
        let psi_ezy_top = vec![0.0; width * thickness];

        let psi_hxy_left = vec![0.0; thickness * height];
        let psi_hxy_right = vec![0.0; thickness * height];
        let psi_hyx_bottom = vec![0.0; width * thickness];
        let psi_hyx_top = vec![0.0; width * thickness];

        CPML {
            thickness,
            width,
            height,
            coeffs_e,
            coeffs_h,
            psi_ezx_left,
            psi_ezx_right,
            psi_ezy_bottom,
            psi_ezy_top,
            psi_hxy_left,
            psi_hxy_right,
            psi_hyx_bottom,
            psi_hyx_top,
        }
    }

    /// Get CPML thickness
    pub fn get_thickness(&self) -> usize {
        self.thickness
    }

    /// Reset all psi arrays to zero
    pub fn reset(&mut self) {
        self.psi_ezx_left.fill(0.0);
        self.psi_ezx_right.fill(0.0);
        self.psi_ezy_bottom.fill(0.0);
        self.psi_ezy_top.fill(0.0);
        self.psi_hxy_left.fill(0.0);
        self.psi_hxy_right.fill(0.0);
        self.psi_hyx_bottom.fill(0.0);
        self.psi_hyx_top.fill(0.0);
    }
}

impl CPML {
    /// Update E-field in left CPML region
    /// Returns the CPML correction to add to the standard update
    pub fn update_ez_left(&mut self, ez: &mut [f32], hy: &[f32], cb: &[f32], w: usize) {
        let t = self.thickness;
        let h = self.height;

        for j in 1..h {
            for i in 1..t {
                let idx = j * w + i;
                let psi_idx = (i - 1) * h + j;

                // Layer index (0 at edge, t-1 at interior)
                let layer = i;

                // Get CPML coefficients
                let b = self.coeffs_e.b[layer];
                let c = self.coeffs_e.c[layer];
                let kappa = self.coeffs_e.kappa[layer];

                // dHy/dx term
                let dhy_dx = hy[idx] - hy[idx - 1];

                // Update psi (auxiliary field)
                self.psi_ezx_left[psi_idx] = b * self.psi_ezx_left[psi_idx] + c * dhy_dx;

                // Apply CPML correction
                // Standard: Ez += cb * dHy/dx
                // CPML: Ez += cb * (dHy/dx / kappa + psi)
                ez[idx] += cb[idx] * (dhy_dx * (1.0 / kappa - 1.0) + self.psi_ezx_left[psi_idx]);
            }
        }
    }

    /// Update E-field in right CPML region
    pub fn update_ez_right(&mut self, ez: &mut [f32], hy: &[f32], cb: &[f32], w: usize) {
        let t = self.thickness;
        let h = self.height;

        for j in 1..h {
            for i in 0..t {
                let grid_i = w - t + i;
                let idx = j * w + grid_i;
                let psi_idx = i * h + j;

                // Layer index (t-1 at interior, 0 at edge)
                let layer = t - 1 - i;

                let b = self.coeffs_e.b[layer];
                let c = self.coeffs_e.c[layer];
                let kappa = self.coeffs_e.kappa[layer];

                let dhy_dx = hy[idx] - hy[idx - 1];

                self.psi_ezx_right[psi_idx] = b * self.psi_ezx_right[psi_idx] + c * dhy_dx;
                ez[idx] += cb[idx] * (dhy_dx * (1.0 / kappa - 1.0) + self.psi_ezx_right[psi_idx]);
            }
        }
    }

    /// Update E-field in bottom CPML region
    pub fn update_ez_bottom(&mut self, ez: &mut [f32], hx: &[f32], cb: &[f32], w: usize) {
        let t = self.thickness;

        for j in 1..t {
            for i in 1..w {
                let idx = j * w + i;
                let psi_idx = i * t + (j - 1);

                let layer = j;

                let b = self.coeffs_e.b[layer];
                let c = self.coeffs_e.c[layer];
                let kappa = self.coeffs_e.kappa[layer];

                // -dHx/dy term
                let dhx_dy = hx[idx] - hx[idx - w];

                self.psi_ezy_bottom[psi_idx] = b * self.psi_ezy_bottom[psi_idx] + c * dhx_dy;
                ez[idx] -= cb[idx] * (dhx_dy * (1.0 / kappa - 1.0) + self.psi_ezy_bottom[psi_idx]);
            }
        }
    }

    /// Update E-field in top CPML region
    pub fn update_ez_top(&mut self, ez: &mut [f32], hx: &[f32], cb: &[f32], w: usize) {
        let t = self.thickness;
        let h = self.height;

        for j in 0..t {
            let grid_j = h - t + j;
            for i in 1..w {
                let idx = grid_j * w + i;
                let psi_idx = i * t + j;

                let layer = t - 1 - j;

                let b = self.coeffs_e.b[layer];
                let c = self.coeffs_e.c[layer];
                let kappa = self.coeffs_e.kappa[layer];

                let dhx_dy = hx[idx] - hx[idx - w];

                self.psi_ezy_top[psi_idx] = b * self.psi_ezy_top[psi_idx] + c * dhx_dy;
                ez[idx] -= cb[idx] * (dhx_dy * (1.0 / kappa - 1.0) + self.psi_ezy_top[psi_idx]);
            }
        }
    }

    /// Update H-field in all CPML regions
    pub fn update_h_boundaries(
        &mut self,
        hx: &mut [f32],
        hy: &mut [f32],
        ez: &[f32],
        w: usize,
        courant: f32,
    ) {
        let t = self.thickness;
        let h = self.height;

        // Left boundary - Hy correction
        for j in 0..h {
            for i in 0..t {
                let idx = j * w + i;
                let psi_idx = i * h + j;

                if i + 1 < w {
                    let layer = i;
                    let b = self.coeffs_h.b[layer];
                    let c = self.coeffs_h.c[layer];
                    let kappa = self.coeffs_h.kappa[layer];

                    let dez_dx = ez[idx + 1] - ez[idx];

                    self.psi_hxy_left[psi_idx] = b * self.psi_hxy_left[psi_idx] + c * dez_dx;
                    hy[idx] +=
                        courant * (dez_dx * (1.0 / kappa - 1.0) + self.psi_hxy_left[psi_idx]);
                }
            }
        }

        // Right boundary - Hy correction
        for j in 0..h {
            for i in 0..t {
                let grid_i = w - t + i;
                let idx = j * w + grid_i;
                let psi_idx = i * h + j;

                if grid_i + 1 < w {
                    let layer = t - 1 - i;
                    let b = self.coeffs_h.b[layer];
                    let c = self.coeffs_h.c[layer];
                    let kappa = self.coeffs_h.kappa[layer];

                    let dez_dx = ez[idx + 1] - ez[idx];

                    self.psi_hxy_right[psi_idx] = b * self.psi_hxy_right[psi_idx] + c * dez_dx;
                    hy[idx] +=
                        courant * (dez_dx * (1.0 / kappa - 1.0) + self.psi_hxy_right[psi_idx]);
                }
            }
        }

        // Bottom boundary - Hx correction
        for j in 0..t {
            for i in 0..w {
                let idx = j * w + i;
                let psi_idx = i * t + j;

                if j + 1 < h {
                    let layer = j;
                    let b = self.coeffs_h.b[layer];
                    let c = self.coeffs_h.c[layer];
                    let kappa = self.coeffs_h.kappa[layer];

                    let dez_dy = ez[idx + w] - ez[idx];

                    self.psi_hyx_bottom[psi_idx] = b * self.psi_hyx_bottom[psi_idx] + c * dez_dy;
                    hx[idx] -=
                        courant * (dez_dy * (1.0 / kappa - 1.0) + self.psi_hyx_bottom[psi_idx]);
                }
            }
        }

        // Top boundary - Hx correction
        for j in 0..t {
            let grid_j = h - t + j;
            for i in 0..w {
                let idx = grid_j * w + i;
                let psi_idx = i * t + j;

                if grid_j + 1 < h {
                    let layer = t - 1 - j;
                    let b = self.coeffs_h.b[layer];
                    let c = self.coeffs_h.c[layer];
                    let kappa = self.coeffs_h.kappa[layer];

                    let dez_dy = ez[idx + w] - ez[idx];

                    self.psi_hyx_top[psi_idx] = b * self.psi_hyx_top[psi_idx] + c * dez_dy;
                    hx[idx] -= courant * (dez_dy * (1.0 / kappa - 1.0) + self.psi_hyx_top[psi_idx]);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cpml_coeffs_creation() {
        let coeffs = CPMLCoeffs::new(20, 0.5);
        assert_eq!(coeffs.b.len(), 20);
        assert_eq!(coeffs.c.len(), 20);
        assert_eq!(coeffs.kappa.len(), 20);

        // Interior should have less absorption
        assert!(coeffs.b[19] > coeffs.b[0]);
    }

    #[test]
    fn test_cpml_creation() {
        let cpml = CPML::new(512, 512, 0.5);
        assert_eq!(cpml.get_thickness(), 20);
    }
}
