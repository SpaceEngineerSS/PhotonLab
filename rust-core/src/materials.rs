//! Material System for FDTD Simulation
//!
//! Defines electromagnetic material properties and provides
//! preset configurations for common materials.

use wasm_bindgen::prelude::*;

/// Material properties for electromagnetic simulation
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct Material {
    /// Relative permittivity (dielectric constant)
    /// ε_r = 1.0 for vacuum, 2.25 for glass, 78 for water
    pub epsilon_r: f32,

    /// Relative permeability (usually 1.0 for non-magnetic materials)
    pub mu_r: f32,

    /// Electrical conductivity (S/m)
    /// σ = 0 for perfect dielectrics, high for metals
    pub sigma: f32,

    /// Material type identifier for special handling
    pub material_type: MaterialType,
}

/// Material type for special handling in physics engine
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MaterialType {
    /// Normal dielectric material
    Dielectric = 0,
    /// Perfect Electric Conductor (metal) - forces Ez = 0
    PEC = 1,
    /// Absorbing material for boundaries
    Absorber = 2,
    /// Source region - does not block fields
    Source = 3,
}

#[wasm_bindgen]
impl Material {
    /// Create a new material with specified properties
    #[wasm_bindgen(constructor)]
    pub fn new(epsilon_r: f32, mu_r: f32, sigma: f32) -> Material {
        Material {
            epsilon_r: epsilon_r.max(0.01), // Prevent division by zero
            mu_r: mu_r.max(0.01),
            sigma: sigma.max(0.0),
            material_type: MaterialType::Dielectric,
        }
    }

    /// Create a PEC (Perfect Electric Conductor) material
    pub fn pec() -> Material {
        Material {
            epsilon_r: 1.0,
            mu_r: 1.0,
            sigma: 0.0,
            material_type: MaterialType::PEC,
        }
    }

    /// Create an absorbing material
    pub fn absorber(sigma: f32) -> Material {
        Material {
            epsilon_r: 1.0,
            mu_r: 1.0,
            sigma,
            material_type: MaterialType::Absorber,
        }
    }

    /// Check if this is a PEC material
    pub fn is_pec(&self) -> bool {
        self.material_type == MaterialType::PEC
    }
}

// ============================================================================
// Material Presets
// ============================================================================

/// Material ID constants for JavaScript interop
#[wasm_bindgen]
pub struct MaterialPresets;

#[wasm_bindgen]
impl MaterialPresets {
    /// Get Vacuum material (ε=1, σ=0)
    pub fn vacuum() -> Material {
        Material::new(1.0, 1.0, 0.0)
    }

    /// Get Air material (essentially vacuum, ε≈1)
    pub fn air() -> Material {
        Material::new(1.0006, 1.0, 0.0)
    }

    /// Get Glass material (ε=2.25)
    /// Wave speed = c/1.5
    pub fn glass() -> Material {
        Material::new(2.25, 1.0, 0.0)
    }

    /// Get Dense Glass/Crystal material (ε=4.0)
    /// Wave speed = c/2
    pub fn crystal() -> Material {
        Material::new(4.0, 1.0, 0.0)
    }

    /// Get Water material (ε=78, slight conductivity)
    /// Extremely high dielectric constant
    pub fn water() -> Material {
        Material::new(78.0, 1.0, 0.05)
    }

    /// Get Silicon material (ε=11.7)
    pub fn silicon() -> Material {
        Material::new(11.7, 1.0, 0.0)
    }

    /// Get Metal (PEC) material
    /// Perfect reflector - Ez forced to zero
    pub fn metal() -> Material {
        Material::pec()
    }

    /// Get Lossy material (absorber)
    /// High conductivity causes wave attenuation
    pub fn absorber() -> Material {
        Material::absorber(0.5)
    }

    /// Get Strong Absorber for PML-like boundaries
    pub fn strong_absorber() -> Material {
        Material::absorber(2.0)
    }
}

/// Get material by ID (for JavaScript interop)
/// 0 = Vacuum, 1 = Glass, 2 = Water, 3 = Metal, 4 = Absorber, 5 = Crystal, 6 = Silicon
#[wasm_bindgen]
pub fn get_material_by_id(id: u32) -> Material {
    match id {
        0 => MaterialPresets::vacuum(),
        1 => MaterialPresets::glass(),
        2 => MaterialPresets::water(),
        3 => MaterialPresets::metal(),
        4 => MaterialPresets::absorber(),
        5 => MaterialPresets::crystal(),
        6 => MaterialPresets::silicon(),
        _ => MaterialPresets::vacuum(),
    }
}

/// Get material name by ID
#[wasm_bindgen]
pub fn get_material_name(id: u32) -> String {
    match id {
        0 => "Vacuum".to_string(),
        1 => "Glass".to_string(),
        2 => "Water".to_string(),
        3 => "Metal".to_string(),
        4 => "Absorber".to_string(),
        5 => "Crystal".to_string(),
        6 => "Silicon".to_string(),
        _ => "Unknown".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vacuum_preset() {
        let vac = MaterialPresets::vacuum();
        assert!((vac.epsilon_r - 1.0).abs() < 0.001);
        assert!((vac.sigma - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_pec_detection() {
        let metal = MaterialPresets::metal();
        assert!(metal.is_pec());

        let glass = MaterialPresets::glass();
        assert!(!glass.is_pec());
    }
}
