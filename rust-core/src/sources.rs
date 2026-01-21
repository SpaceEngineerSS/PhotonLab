//! Advanced Source Types for FDTD Simulation
//!
//! Supports various excitation methods:
//! - Point source (impulse or continuous)
//! - Plane wave (uniform injection along a line)
//! - Gaussian pulse (time-domain wavepacket)

use wasm_bindgen::prelude::*;

/// Source type enumeration
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SourceType {
    /// Single point continuous sinusoidal
    PointContinuous,
    /// Single point Gaussian pulse
    PointGaussian,
    /// Plane wave along vertical line
    PlaneWaveX,
    /// Plane wave along horizontal line
    PlaneWaveY,
    /// Soft source (additive)
    Soft,
    /// Hard source (replacement)
    Hard,
}

/// Time-domain source function
#[wasm_bindgen]
#[derive(Clone)]
pub struct SourceFunction {
    /// Source waveform type
    pub waveform: Waveform,
    /// Frequency for continuous waves (normalized)
    frequency: f32,
    /// Pulse center time for Gaussian
    t0: f32,
    /// Pulse width for Gaussian
    tau: f32,
    /// Current amplitude
    amplitude: f32,
}

/// Waveform types
#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Waveform {
    /// Continuous sinusoidal: sin(2πft)
    Sinusoidal,
    /// Gaussian pulse: exp(-((t-t0)/τ)²)
    Gaussian,
    /// Modulated Gaussian: sin(2πft) * exp(-((t-t0)/τ)²)
    ModulatedGaussian,
    /// Ricker wavelet (Mexican hat)
    Ricker,
    /// Step function
    Step,
}

#[wasm_bindgen]
impl SourceFunction {
    /// Create a continuous sinusoidal source
    #[wasm_bindgen(constructor)]
    pub fn new_sinusoidal(frequency: f32, amplitude: f32) -> SourceFunction {
        SourceFunction {
            waveform: Waveform::Sinusoidal,
            frequency,
            t0: 0.0,
            tau: 1.0,
            amplitude,
        }
    }

    /// Create a Gaussian pulse source
    /// t0: center time (in time steps)
    /// tau: pulse width (in time steps)
    pub fn new_gaussian(t0: f32, tau: f32, amplitude: f32) -> SourceFunction {
        SourceFunction {
            waveform: Waveform::Gaussian,
            frequency: 0.0,
            t0,
            tau,
            amplitude,
        }
    }

    /// Create a modulated Gaussian (Gaussian envelope with carrier)
    pub fn new_modulated_gaussian(
        frequency: f32,
        t0: f32,
        tau: f32,
        amplitude: f32,
    ) -> SourceFunction {
        SourceFunction {
            waveform: Waveform::ModulatedGaussian,
            frequency,
            t0,
            tau,
            amplitude,
        }
    }

    /// Create a Ricker wavelet (second derivative of Gaussian)
    pub fn new_ricker(t0: f32, tau: f32, amplitude: f32) -> SourceFunction {
        SourceFunction {
            waveform: Waveform::Ricker,
            frequency: 0.0,
            t0,
            tau,
            amplitude,
        }
    }

    /// Evaluate source function at time t
    pub fn evaluate(&self, t: f32) -> f32 {
        match self.waveform {
            Waveform::Sinusoidal => {
                self.amplitude * (2.0 * std::f32::consts::PI * self.frequency * t).sin()
            }
            Waveform::Gaussian => {
                let arg = (t - self.t0) / self.tau;
                self.amplitude * (-arg * arg).exp()
            }
            Waveform::ModulatedGaussian => {
                let arg = (t - self.t0) / self.tau;
                let envelope = (-arg * arg).exp();
                let carrier = (2.0 * std::f32::consts::PI * self.frequency * t).sin();
                self.amplitude * envelope * carrier
            }
            Waveform::Ricker => {
                let arg = (t - self.t0) / self.tau;
                let arg2 = arg * arg;
                self.amplitude * (1.0 - 2.0 * arg2) * (-arg2).exp()
            }
            Waveform::Step => {
                if t >= self.t0 {
                    self.amplitude
                } else {
                    0.0
                }
            }
        }
    }

    /// Get amplitude
    pub fn get_amplitude(&self) -> f32 {
        self.amplitude
    }

    /// Set amplitude
    pub fn set_amplitude(&mut self, amplitude: f32) {
        self.amplitude = amplitude;
    }
}

/// Plane wave source configuration
#[wasm_bindgen]
pub struct PlaneWaveSource {
    /// Position of the source line
    position: usize,
    /// Orientation: true = vertical (constant x), false = horizontal (constant y)
    is_vertical: bool,
    /// Source function
    source_fn: SourceFunction,
    /// Courant number for soft source scaling
    courant: f32,
}

#[wasm_bindgen]
impl PlaneWaveSource {
    /// Create a new vertical plane wave source at x = position
    #[wasm_bindgen(constructor)]
    pub fn new_vertical(position: usize, frequency: f32, courant: f32) -> PlaneWaveSource {
        PlaneWaveSource {
            position,
            is_vertical: true,
            source_fn: SourceFunction::new_sinusoidal(frequency, 1.0),
            courant,
        }
    }

