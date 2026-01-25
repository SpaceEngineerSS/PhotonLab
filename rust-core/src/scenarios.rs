//! Scenario Presets for FDTD Simulation
//!
//! Pre-built experiment configurations that demonstrate various
//! electromagnetic phenomena like diffraction, waveguiding, and reflection.

use wasm_bindgen::prelude::*;

/// Scenario preset IDs
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ScenarioId {
    /// Empty grid - just vacuum
    Empty,
    /// Double slit diffraction experiment
    DoubleSlit,
    /// Dielectric waveguide (bent fiber optic)
    Waveguide,
    /// Parabolic metal reflector with point source
    ParabolicReflector,
    /// Glass prism demonstrating total internal reflection
    TotalInternalReflection,
    /// Photonic crystal lattice
    PhotonicCrystal,
    /// Lens focusing demonstration
    Lens,
    /// Fresnel zone plate lens
    FresnelLens,
}

/// Get scenario name by ID
#[wasm_bindgen]
pub fn get_scenario_name(id: u8) -> String {
    match id {
        0 => "Empty Grid".to_string(),
        1 => "Double Slit".to_string(),
        2 => "Waveguide".to_string(),
        3 => "Parabolic Reflector".to_string(),
        4 => "Total Internal Reflection".to_string(),
        5 => "Photonic Crystal".to_string(),
        6 => "Lens".to_string(),
        7 => "Fresnel Lens".to_string(),
        _ => "Unknown".to_string(),
    }
}

/// Get scenario description
#[wasm_bindgen]
pub fn get_scenario_description(id: u8) -> String {
    match id {
        0 => "Empty vacuum grid".to_string(),
        1 => "Wave diffraction through two slits".to_string(),
        2 => "Guided wave in bent dielectric".to_string(),
        3 => "Focusing waves with curved reflector".to_string(),
        4 => "Light trapping in glass prism".to_string(),
        5 => "Periodic dielectric structure".to_string(),
        6 => "Convex lens focusing".to_string(),
        7 => "Fresnel zone plate focusing".to_string(),
        _ => "".to_string(),
    }
}

/// Scenario builder - creates geometry for a given preset
pub struct ScenarioBuilder {
    width: usize,
    height: usize,
}

impl ScenarioBuilder {
    pub fn new(width: usize, height: usize) -> Self {
        ScenarioBuilder { width, height }
    }

    /// Build Double Slit experiment geometry
    /// Returns: Vec of (x, y, material_id) for cells to set
    pub fn build_double_slit(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Wall position (1/3 from left)
        let wall_x = w / 3;

        // Slit parameters
        let slit_width = 4;
        let slit_separation = 40;
        let slit_y1 = h / 2 - slit_separation / 2 - slit_width / 2;
        let slit_y2 = h / 2 + slit_separation / 2 - slit_width / 2;

        // Build metal wall with two slits
        for y in 0..h {
            let in_slit1 = y >= slit_y1 && y < slit_y1 + slit_width;
            let in_slit2 = y >= slit_y2 && y < slit_y2 + slit_width;

            if !in_slit1 && !in_slit2 {
                // Metal wall (3 cells thick for visibility)
                for dx in 0..3 {
                    cells.push((wall_x + dx, y, 3)); // 3 = Metal
                }
            }
        }

        cells
    }

    /// Build Dielectric Waveguide (bent fiber)
    pub fn build_waveguide(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        let core_width = 10;
        let core_material = 1; // Glass (ε = 2.25)

        // Horizontal section (left side)
        let y_center = h / 2;
        for x in 50..(w / 2) {
            for dy in 0..core_width {
                let y = y_center - core_width / 2 + dy;
                if y < h {
                    cells.push((x, y, core_material));
                }
            }
        }

        // Bend (45 degree arc)
        let bend_center_x = w / 2;
        let bend_center_y = y_center + 80;
        let bend_radius = 80;

        for angle in 0..90 {
            let rad = (angle as f32) * std::f32::consts::PI / 180.0;
            // Center point calculation (kept for documentation, actual drawing uses radius variation)
            let _cx = bend_center_x as f32 + bend_radius as f32 * rad.sin();
            let _cy = bend_center_y as f32 - bend_radius as f32 * rad.cos();

            for r in (bend_radius - core_width / 2)..(bend_radius + core_width / 2) {
                let x = (bend_center_x as f32 + r as f32 * rad.sin()) as usize;
                let y = (bend_center_y as f32 - r as f32 * rad.cos()) as usize;
                if x < w && y < h {
                    cells.push((x, y, core_material));
                }
            }
        }

        // Vertical section (going up)
        for y in (bend_center_y - bend_radius)..(bend_center_y + 50) {
            for dx in 0..core_width {
                let x = bend_center_x + bend_radius - core_width / 2 + dx;
                if x < w && y < h {
                    cells.push((x, y, core_material));
                }
            }
        }

        cells
    }

