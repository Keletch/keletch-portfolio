'use client';

import { useMemo, useEffect } from 'react';
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
uniform vec2 uResolution;

varying vec2 vUv;

// --- CONFIG UNIFORMS ---
uniform float uCurveIntensity;
uniform float uVignetteStr;
uniform float uScanlineCount;
uniform float uScanlineOpacity;
uniform float uNoiseOpacity;
uniform float uAberrationOffset;
uniform float uBlurSize;

#define CURVE_INTENSITY uCurveIntensity
#define VIGNETTE_STR uVignetteStr
#define SCANLINE_COUNT uScanlineCount
#define SCANLINE_OPACITY uScanlineOpacity
#define NOISE_OPACITY uNoiseOpacity
#define ABERRATION_OFFSET uAberrationOffset

vec2 curve(vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    vec2 offset = abs(uv.yx) / vec2(CURVE_INTENSITY, CURVE_INTENSITY);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = curve(vUv);

    // Bounds check
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // --- ROUNDED CORNERS ---
    float edge = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    float mask = smoothstep(0.0, 0.02, edge * 50.0);
    if (mask < 0.1) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // --- GLITCH SWEEP ("Hum Bar") ---
    vec2 distortedUV = uv;
    float sweepCycle = mod(uTime, 15.0);
    float sweepY = -10.0;

    if (sweepCycle > 10.0) {
        float phase = sweepCycle - 10.0;
        sweepY = 1.1 - (phase / 5.0) * 1.2;
    }
    
    float sweepDist = abs(uv.y - sweepY);
    float sweepWidth = 0.04;
    float edgeFactor = sweepDist / sweepWidth;

    if (sweepDist < sweepWidth) {
        float strength = smoothstep(sweepWidth, 0.0, sweepDist);
        distortedUV.x -= 0.02 * strength;
    }

    // --- NTSC / VHS COLOR BLEED (SMEAR/BLUR) ---
    // Simulate low horizontal bandwidth of composite video (NTSC/PAL)
    // We apply a horizontal blur to soften images exactly like old VHS tapes.
    float blurSize = uBlurSize; // Width of the horizontal smear
    vec3 col = vec3(0.0);
    
    // 7-tap horizontal blur for softness
    col += texture2D(tDiffuse, distortedUV + vec2(-blurSize * 3.0, 0.0)).rgb * 0.05;
    col += texture2D(tDiffuse, distortedUV + vec2(-blurSize * 2.0, 0.0)).rgb * 0.10;
    col += texture2D(tDiffuse, distortedUV + vec2(-blurSize, 0.0)).rgb * 0.20;
    col += texture2D(tDiffuse, distortedUV).rgb * 0.30;
    col += texture2D(tDiffuse, distortedUV + vec2(blurSize, 0.0)).rgb * 0.20;
    col += texture2D(tDiffuse, distortedUV + vec2(blurSize * 2.0, 0.0)).rgb * 0.10;
    col += texture2D(tDiffuse, distortedUV + vec2(blurSize * 3.0, 0.0)).rgb * 0.05;

    // --- CHROMATIC ABERRATION ---
    // Apply slight RGB separation ON TOP of the blurred image
    vec2 fromCenter = distortedUV - 0.5;
    float dist = dot(fromCenter, fromCenter);
    float shift = dist * ABERRATION_OFFSET;

    // Extra shift at the hum bar tear
    if (sweepDist < sweepWidth) {
        float outerEdge = smoothstep(0.75, 1.0, edgeFactor);
        shift += 0.005 * outerEdge;
    }

    // Pull red from left, blue from right to create edge glow/bleed
    float cr = texture2D(tDiffuse, distortedUV + vec2(shift + blurSize, 0.0)).r;
    float cb = texture2D(tDiffuse, distortedUV - vec2(shift * 1.5, 0.0)).b;
    
    // Mix the shifted sharp colors into our blurred NTSC base
    col.r = mix(col.r, cr, 0.6); // Red tends to bleed most on NTSC
    col.b = mix(col.b, cb, 0.4);

    // --- SCANLINES ---
    float scanline = sin(uv.y * SCANLINE_COUNT - uTime * 5.0);
    col *= 1.0 - (scanline * 0.5 + 0.5) * SCANLINE_OPACITY;

    // --- NOISE (Granulado) ---
    float noise = random(uv + mod(uTime, 10.0));
    col *= 1.0 - (noise * NOISE_OPACITY);

    // --- VIGNETTE ---
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vig = clamp(pow(vig * 16.0, VIGNETTE_STR), 0.0, 1.0);
    col *= vig;

    // --- COLOR GRADING ---
    // Lift blacks slightly and add overall contrast for cinematic feel
    col = col * 1.05 + 0.01;

    gl_FragColor = vec4(col, 1.0);
}
`;

export function CRTOverlay() {
    const { scene, camera, size } = useThree();

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
                uResolution: { value: new THREE.Vector2(size.width, size.height) },
                uCurveIntensity: { value: 4.0 },
                uVignetteStr: { value: 0.55 },
                uScanlineCount: { value: 800.0 },
                uScanlineOpacity: { value: 0.05 },
                uNoiseOpacity: { value: 0.2 },
                uAberrationOffset: { value: 0.009 },
                uBlurSize: { value: 0.0005 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
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

        // Update uniforms
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