    /// Create a horizontal plane wave source at y = position
    pub fn new_horizontal(position: usize, frequency: f32, courant: f32) -> PlaneWaveSource {
        PlaneWaveSource {
            position,
            is_vertical: false,
            source_fn: SourceFunction::new_sinusoidal(frequency, 1.0),
            courant,
        }
    }

    /// Get the position
    pub fn get_position(&self) -> usize {
        self.position
    }

    /// Set to Gaussian pulse mode
    pub fn set_gaussian(&mut self, t0: f32, tau: f32) {
        self.source_fn = SourceFunction::new_gaussian(t0, tau, 1.0);
    }

    /// Inject plane wave into Ez field at time step t
    /// Uses Total-Field/Scattered-Field (TF/SF) formulation for clean injection
    pub fn inject(&self, ez: &mut [f32], t: f32, width: usize, height: usize) {
        let value = self.source_fn.evaluate(t);

        // Soft source: add value (allows waves to pass through)
        // Scale by Courant number for proper amplitude matching
        let scaled_value = value * self.courant;

        if self.is_vertical {
            // Inject along vertical line at x = position
            let x = self.position;
            if x < width {
                for y in 1..height - 1 {
                    let idx = y * width + x;
                    ez[idx] += scaled_value;
                }
            }
        } else {
            // Inject along horizontal line at y = position
            let y = self.position;
            if y < height {
                for x in 1..width - 1 {
                    let idx = y * width + x;
                    ez[idx] += scaled_value;
                }
            }
        }
    }
}

/// Probe for measuring field values at a specific point
#[wasm_bindgen]
pub struct Probe {
    x: usize,
    y: usize,
    /// Circular buffer of recorded values
    buffer: Vec<f32>,
    /// Buffer write position
    write_pos: usize,
    /// Buffer capacity
    capacity: usize,
}

#[wasm_bindgen]
impl Probe {
    /// Create a new probe at position (x, y)
    #[wasm_bindgen(constructor)]
    pub fn new(x: usize, y: usize, buffer_size: usize) -> Probe {
        Probe {
            x,
            y,
            buffer: vec![0.0; buffer_size],
            write_pos: 0,
            capacity: buffer_size,
        }
    }

    /// Get probe X position
    pub fn get_x(&self) -> usize {
        self.x
    }

    /// Get probe Y position
    pub fn get_y(&self) -> usize {
        self.y
    }

    /// Set probe position
    pub fn set_position(&mut self, x: usize, y: usize) {
        self.x = x;
        self.y = y;
        // Clear buffer on move
        self.buffer.fill(0.0);
        self.write_pos = 0;
    }

    /// Record current field value
    pub fn record(&mut self, ez: &[f32], width: usize) {
        let idx = self.y * width + self.x;
        if idx < ez.len() {
            self.buffer[self.write_pos] = ez[idx];
            self.write_pos = (self.write_pos + 1) % self.capacity;
        }
    }

    /// Get the recorded buffer for visualization
    /// Returns values in chronological order (oldest first)
    pub fn get_buffer_ptr(&self) -> *const f32 {
        self.buffer.as_ptr()
    }

    /// Get buffer size
    pub fn get_buffer_size(&self) -> usize {
        self.capacity
    }

    /// Get the most recent value
    pub fn get_current_value(&self) -> f32 {
        let prev_pos = if self.write_pos == 0 {
            self.capacity - 1
        } else {
            self.write_pos - 1
        };
        self.buffer[prev_pos]
    }

    /// Get write position for proper buffer reading
    pub fn get_write_pos(&self) -> usize {
        self.write_pos
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.fill(0.0);
        self.write_pos = 0;
    }
}

/// Helper function to create a Gaussian pulse at specific parameters
#[wasm_bindgen]
pub fn gaussian_pulse(t: f32, t0: f32, tau: f32) -> f32 {
    let arg = (t - t0) / tau;
    (-arg * arg).exp()
}

/// Helper function for modulated Gaussian
#[wasm_bindgen]
pub fn modulated_gaussian(t: f32, frequency: f32, t0: f32, tau: f32) -> f32 {
    let arg = (t - t0) / tau;
    let envelope = (-arg * arg).exp();
    let carrier = (2.0 * std::f32::consts::PI * frequency * t).sin();
    envelope * carrier
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gaussian_pulse() {
        // Peak at t0
        let pulse = gaussian_pulse(50.0, 50.0, 10.0);
        assert!((pulse - 1.0).abs() < 1e-6);

        // Decays away from center
        let off_center = gaussian_pulse(60.0, 50.0, 10.0);
        assert!(off_center < 1.0);
    }

    #[test]
    fn test_source_function() {
        let src = SourceFunction::new_gaussian(50.0, 10.0, 2.0);
        let val = src.evaluate(50.0);
        assert!((val - 2.0).abs() < 1e-6); // amplitude = 2.0
    }

    #[test]
    fn test_probe() {
        let mut probe = Probe::new(10, 10, 100);
        let ez = vec![0.5; 200 * 200];
        probe.record(&ez, 200);
        assert!((probe.get_current_value() - 0.5).abs() < 1e-6);
    }
}
