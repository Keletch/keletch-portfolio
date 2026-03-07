'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { drawHUDMenuIcon, drawHUDSettingsGear, drawHUDResetIcon, drawHUDLetterIcon } from '../Television/Helpers';

interface PaletteSelectorProps {
    current: string;
    onChange: (palette: string) => void;
    onMenuSelect: () => void;
    onSettingsSelect?: () => void;
    onResetSelect?: () => void;
    onContactSelect?: () => void;
}

export function PaletteSelector({ current, onChange, onMenuSelect, onSettingsSelect, onResetSelect, onContactSelect }: PaletteSelectorProps) {
    const { camera, size, scene } = useThree();

    useEffect(() => {
        // Sync camera with scene for HUD rendering
        scene.add(camera);
        return () => {
            scene.remove(camera);
        };
    }, [camera, scene]);

    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [hoveredBtn, setHoveredBtn] = useState<'menu' | 'settings' | 'reset' | 'letter' | null>(null);
    const hoverProgressTheme = useRef({ menu: 0, settings: 0, reset: 0, letter: 0 });

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
        ['menu', 'settings', 'reset', 'letter'].forEach(key => {
            const k = key as 'menu' | 'settings' | 'reset' | 'letter';
            if (hoveredBtn === k) {
                hoverProgressTheme.current[k] = Math.min(1.0, hoverProgressTheme.current[k] + delta * 5);
            } else {
                hoverProgressTheme.current[k] = Math.max(0.0, hoverProgressTheme.current[k] - delta * 5);
            }
        });

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const settingsX = canvasWidth - 30;
        const resetX = canvasWidth - 70;
        const letterX = canvasWidth - 110;
        const menuX = canvasWidth - 150;
        const btnY = canvasHeight / 2;

        drawHUDMenuIcon(ctx, menuX, btnY, hoverProgressTheme.current.menu, '#ffffff');
        drawHUDLetterIcon(ctx, letterX, btnY, hoverProgressTheme.current.letter, '#ffffff');
        drawHUDResetIcon(ctx, resetX, btnY, hoverProgressTheme.current.reset, '#ffffff');
        drawHUDSettingsGear(ctx, settingsX, btnY, hoverProgressTheme.current.settings, '#ffffff');

        textureRef.current.needsUpdate = true;
    });

    const handlePointerMove = (e: any) => {
        const rawUv = e.uv;
        if (!rawUv) return;

        // Coordinate compensation for CRT shader curve
        const px = (rawUv.x * canvasWidth) + 12;
        const py = (rawUv.y * canvasHeight) + 2;

        const settingsHit = px > canvasWidth - 50 && px < canvasWidth - 10;
        const resetHit = px > canvasWidth - 90 && px < canvasWidth - 50;
        const letterHit = px > canvasWidth - 130 && px < canvasWidth - 90;
        const menuHit = px > canvasWidth - 170 && px < canvasWidth - 130;

        const verticalHit = py > 10 && py < canvasHeight - 10;

        if (settingsHit && verticalHit) {
            setHoveredBtn('settings');
            document.body.style.cursor = 'pointer';
        } else if (resetHit && verticalHit) {
            setHoveredBtn('reset');
            document.body.style.cursor = 'pointer';
        } else if (letterHit && verticalHit) {
            setHoveredBtn('letter');
            document.body.style.cursor = 'pointer';
        } else if (menuHit && verticalHit) {
            setHoveredBtn('menu');
            document.body.style.cursor = 'pointer';
        } else {
            setHoveredBtn(null);
            document.body.style.cursor = 'auto';
        }
    };

    const handlePointerOut = () => {
        setHoveredBtn(null);
        document.body.style.cursor = 'auto';
    };

    const handleClick = (e: any) => {
        if (!hoveredBtn) return;
        e.stopPropagation();

        if (hoveredBtn === 'settings' && onSettingsSelect) onSettingsSelect();
        else if (hoveredBtn === 'reset' && onResetSelect) onResetSelect();
        else if (hoveredBtn === 'letter' && onContactSelect) onContactSelect();
        else if (hoveredBtn === 'menu') onMenuSelect();
    };

    const zOffset = -0.6;
    const vFOV = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOffset);
    const widthAtZ = heightAtZ * ((camera as THREE.PerspectiveCamera).aspect);

    const planeHeight = heightAtZ * 0.15;
    const planeWidth = planeHeight * (canvasWidth / canvasHeight);

    const x = widthAtZ / 2 - planeWidth / 2 - heightAtZ * 0.02;
    const y = heightAtZ / 2 - planeHeight / 2 - heightAtZ * 0.02;

    return createPortal(
        <mesh
            ref={meshRef}
            position={[x, y, zOffset]}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
            renderOrder={999}
        >
            <planeGeometry args={[planeWidth, planeHeight]} />
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
