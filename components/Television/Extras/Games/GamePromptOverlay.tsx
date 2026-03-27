import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore, SettingsState } from '@/components/store/useSettingsStore';
import { useFigureTransition } from '@/hooks/useFigureTransition';

export function GamePromptOverlay() {
    const { camera, scene } = useThree();
    const activeGamePrompt = useSettingsStore((state: SettingsState) => state.activeGamePrompt);
    const setActiveGamePrompt = useSettingsStore((state: SettingsState) => state.setActiveGamePrompt);
    const setGamePromptFading = useSettingsStore((state: SettingsState) => state.setGamePromptFading);

    const { renderedFigure, transitionOpacity, linearOpacity } = useFigureTransition(activeGamePrompt, 0, 1.5);
    const isLocked = useRef(false);
    const wasFading = useRef(false);

    useEffect(() => {
        scene.add(camera);
        return () => { scene.remove(camera); };
    }, [camera, scene]);

    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [hoveredBtn, setHoveredBtn] = useState<'start' | 'close' | null>(null);

    const canvasWidth = 1024;
    const canvasHeight = 512;

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

    useFrame(() => {
        if (!ctx || !textureRef.current || !renderedFigure) return;

        // Track fading state for camera lock
        const isFading = !activeGamePrompt && linearOpacity.current > 0.01;
        if (isFading && !wasFading.current) {
            wasFading.current = true;
            setGamePromptFading(true);
        }
        if (!activeGamePrompt && linearOpacity.current <= 0.01) {
            if (wasFading.current) {
                wasFading.current = false;
                isLocked.current = false;
                setGamePromptFading(false);
            }
            return;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const effectiveOpacity = Math.floor(transitionOpacity.current * 10) / 10;
        ctx.globalAlpha = Math.max(0, Math.min(1.0, effectiveOpacity));

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Jitter for retro feel
        const jitterX = (Math.random() - 0.5) * 2;
        const jitterY = (Math.random() - 0.5) * 2;

        ctx.font = 'bold 80px "Courier New", Courier, monospace';
        ctx.fillText(`PLAY ${renderedFigure.toUpperCase()}`, canvasWidth / 2 + jitterX, 200 + jitterY);

        // Draw START Button
        const startX = canvasWidth / 2 - 150;
        const startY = 380;
        const btnW = 200;
        const btnH = 80;
        
        ctx.save();
        ctx.translate(startX, startY);
        ctx.fillStyle = hoveredBtn === 'start' ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
        if (hoveredBtn === 'start') {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        // Button bounds stroke instead of fill
        ctx.strokeStyle = hoveredBtn === 'start' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(-btnW / 2, -btnH / 2, btnW, btnH);

        if (hoveredBtn === 'start') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-btnW / 2, -btnH / 2, btnW, btnH);
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        
        ctx.shadowBlur = 0;
        ctx.font = 'bold 40px "Courier New", Courier, monospace';
        ctx.fillText('START', 0, 5);
        ctx.restore();

        // Draw CLOSE Button
        const closeX = canvasWidth / 2 + 150;
        const closeY = 380;

        ctx.save();
        ctx.translate(closeX, closeY);
        if (hoveredBtn === 'close') {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        ctx.strokeStyle = hoveredBtn === 'close' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(-btnW / 2, -btnH / 2, btnW, btnH);

        if (hoveredBtn === 'close') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-btnW / 2, -btnH / 2, btnW, btnH);
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.shadowBlur = 0;
        ctx.font = 'bold 40px "Courier New", Courier, monospace';
        ctx.fillText('CLOSE', 0, 5);
        ctx.restore();

        if (textureRef.current) textureRef.current.needsUpdate = true;

        if (meshRef.current) {
            const zOff = -0.3;
            const perspectiveCamera = camera as THREE.PerspectiveCamera;
            const liveFOV = perspectiveCamera.fov;
            const vFOV = THREE.MathUtils.degToRad(liveFOV);
            const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOff);
            
            const pH = heightAtZ * 0.45; // Scale to fit screen perfectly
            const pW = pH * (canvasWidth / canvasHeight);

            meshRef.current.position.set(0, 0, zOff);
            meshRef.current.scale.set(pW, pH, 1);
        }
    });

    if (!activeGamePrompt && linearOpacity.current <= 0.01) return null;

    const getHitResult = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
        const rawUv = e.uv;
        if (!rawUv) return null;

        const px = rawUv.x * canvasWidth;
        const py = (1 - rawUv.y) * canvasHeight;

        // START Button Box
        const startLeft = canvasWidth / 2 - 150 - 100;
        const startRight = canvasWidth / 2 - 150 + 100;
        const btnTop = 380 - 40;
        const btnBottom = 380 + 40;

        if (px > startLeft && px < startRight && py > btnTop && py < btnBottom) return 'start';

        // CLOSE Button Box
        const closeLeft = canvasWidth / 2 + 150 - 100;
        const closeRight = canvasWidth / 2 + 150 + 100;

        if (px > closeLeft && px < closeRight && py > btnTop && py < btnBottom) return 'close';

        return null;
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (isLocked.current) return;
        const hit = getHitResult(e);
        if (hit) {
            e.stopPropagation();
            if (hoveredBtn !== hit) {
                setHoveredBtn(hit as 'start' | 'close');
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
        if (isLocked.current) return;
        const hit = getHitResult(e) || hoveredBtn;
        if (!hit) return;
        e.stopPropagation();

        isLocked.current = true;
        setHoveredBtn(null);
        document.body.style.cursor = 'auto';

        if (hit === 'start') {
            alert("Game launching logic not yet implemented for " + activeGamePrompt);
        } else if (hit === 'close') {
            setActiveGamePrompt(null);
        }
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
