/**
 * SimCanvas Component
 * 
 * High-performance WebGL2 renderer for FDTD electric field visualization.
 * Uses zero-copy data transfer from Wasm memory to GPU texture.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { FDTDGrid } from 'photonlab-core';

// Vertex shader - simple fullscreen quad
const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Map from [-1,1] to [0,1] for texture coordinates
    v_texCoord = (a_position + 1.0) / 2.0;
}
`;

// Fragment shader - scientific heatmap colormap
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_field;
uniform float u_gain;

in vec2 v_texCoord;
out vec4 fragColor;

// Diverging colormap: Blue (negative) -> Black (zero) -> Red (positive)
vec3 divergingColormap(float value) {
    // Apply gain and clamp to [-1, 1]
    float v = clamp(value * u_gain, -1.0, 1.0);
    
    if (v > 0.0) {
        // Positive: Black to Red to Yellow
        float t = v;
        return vec3(
            t,                          // Red
            t * t * 0.8,                // Green (for yellow tint)
            0.0                         // Blue
        );
    } else {
        // Negative: Black to Blue to Cyan  
        float t = -v;
        return vec3(
            0.0,                        // Red
            t * t * 0.5,                // Green (for cyan tint)
            t                           // Blue
        );
    }
}

// Alternative: Viridis-like colormap
vec3 viridisColormap(float value) {
    float v = clamp(value * u_gain, -1.0, 1.0);
    float t = (v + 1.0) * 0.5; // Map to [0, 1]
    
    // Simplified viridis approximation
    vec3 c0 = vec3(0.267, 0.004, 0.329);
    vec3 c1 = vec3(0.282, 0.140, 0.457);
    vec3 c2 = vec3(0.190, 0.407, 0.556);
    vec3 c3 = vec3(0.127, 0.566, 0.550);
    vec3 c4 = vec3(0.206, 0.718, 0.472);
    vec3 c5 = vec3(0.565, 0.811, 0.262);
    vec3 c6 = vec3(0.993, 0.906, 0.144);
    
    float segment = t * 6.0;
    int idx = int(floor(segment));
    float f = fract(segment);
    
    if (idx <= 0) return mix(c0, c1, f);
    if (idx == 1) return mix(c1, c2, f);
    if (idx == 2) return mix(c2, c3, f);
    if (idx == 3) return mix(c3, c4, f);
    if (idx == 4) return mix(c4, c5, f);
    return mix(c5, c6, f);
}

void main() {
    // Sample the electric field (stored in red channel)
    float field = texture(u_field, v_texCoord).r;
    
    // Use diverging colormap for physics visualization
    vec3 color = divergingColormap(field);
    
    fragColor = vec4(color, 1.0);
}
`;

interface SimCanvasProps {
    gridRef: React.RefObject<FDTDGrid | null>;
    memoryRef: React.RefObject<WebAssembly.Memory | null>;
    width: number;
    height: number;
    onFrame: (callback: () => void) => void;
    // External mouse handlers (from App.tsx)
    onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    cursorStyle?: string;
    // v2.0: Optional external canvas ref for export functionality
    canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function SimCanvas({
    gridRef,
    memoryRef,
    width,
    height,
    onFrame,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    cursorStyle = 'crosshair',
    canvasRef: externalCanvasRef,
}: SimCanvasProps) {
    const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const gainUniformRef = useRef<WebGLUniformLocation | null>(null);

    // Callback ref to set both internal and external refs
    const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        internalCanvasRef.current = canvas;
        if (externalCanvasRef && 'current' in externalCanvasRef) {
            (externalCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
        }
    }, [externalCanvasRef]);

    // Initialize WebGL2
    useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;

        // Get WebGL2 context with floating point texture support
        const gl = canvas.getContext('webgl2', {
            antialias: false,
            depth: false,
            stencil: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
        });

        if (!gl) {
            console.error('[SimCanvas] WebGL2 not supported');
            return;
        }

        // Check for required extensions
        const floatExt = gl.getExtension('EXT_color_buffer_float');
        if (!floatExt) {
            console.warn('[SimCanvas] EXT_color_buffer_float not available');
        }

        glRef.current = gl;

        // Compile shaders
        const vertShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

        if (!vertShader || !fragShader) return;

        // Create program
        const program = gl.createProgram()!;
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('[SimCanvas] Program link error:', gl.getProgramInfoLog(program));
            return;
        }

        programRef.current = program;
        gl.useProgram(program);

        // Get uniform locations
        gainUniformRef.current = gl.getUniformLocation(program, 'u_gain');
        gl.uniform1f(gainUniformRef.current, 5.0); // Initial gain

        // Set up fullscreen quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]), gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Create texture for field data
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Configure texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Initialize texture with empty data
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R32F,        // Internal format: single 32-bit float
            width,
            height,
            0,
            gl.RED,         // Format
            gl.FLOAT,       // Type
            null
        );

        textureRef.current = texture;

        // Set viewport
        gl.viewport(0, 0, canvas.width, canvas.height);

        console.log('[SimCanvas] WebGL2 initialized');

        return () => {
            gl.deleteTexture(texture);
            gl.deleteProgram(program);
            gl.deleteShader(vertShader);
            gl.deleteShader(fragShader);
        };
    }, [width, height]);

    // Render function - called on each frame
    const render = useCallback(() => {
        const gl = glRef.current;
        const grid = gridRef.current;
        const memory = memoryRef.current;
        const texture = textureRef.current;

        if (!gl || !grid || !memory || !texture) return;

        // Get pointer to Ez field data in Wasm memory
        const ptr = grid.get_ez_ptr();
        const len = grid.get_ez_len();

        // Create Float32Array view over Wasm memory (ZERO COPY!)
        const fieldData = new Float32Array(memory.buffer, ptr, len);

        // Upload field data to GPU texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, 0,
            width, height,
            gl.RED,
            gl.FLOAT,
            fieldData
        );

        // Draw fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }, [gridRef, memoryRef, width, height]);

    // Register render callback with simulation hook
    useEffect(() => {
        onFrame(render);
        // Initial render
        render();
    }, [onFrame, render]);

    return (
        <canvas
            ref={setCanvasRef}
            width={width}
            height={height}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
                width: '100%',
                height: '100%',
                imageRendering: 'pixelated',
                cursor: cursorStyle,
            }}
        />
    );
}

// Helper function to compile shaders
function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[SimCanvas] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
