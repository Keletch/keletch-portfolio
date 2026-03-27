'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { drawHUDMenuIcon, drawHUDSettingsGear, drawHUDResetIcon, drawHUDLetterIcon, drawHUDFullscreenIcon } from '../Television/Helpers';

interface PaletteSelectorProps {
    current: string;
    onChange: (palette: string) => void;
    onMenuSelect: () => void;
    onSettingsSelect?: () => void;
    onResetSelect?: () => void;
    onContactSelect?: () => void;
}

export function PaletteSelector({ onMenuSelect, onSettingsSelect, onResetSelect, onContactSelect }: PaletteSelectorProps) {
    const { camera, scene } = useThree();

    useEffect(() => {
        // Sync camera with scene for HUD rendering
        scene.add(camera);
        return () => {
            scene.remove(camera);
        };
    }, [camera, scene]);

    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [hoveredBtn, setHoveredBtn] = useState<'menu' | 'settings' | 'reset' | 'letter' | 'expand' | null>(null);
    const hoverProgressTheme = useRef({ menu: 0, settings: 0, reset: 0, letter: 0, expand: 0 });
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canvasWidth = 256;
    const canvasHeight = 64;

    const { canvas, ctx } = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = canvasWidth;
        c.height = canvasHeight;
        const cx = c.getContext('2d');
        if (cx) {
            cx.imageSmoothingEnabled = false;
        }
        return { canvas: c, ctx: cx };
    }, []);

    useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = tex;
    }, [canvas]);

    useFrame((_, delta) => {
        if (!ctx || !textureRef.current) return;

        // Hover animations
        ['menu', 'settings', 'reset', 'letter', 'expand'].forEach(key => {
            const k = key as 'menu' | 'settings' | 'reset' | 'letter' | 'expand';
            if (hoveredBtn === k) {
                hoverProgressTheme.current[k] = Math.min(1.0, hoverProgressTheme.current[k] + delta * 5);
            } else {
                hoverProgressTheme.current[k] = Math.max(0.0, hoverProgressTheme.current[k] - delta * 5);
            }
        });

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // We push the other 4 over by 40px to make room on the right
        const expandX = canvasWidth - 30;
        const settingsX = canvasWidth - 70;
        const resetX = canvasWidth - 110;
        const letterX = canvasWidth - 150;
        const menuX = canvasWidth - 190;
        const btnY = canvasHeight / 2;

        drawHUDMenuIcon(ctx, menuX, btnY, hoverProgressTheme.current.menu, '#ffffff');
        drawHUDLetterIcon(ctx, letterX, btnY, hoverProgressTheme.current.letter, '#ffffff');
        drawHUDResetIcon(ctx, resetX, btnY, hoverProgressTheme.current.reset, '#ffffff');
        drawHUDSettingsGear(ctx, settingsX, btnY, hoverProgressTheme.current.settings, '#ffffff');
        drawHUDFullscreenIcon(ctx, expandX, btnY, hoverProgressTheme.current.expand, '#ffffff');

        textureRef.current.needsUpdate = true;

        // Real-time layout stabilization: compensates for FOV changes (zoom)
        if (meshRef.current) {
            const zOff = -0.6;
            const perspectiveCamera = camera as THREE.PerspectiveCamera;
            const liveFOV = perspectiveCamera.fov;
            const vFOV = THREE.MathUtils.degToRad(liveFOV);
            const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOff);
            const widthAtZ = heightAtZ * perspectiveCamera.aspect;

            const sFactor = isMobile ? 1.4 : 1.0;
            const pH = heightAtZ * 0.15 * sFactor;
            const pW = pH * (canvasWidth / canvasHeight);

            const pX = widthAtZ / 2 - pW / 2 - heightAtZ * 0.02;
            const pY = heightAtZ / 2 - pH / 2 - heightAtZ * 0.02;

            meshRef.current.position.set(pX, pY, zOff);
            meshRef.current.scale.set(pW, pH, 1);
        }
    });

    const getHitResult = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
        const rawUv = e.uv;
        if (!rawUv) return null;

        const px = (rawUv.x * canvasWidth);
        const py = (rawUv.y * canvasHeight);

        const expandHit = px > canvasWidth - 50 && px < canvasWidth - 10;
        const settingsHit = px > canvasWidth - 90 && px < canvasWidth - 50;
        const resetHit = px > canvasWidth - 130 && px < canvasWidth - 90;
        const letterHit = px > canvasWidth - 170 && px < canvasWidth - 130;
        const menuHit = px > canvasWidth - 210 && px < canvasWidth - 170;

        const verticalHit = py > 10 && py < canvasHeight - 10;

        if (expandHit && verticalHit) return 'expand';
        if (settingsHit && verticalHit) return 'settings';
        if (resetHit && verticalHit) return 'reset';
        if (letterHit && verticalHit) return 'letter';
        if (menuHit && verticalHit) return 'menu';
        return null;
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const hit = getHitResult(e);
        if (hit) {
            e.stopPropagation();
            if (hoveredBtn !== hit) {
                setHoveredBtn(hit as 'settings' | 'reset' | 'letter' | 'menu' | 'expand');
                document.body.style.cursor = 'pointer';
            }
        } else {
            if (hoveredBtn !== null) {
                setHoveredBtn(null);
                document.body.style.cursor = 'auto';
            }
        }
    };

    const handlePointerOut = () => {
        if (hoveredBtn !== null) {
            setHoveredBtn(null);
            document.body.style.cursor = 'auto';
        }
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        const hit = getHitResult(e) || hoveredBtn;
        if (!hit) return;
        e.stopPropagation();

        if (hit === 'expand') {
            const el = document.documentElement as HTMLElement & {
                webkitRequestFullscreen?: () => Promise<void>;
                msRequestFullscreen?: () => Promise<void>;
            };
            if (!document.fullscreenElement) {
                if (el.requestFullscreen) el.requestFullscreen().catch(() => { });
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => { });
                else if (el.msRequestFullscreen) el.msRequestFullscreen().catch(() => { });
            } else {
                const doc = document as Document & {
                    webkitExitFullscreen?: () => Promise<void>;
                    msExitFullscreen?: () => Promise<void>;
                };
                if (doc.exitFullscreen) doc.exitFullscreen().catch(() => { });
                else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen().catch(() => { });
                else if (doc.msExitFullscreen) doc.msExitFullscreen().catch(() => { });
            }
        }
        else if (hit === 'settings' && onSettingsSelect) onSettingsSelect();
        else if (hit === 'reset' && onResetSelect) onResetSelect();
        else if (hit === 'letter' && onContactSelect) onContactSelect();
        else if (hit === 'menu') onMenuSelect();
    };

    return createPortal(
        <mesh
            ref={meshRef}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
            renderOrder={999}
        >
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
