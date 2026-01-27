//! PhotonLab Core - FDTD Electromagnetic Solver v2.0
//!
//! High-performance 2D electromagnetic field solver using the
//! Finite-Difference Time-Domain (FDTD) method with Yee lattice algorithm.
//!
//! Compiled to WebAssembly for browser-based simulation.
//!
//! Author: Mehmet Gümüş (github.com/SpaceEngineerSS)

mod cpml;
mod fdtd;
mod materials;
mod scenarios;
mod sources;

use wasm_bindgen::prelude::*;

// Re-export FDTDGrid for JavaScript access
pub use fdtd::FDTDGrid;

// Re-export materials system
pub use materials::{
    get_material_by_id, get_material_name, Material, MaterialPresets, MaterialType,
};

// Re-export CPML
pub use cpml::CPML;

// Re-export scenarios
pub use scenarios::{get_scenario_description, get_scenario_name, ScenarioId};

// Re-export sources (v2.0: includes phased arrays, gaussian beam, spectrum analyzer)
pub use sources::{
    gaussian_pulse,
    modulated_gaussian,
    GaussianBeamSource,
    // Advanced sources (v2.0)
    PhasedArraySource,
    // Basic sources
    PlaneWaveSource,
    Probe,
    SourceElement,
    SourceFunction,
    SourceType,
    // Spectrum analysis (v2.0)
    SpectrumAnalyzer,
    Waveform,
};

/// Initialize the Wasm module (call once at startup)
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get library version string
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get WebAssembly memory for zero-copy array access
/// JavaScript can create Float32Array views over this memory
#[wasm_bindgen]
pub fn get_wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}