    /// Build Parabolic Reflector
    pub fn build_parabolic_reflector(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Parabola: x = a*y^2, placed on right side
        // Focus would be at focus_x for receiving scenario
        let _focus_x = w * 2 / 3;
        let a = 0.005; // Parabola coefficient
        let vertex_x = w - 50;

        for y in (h / 4)..(h * 3 / 4) {
            let dy = (y as f32) - (h as f32 / 2.0);
            let x = vertex_x as f32 - a * dy * dy;

            let xi = x as usize;
            if xi > 0 && xi < w {
                // Metal reflector (3 cells thick)
                for dx in 0..3 {
                    if xi + dx < w {
                        cells.push((xi + dx, y, 3)); // Metal
                    }
                }
            }
        }

        cells
    }

    /// Build Total Internal Reflection prism
    pub fn build_tir_prism(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Triangular prism (right-angle triangle)
        let prism_left = w / 3;
        let prism_right = w * 2 / 3;
        let prism_top = h / 4;
        let prism_bottom = h * 3 / 4;

        // Glass prism (ε = 2.25)
        for y in prism_top..prism_bottom {
            // Calculate x extent based on y (diagonal edge)
            let progress = (y - prism_top) as f32 / (prism_bottom - prism_top) as f32;
            let x_end = prism_left + ((prism_right - prism_left) as f32 * progress) as usize;

            for x in prism_left..x_end {
                cells.push((x, y, 1)); // Glass
            }
        }

        cells
    }

    /// Build Photonic Crystal (periodic holes)
    pub fn build_photonic_crystal(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Background: Glass slab
        let slab_top = h / 3;
        let slab_bottom = h * 2 / 3;

        for y in slab_top..slab_bottom {
            for x in 100..(w - 100) {
                cells.push((x, y, 5)); // Crystal (ε = 4.0)
            }
        }

        // Periodic holes (vacuum)
        let period = 20;
        let hole_radius = 6;

        for row in 0..10 {
            for col in 0..20 {
                let cx = 110 + col * period + (row % 2) * (period / 2);
                let cy = slab_top + 10 + row * period;

                // Cut circular holes
                for dy in -(hole_radius as i32)..=(hole_radius as i32) {
                    for dx in -(hole_radius as i32)..=(hole_radius as i32) {
                        if dx * dx + dy * dy <= hole_radius as i32 * hole_radius as i32 {
                            let x = (cx as i32 + dx) as usize;
                            let y = (cy as i32 + dy) as usize;
                            if x < w && y < h {
                                cells.push((x, y, 0)); // Vacuum holes
                            }
                        }
                    }
                }
            }
        }

        cells
    }

    /// Build Convex Lens
    pub fn build_lens(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Lens parameters
        let lens_x = w / 2;
        let lens_radius = 150; // Curvature radius
        let lens_thickness = 30;

        for y in (h / 4)..(h * 3 / 4) {
            let dy = (y as f32) - (h as f32 / 2.0);

            // Calculate lens profile (two circular arcs)
            let arc_offset = ((lens_radius as f32).powi(2) - dy.powi(2)).sqrt();
            let left_edge =
                lens_x as f32 - lens_thickness as f32 / 2.0 - (lens_radius as f32 - arc_offset);
            let right_edge =
                lens_x as f32 + lens_thickness as f32 / 2.0 + (lens_radius as f32 - arc_offset);

            for x in (left_edge as usize)..(right_edge as usize) {
                if x < w {
                    cells.push((x, y, 1)); // Glass
                }
            }
        }

        cells
    }

    /// Build Fresnel Zone Plate Lens
    /// Uses concentric dielectric rings to focus waves
    pub fn build_fresnel_lens(&self) -> Vec<(usize, usize, u32)> {
        let mut cells = Vec::new();
        let w = self.width;
        let h = self.height;

        // Lens position (1/4 from left for good wave propagation distance)
        let center_x = w / 4;
        let center_y = h / 2;
        let plate_thickness = 6;

        // Fresnel zone plate parameters
        // Formula: r_n = sqrt(2 * n * f * lambda)
        let focal_length: f32 = 200.0;
        let lambda: f32 = 20.0; // Wavelength matches typical source frequency

        for y in 0..h {
            let dy = (y as f32) - (center_y as f32);
            let r = dy.abs();

            // Calculate which Fresnel zone this radius falls into
            // n = r² / (f * λ)
            let n = (r.powi(2) / (focal_length * lambda)).floor() as i32;

            // Place dielectric material in even zones (constructive interference)
            if n % 2 == 0 && n < 20 {
                // Only within the lens vertical extent
                if r < (h as f32 / 3.0) {
                    for dx in 0..plate_thickness {
                        let x = center_x + dx;
                        if x < w {
                            cells.push((x, y, 1)); // Glass (ε ≈ 2.25)
                        }
                    }
                }
            }
        }

        cells
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_double_slit() {
        let builder = ScenarioBuilder::new(512, 512);
        let cells = builder.build_double_slit();
        assert!(!cells.is_empty());
    }

    #[test]
    fn test_scenario_names() {
        assert_eq!(get_scenario_name(1), "Double Slit");
        assert_eq!(get_scenario_name(2), "Waveguide");
    }
}
