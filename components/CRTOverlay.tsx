'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';

// --- SHADER DEFINITION ---
const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uScanlineStrength;
uniform float uNoiseStrength;
uniform float uCurvature;

varying vec2 vUv;

// Curvature function (Barrel Distortion)
vec2 curve(vec2 uv) {
    uv = (uv - 0.5) * 2.0; // Remap to -1 to 1
    uv *= 1.1; // Zoom out slightly to fit curve
    vec2 offset = abs(uv.yx) / vec2(uCurvature, uCurvature);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5; // Remap back to 0 to 1
    return uv;
}

// Random noise
float random(vec2 uv) {
    return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = curve(vUv);
    
    // Bounds check - discard pixels outside curvature
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Chromatic Aberration (RGB Split at edges)
    float aberration = 0.003 * dist;
    vec2 distVec = 0.5 - uv;
    float dist = dot(distVec, distVec);
    
    // Offset channels based on distance from center
    vec4 rColor = texture2D(tDiffuse, uv + vec2(aberration * 2.0, 0.0));
    vec4 gColor = texture2D(tDiffuse, uv); // Green is anchor
    vec4 bColor = texture2D(tDiffuse, uv - vec2(aberration * 2.0, 0.0));
    
    vec3 color = vec3(rColor.r, gColor.g, bColor.b);

    // Scanlines
    float scanline = sin(uv.y * 800.0 + uTime * 5.0) * 0.5 + 0.5;
    color *= 1.0 - (scanline * uScanlineStrength);

    // Static Noise
    float noise = random(uv + uTime);
    color *= 1.0 - (noise * uNoiseStrength);

    // Vignette
    float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vignette = pow(vignette * 15.0, 0.25);
    color *= vignette;

    // Pulse brightness slightly (Flicker)
    color *= 0.98 + 0.02 * sin(uTime * 10.0);

    gl_FragColor = vec4(color, 1.0);
}
`;

// Optimized Fragment Shader for "Balatro" Look (Fixing syntax errors in above pseudo-code)
const finalFragmentShader = `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

// --- CONFIG ---
const float CURVE_INTENSITY = 4.0; // Higher = flatter, Lower = more curved. Try 4.0 or 5.0
const float VIGNETTE_AGRESSIVENESS = 15.0; // Higher = tighter vignette
const float SCANLINE_COUNT = 600.0;
const float SCANLINE_OPACITY = 0.15; // Subtle
const float NOISE_OPACITY = 0.08; // Grain
const float ABERRATION_OFFSET = 0.003; 

