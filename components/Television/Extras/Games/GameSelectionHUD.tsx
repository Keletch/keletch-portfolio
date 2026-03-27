import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore, SettingsState } from '@/components/store/useSettingsStore';

interface GameSelectionHUDProps {
    viewState: string;
}

export function GameSelectionHUD({ viewState }: GameSelectionHUDProps) {
    const { camera, scene } = useThree();
    const activeGamePrompt = useSettingsStore((state: SettingsState) => state.activeGamePrompt);
    const availableGames = useSettingsStore((state: SettingsState) => state.availableGames);
    const selectedGameIndex = useSettingsStore((state: SettingsState) => state.selectedGameIndex);
    const setSelectedGameIndex = useSettingsStore((state: SettingsState) => state.setSelectedGameIndex);
    const premiumGlowIntensity = useSettingsStore((state: SettingsState) => state.premiumGlowIntensity);

    useEffect(() => {
        scene.add(camera);
        return () => { scene.remove(camera); };
    }, [camera, scene]);

    useEffect(() => {
        if (viewState !== 'nes_focus') {
            setSelectedGameIndex(0);
        }
    }, [viewState, setSelectedGameIndex]);

    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [hoveredBtn, setHoveredBtn] = useState<'left' | 'right' | null>(null);
    
    // Smooth opacity fade
    const displayOpacity = useRef(0);

    // High-resolution canvas
    const canvasWidth = 900;
    const canvasHeight = 120; 

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

    const isVisible = viewState === 'nes_focus' && !activeGamePrompt;

    useFrame((state) => {
        if (!ctx || !textureRef.current) return;

        const time = state.clock.getElapsedTime();

        // Smooth fade in/out
        const targetOpacity = isVisible ? 1.0 : 0.0;
        displayOpacity.current = THREE.MathUtils.lerp(displayOpacity.current, targetOpacity, 0.1);

        if (displayOpacity.current < 0.01) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            textureRef.current.needsUpdate = true;
            return;
        }

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = displayOpacity.current;

        // ─── Ghostly Text Rendering (CA Effect) ───
        const renderGhostlyText = (text: string, x: number, y: number, font: string, isHovered: boolean = false) => {
            ctx.save();
            ctx.font = font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const jitterX = (Math.random() - 0.5) * (isHovered ? 4 : 2);
            const jitterY = (Math.random() - 0.5) * (isHovered ? 4 : 2);
            const caOffset = (2 + (isHovered ? 2 : 0) + Math.sin(time * 12) * 1.5) * premiumGlowIntensity;

            // Pass 1: Red
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillText(text, x + jitterX - caOffset, y + jitterY);
            ctx.restore();

            // Pass 2: Cyan
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.fillText(text, x + jitterX + caOffset, y + jitterY);
            ctx.restore();

            // Pass 3: White
            ctx.save();
            ctx.shadowBlur = (isHovered ? 25 : 10) * premiumGlowIntensity;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x + jitterX, y + jitterY);
            ctx.restore();

            ctx.restore();
        };

        // ─── Button Rendering ───
        const drawHoloButton = (x: number, y: number, label: string, isHovered: boolean) => {
            const btnW = 180;
            const btnH = 60;
            const jitterX = (Math.random() - 0.5) * (isHovered ? 3 : 1);
            const jitterY = (Math.random() - 0.5) * (isHovered ? 3 : 1);

            ctx.save();
            ctx.translate(x + jitterX, y + jitterY);

            const caOffset = (isHovered ? 3 : 1) * premiumGlowIntensity;
            ctx.lineWidth = 4;
            
            // Red border
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowBlur = 10 * premiumGlowIntensity;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.9)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.strokeRect(-btnW / 2 - caOffset, -btnH / 2, btnW, btnH);
            ctx.restore();

            // Cyan border
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowBlur = 10 * premiumGlowIntensity;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.9)';
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
            ctx.strokeRect(-btnW / 2 + caOffset, -btnH / 2, btnW, btnH);
            ctx.restore();

            // Main White border
            ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
            ctx.strokeRect(-btnW / 2, -btnH / 2, btnW, btnH);

            if (isHovered) {
                ctx.save();
                ctx.shadowBlur = 30 * premiumGlowIntensity;
                ctx.shadowColor = '#ffffff';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-btnW / 2 + caOffset, -btnH / 2, btnW, btnH);
                ctx.restore();
                
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 36px "Courier New", Courier, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, 0, 5);
            } else {
                renderGhostlyText(label, 0, 5, 'bold 36px "Courier New", Courier, monospace', false);
            }

            ctx.restore();
        };

        // ─── Horizontal Layout [BUTTON] [TITLE] [BUTTON] ───
        const centerY = canvasHeight / 2;
        const buttonSpacing = 240; 
        
        // 1. Prev Button
        drawHoloButton(canvasWidth / 2 - buttonSpacing - 120, centerY, '◀ PREV', hoveredBtn === 'left');

        // 2. Title (Center)
        const title = availableGames[selectedGameIndex].toUpperCase();
        renderGhostlyText(title, canvasWidth / 2, centerY, 'bold 64px "Courier New", Courier, monospace');

        // 3. Next Button
        drawHoloButton(canvasWidth / 2 + buttonSpacing + 120, centerY, 'NEXT ▶', hoveredBtn === 'right');

        textureRef.current.needsUpdate = true;

        if (meshRef.current) {
            const zOff = -0.3;
            const perspectiveCamera = camera as THREE.PerspectiveCamera;
            const vFOV = THREE.MathUtils.degToRad(perspectiveCamera.fov);
            const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOff);
            const widthAtZ = heightAtZ * perspectiveCamera.aspect;
            
            const pH = heightAtZ * 0.078; 
            const pW = pH * (canvasWidth / canvasHeight);

            const paddingX = heightAtZ * 0.03; 
            const paddingY = heightAtZ * 0.03;

            const px = (widthAtZ / 2) - (pW / 2) - paddingX;
            const py = -(heightAtZ / 2) + (pH / 2) + paddingY;

            meshRef.current.position.set(px, py, zOff);
            meshRef.current.scale.set(pW, pH, 1);
        }
    });

    if (!isVisible && displayOpacity.current < 0.01) return null;

    const getHitResult = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
        if (!isVisible) return null;
        const rawUv = e.uv;
        if (!rawUv) return null;

        const px = rawUv.x * canvasWidth;
        const py = (1 - rawUv.y) * canvasHeight;

        const centerY = canvasHeight / 2;
        const buttonSpacing = 240;
        const btnW = 180;
        const btnH = 60;

        // Left button hit box
        const leftCenterX = canvasWidth / 2 - buttonSpacing - 120;
        if (px > leftCenterX - btnW/2 && px < leftCenterX + btnW/2 && py > centerY - btnH/2 && py < centerY + btnH/2) return 'left';

        // Right button hit box
        const rightCenterX = canvasWidth / 2 + buttonSpacing + 120;
        if (px > rightCenterX - btnW/2 && px < rightCenterX + btnW/2 && py > centerY - btnH/2 && py < centerY + btnH/2) return 'right';

        return null;
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const hit = getHitResult(e);
        if (hit) {
            e.stopPropagation();
            if (hoveredBtn !== hit) {
                setHoveredBtn(hit as 'left' | 'right');
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

        if (hit === 'left') {
            setSelectedGameIndex((selectedGameIndex - 1 + availableGames.length) % availableGames.length);
        } else if (hit === 'right') {
            setSelectedGameIndex((selectedGameIndex + 1) % availableGames.length);
        }
    };

    return createPortal(
        <mesh
            ref={meshRef}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
            renderOrder={998}
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
