import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore } from '@/components/store/useSettingsStore';
import { drawZoomTutorial } from '../Television/Helpers';
import { useFigureTransition } from '@/hooks/useFigureTransition';

interface ZoomTutorialProps {
    viewState: string;
}

export function ZoomTutorial({ viewState }: ZoomTutorialProps) {
    const { camera } = useThree();
    const settings = useSettingsStore();
    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Increased canvas size to prevent text overflow
    const canvasWidth = 512;
    const canvasHeight = 128;

    const { canvas, ctx } = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = canvasWidth;
        c.height = canvasHeight;
        const cx = c.getContext('2d');
        if (cx) cx.imageSmoothingEnabled = false;
        return { canvas: c, ctx: cx };
    }, []);

    useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = tex;
    }, [canvas]);

    const baselineFov = useRef<number | null>(null);

    // EXACT SAME HOOK AS EYES/UI
    const isNotDefault = viewState !== 'default';
    const notSeenYet = !settings.hasDoneZoomThisSession;
    const targetFigure = (isNotDefault && isMobile && notSeenYet) ? 'active' : null;
    const { transitionOpacity, linearOpacity } = useFigureTransition(targetFigure);

    useFrame((state) => {
        if (!ctx || !textureRef.current || !meshRef.current) return;

        // Detect Zoom Logic (Preserved)
        if (isNotDefault) {
            if (baselineFov.current === null) {
                baselineFov.current = (camera as THREE.PerspectiveCamera).fov;
            } else {
                const currentFov = (camera as THREE.PerspectiveCamera).fov;
                if (Math.abs(currentFov - baselineFov.current) > 1.5) {
                    settings.setHasDoneZoomThisSession(true);
                }
            }
        } else {
            baselineFov.current = null;
        }
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Eye-style stepping and flicker from the hook
        const effectiveOpacity = Math.floor(transitionOpacity.current * 10) / 10;

        if (effectiveOpacity > 0.01) {
            // Flicker=1.0 because transitionOpacity already has the flicker pattern mixed in
            drawZoomTutorial(ctx, canvasWidth, canvasHeight, state.clock.elapsedTime, effectiveOpacity, 1.0);
            textureRef.current.needsUpdate = true;
        }

        // Layout stabilization: Bottom-Right Corner HUD positioning
        const zOff = -0.6;
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        const liveFOV = perspectiveCamera.fov;
        const vFOV = THREE.MathUtils.degToRad(liveFOV);
        const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOff);
        const widthAtZ = heightAtZ * perspectiveCamera.aspect;

        const sFactor = isMobile ? 1.4 : 1.0;
        
        // Final dimensions
        const pH = heightAtZ * 0.16 * sFactor; 
        const pW = pH * (canvasWidth / canvasHeight);

        const marginX = heightAtZ * 0.04; 
        const marginY = heightAtZ * 0.02;

        // POSITION IS FIXED (No scale-in / zoom-in animation)
        const pX = widthAtZ / 2 - pW / 2 - marginX;
        const pY = -heightAtZ / 2 + pH / 2 + marginY;

        meshRef.current.position.set(pX, pY, zOff);
        meshRef.current.scale.set(pW, pH, 1);
    });

    // Stay mounted until the transition is complete
    if (targetFigure === null && linearOpacity.current <= 0.01) return null;

    return createPortal(
        <mesh ref={meshRef} renderOrder={1002}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={textureRef.current}
                transparent
                depthTest={false}
                depthWrite={false}
            />
        </mesh>,
        camera
    );
}