vec2 curve(vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    vec2 offset = abs(uv.yx) / vec2(CURVE_INTENSITY, CURVE_INTENSITY);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = curve(vUv);
    
    // Bounds check (Basic)
    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0){
         gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
         return;
    }
    
    // --- ROUNDED CORNERS (Robust Vignette Approach) ---
    // Calculate distance from edge using product of UVs
    // This creates a smooth rounded-rect gradient naturally
    float edge = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    
    // Hard cut with small smooth transition to create "Rounded Bezel"
    // '0.005' roughly controls the corner radius/tightness here
    float mask = smoothstep(0.0, 0.02, edge * 50.0);
    
    // Apply Mask immediately to black out corners
    if (mask < 0.1) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // --- GLITCH SWEEP ("Hum Bar") ---
    vec2 distortedUV = uv;
    
    // Faster: 10 seconds cycle, sweep takes 5.0 seconds
    float sweepCycle = mod(uTime, 10.0);
    float sweepY = -10.0;
    
    if (sweepCycle < 5.0) {
        // Linear drop top to bottom
        sweepY = 1.1 - (sweepCycle / 5.0) * 1.2; 
    }
    
    float sweepDist = abs(uv.y - sweepY);
    // Reverted size: 0.04 (Larger, "Natural")
    float sweepWidth = 0.04;
    
    // Calculate normalized distance from center (0.0 = center, 1.0 = edge)
    float edgeFactor = sweepDist / sweepWidth;

    if (sweepDist < sweepWidth) {
         // Distortion: No wobble (no sine wave). Just a directional "drag" or "slip".
         // Strength ripples from center of line
         float strength = smoothstep(sweepWidth, 0.0, sweepDist);
         
         // Shift ONLY to one side (Sync Tear)
         distortedUV.x -= 0.02 * strength; 
    }

    // Chromatic Aberration
    vec2 d = abs(uv - 0.5);
    float dist = dot(d, d); 
    float shift = ABERRATION_OFFSET * dist * 3.0;

    // Sample channels
    float sH = shift; 
    
    // Chromatic accumulation at limits (KEPT from latest request)
    if (sweepDist < sweepWidth) {
        // Strong chromatic split ONLY at the very top/bottom edges of the line
        // We use smoothstep to isolate the outer 25% of the line
        float outerEdge = smoothstep(0.75, 1.0, edgeFactor);
        
        // This makes red/blue split huge exactly where the line meets the normal image
        sH += 0.005 * outerEdge; 
    }

    vec4 cr = texture2D(tDiffuse, distortedUV + vec2(sH, 0.0));
    vec4 cg = texture2D(tDiffuse, distortedUV);
    vec4 cb = texture2D(tDiffuse, distortedUV - vec2(sH, 0.0));

    // Combine
    vec3 col = vec3(cr.r, cg.g, cb.b);

    // Scanlines (Moving slowly)
    float s = sin(uv.y * SCANLINE_COUNT - uTime * 2.0); 
    s = (s * 0.5 + 0.5); 
    // Reduced opacity to keep brightness (was 0.15)
    col *= 1.0 - (s * 0.12);

    // Noise
    float n = random(uv + mod(uTime, 10.0));
    col *= 1.0 - (n * NOISE_OPACITY);

    // Vignette
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vig = pow(vig * VIGNETTE_AGRESSIVENESS, 0.25);
    col *= vig;

    // --- CRT GLOW / BRIGHTNESS ---
    // 1. Boost overall brightness to compensate for mask
    col *= 1.35; 
    
    // 2. Phosphor "Lift" (Shadowsoftness)
    // CRTs rarely hit pure black due to glass reflection and phosphor glow.
    // We lift the blacks slightly and apply a gamma curve to smooth limits.
    col += 0.02; // Lift black floor
    col = pow(col, vec3(0.95)); // Soften contrast (Gamma lift)

    gl_FragColor = vec4(col, 1.0);
}
`;

export function CRTOverlay() {
    const { gl, scene, camera, size } = useThree();
    const screenMesh = useRef<THREE.Mesh>(null);
    const sceneCamera = useRef<THREE.Camera>(camera);

    // 1. Create Render Target (FBO)
    const renderTarget = useMemo(() => {
        const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
        });
        return rt;
    }, [size]);

    // 2. Setup Shader Material
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(size.width, size.height) }
            },
            vertexShader: vertexShader,
            fragmentShader: finalFragmentShader,
            depthWrite: false,
            depthTest: false,
        });
    }, [size]);

    useEffect(() => {
        // Resize render target on window resize
        renderTarget.setSize(size.width, size.height);
        material.uniforms.uResolution.value.set(size.width, size.height);
    }, [size, renderTarget, material]);

    // 3. Separate Scene for the Screen Quad
    const screenScene = useMemo(() => {
        const sc = new THREE.Scene();
        return sc;
    }, []);

    // 4. Render Loop
    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // A. Render the ACTUAL scene to the FBO
        gl.setRenderTarget(renderTarget);
        gl.clear();
        gl.render(scene, camera);

        // B. Set uniforms for effects
        material.uniforms.tDiffuse.value = renderTarget.texture;
        material.uniforms.uTime.value = time;

        // C. Render the Screen Quad to the actual Canvas
        gl.setRenderTarget(null);
        // We only render our special screen scene here
        // We need to disable auto-clearing if R3F was handling it, but R3F clears before useFrame usually.
        // But since we rendered to FBO first, 'null' target is legally cleanish for us to draw on top or clear.

        // Actually, R3F's useFrame runs BEFORE render by default regarding state updates? 
        // No, R3F renders AUTOMATICALLY unless we take over.
        // Taking over:
        // We can't easily cancel R3F's default render from inside a component without `useFrame(({gl, scene, camera}) => { gl.render(...) }, 1)` (priority 1).
        // Let's use priority 1 to OVERRIDE default render.
    }, 1);

    // We need to render the quad using a portal or just managing it manually.
    // The "priority 1" frame loop will confusingly coexist with R3F's default render if we don't return null and disable default render.
    // BUT, a cleaner way in R3F v8:
    // Simply render the screen quad MANUALLY in the priority 1 loop to the NULL target.
    // AND we must ensure R3F doesn't render the main scene to the screen again.

    // TRICK: Put this component inside the Canvas.
    // AND detach the main scene from R3F's auto-render?
    // Actually, R3F allows `gl.autoRender = false` but that's global.

    // SIMPLER METHOD: "HUD" approach.
    // We already rendered Scene -> FBO.
    // Now we must render FBO -> Screen.
    // Since we are inside `useFrame(..., 1)`, we are effectively the last step.
    // If we just draw a fullscreen quad here using `gl.render(screenScene, orthoCamera)`, it will paint over whatever R3F painted.
    // Since R3F painted the scene to the screen *already* (priority 0 loop), we would be double rendering.

    // SOLUTION:
    // In `useFrame(..., 1)`, we do:
    // 1. CLEAR the screen (optional, if we draw full opaque).
    // 2. Draw our quad.
    // WAIT. If R3F draws priority 0, it draws the scene to the default buffer.
    // We want the scene in our FBO, NOT on the screen yet.
    // So we need to PREVENT R3F from drawing priority 0 to the screen.
    // We can't easily.

    // ALTERNATIVE: Use `createPortal` to render the main scene logic? No.
    // STANDARD SOLUTION without postprocessing-lib:
    // Just let R3F draw to FBO?
    // How? `useFrame` logic:
    // gl.setRenderTarget(renderTarget);
    // gl.render(scene, camera);
    // gl.setRenderTarget(null);
    // gl.render(screenScene, screenCamera);
    // return null;

    // BUT we need `gl.autoClear = false` or similar? 
    // Wait, if we use `useFrame(..., 1)`, R3F has *already* called its internal render?
    // No, R3F's render loop is just a subscriber to the ticker.
    // Actually R3F's default render has a priority.

    // Let's blindly implement the "render override" pattern:
    // We update the frame loop to take control.
    useEffect(() => {
        // Disable R3F auto-render
        // But we can't easily access the internal loop controller.
        // Actually we can just do:
        // gl.autoClear = false;
    }, [gl]);

    // ORTHOGRAPHIC CAMERA FOR QUAD
    const orthoCamera = useMemo(() => {
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        cam.position.z = 1;
        return cam;
    }, []);

    useFrame((state) => {
        // 1. Capture Scene
        state.gl.setRenderTarget(renderTarget);
        state.gl.clear();
        state.gl.render(scene, camera);

        // 2. Render Quad to Screen
        state.gl.setRenderTarget(null);
        state.gl.clear(); // Clear whatever R3F might have put there or debris
        material.uniforms.tDiffuse.value = renderTarget.texture;
        material.uniforms.uTime.value = state.clock.elapsedTime;
        state.gl.render(screenScene, orthoCamera);
    }, 1);

    return createPortal(
        <mesh>
            <planeGeometry args={[2, 2]} />
            <primitive object={material} attach="material" />
        </mesh>,
        screenScene
    );
}
