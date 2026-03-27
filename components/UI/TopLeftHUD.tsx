'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, createPortal, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { drawHUDRadioIcon, drawHUDVisionIcon, drawHUDAboutMeIcon, drawHUDMyWorksIcon, drawHUDLifestyleIcon, drawHUDExtrasIcon, drawHUDTVIcon } from '../Television/Helpers';

interface TopLeftHUDProps {
    onNavigate: (state: string) => void;
}

type HUDButton = 'tv' | 'radio' | 'about' | 'works' | 'vision' | 'lifestyle' | 'extras';

export function TopLeftHUD({ onNavigate }: TopLeftHUDProps) {
    const { camera, scene } = useThree();

    useEffect(() => {
        scene.add(camera);
        return () => {
            scene.remove(camera);
        };
    }, [camera, scene]);

    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const [isExpanded, setIsExpanded] = useState(true);
    const expansionProgress = useRef(0);
    const [hoveredBtn, setHoveredBtn] = useState<HUDButton | null>(null);
    const hoverProgressRefs = useRef<Record<string, number>>({
        tv: 0, radio: 0, about: 0, works: 0, vision: 0, lifestyle: 0, extras: 0
    });
    const hoverStartTimeRefs = useRef<Record<string, number>>({
        tv: 0, radio: 0, about: 0, works: 0, vision: 0, lifestyle: 0, extras: 0
    });
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canvasWidth = 240; // Expanded to fit labels
    const slotSize = 50;
    const canvasHeight = slotSize * 7;

    const { canvas, ctx } = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = canvasWidth;
        c.height = canvasHeight;
        const cx = c.getContext('2d');
        if (cx) {
            cx.imageSmoothingEnabled = false;
        }
        return { canvas: c, ctx: cx };
    }, [canvasWidth, canvasHeight]);

    useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = tex;
    }, [canvas]);

    const MENU_ITEMS = useMemo(() => [
        { id: 'tv', draw: drawHUDTVIcon, label: '' },
        { id: 'about', draw: drawHUDAboutMeIcon, state: 'tv_red_focus', label: 'About Me' },
        { id: 'works', draw: drawHUDMyWorksIcon, state: 'tv_lcd_focus', label: 'My Works' },
        { id: 'vision', draw: drawHUDVisionIcon, state: 'tv_dirty_focus', label: 'Vision' },
        { id: 'lifestyle', draw: drawHUDLifestyleIcon, state: 'tv_typical_focus', label: 'Lifestyle' },
        { id: 'extras', draw: drawHUDExtrasIcon, state: 'tv_lowpoly_focus', label: 'Extras' },
        { id: 'radio', draw: drawHUDRadioIcon, state: 'radio_focus', label: 'Music' },
    ] as const, []);

    useFrame((state, delta) => {
        if (!ctx) return;

        const time = state.clock.elapsedTime;

        // Menu expansion
        const targetExp = isExpanded ? 1 : 0;
        if (Math.abs(expansionProgress.current - targetExp) > 0.001) {
            expansionProgress.current = THREE.MathUtils.lerp(expansionProgress.current, targetExp, delta * 10);
        }

        // Button hover states
        MENU_ITEMS.forEach(item => {
            const isHovered = hoveredBtn === item.id;
            const target = isHovered ? 1 : 0;
            const prevProgress = hoverProgressRefs.current[item.id];

            if (Math.abs(prevProgress - target) > 0.001) {
                if (isHovered && prevProgress < 0.01) {
                    hoverStartTimeRefs.current[item.id] = time;
                }
                hoverProgressRefs.current[item.id] = THREE.MathUtils.lerp(prevProgress, target, delta * 15);
            }
        });

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        MENU_ITEMS.forEach((item, i) => {
            let itemProgress = 1;
            if (i > 0) {
                // Stagger transition
                const staggerStart = (i - 1) * 0.12;
                itemProgress = Math.max(0, Math.min(1, (expansionProgress.current - staggerStart) / 0.4));
            }

            if (itemProgress < 0.001) return;

            ctx.save();
            const y = i * slotSize + slotSize / 2;
            const xPos = 40;

            // Render Icon
            ctx.save();
            ctx.translate(xPos, y);
            ctx.scale(itemProgress, itemProgress);
            ctx.translate(-xPos, -y);
            ctx.globalAlpha = itemProgress;

            const hoverStart = hoverStartTimeRefs.current[item.id] || 0;
            const isLifestyle = item.id === 'lifestyle';
            const localTime = (isLifestyle && hoverProgressRefs.current[item.id] > 0) ? (time - hoverStart) : time;

            item.draw(ctx, xPos, y, hoverProgressRefs.current[item.id], '#ffffff', localTime);

            ctx.restore();

            // Render Label
            const hoverP = hoverProgressRefs.current[item.id];
            if (hoverP > 0.01 && item.label) {
                ctx.save();
                ctx.globalAlpha = itemProgress * hoverP;
                ctx.font = `bold ${Math.floor(14 * hoverP)}px "Courier New", Courier, monospace`;

                const baseX = xPos + 25 + (hoverP * 5);
                let currentX = baseX;

                const gJitterX = (Math.random() - 0.5) * 1.5;
                const gJitterY = (Math.random() - 0.5) * 1.5;

                const chars = item.label.split('');
                const labelY = y + 5;
                chars.forEach((char) => {
                    const charWidth = ctx.measureText(char).width;
                    if (Math.random() > 0.05) {
                        ctx.fillStyle = 'rgba(0,0,0,0.5)';
                        ctx.fillText(char, currentX + 1 + gJitterX, labelY + 1 + gJitterY);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(char, currentX + gJitterX, labelY + gJitterY);
                    }
                    currentX += charWidth;
                });
                ctx.restore();
            }
            ctx.restore();
        });

        if (textureRef.current) textureRef.current.needsUpdate = true;

        // Real-time layout stabilization: compensates for FOV changes (zoom)
        if (meshRef.current) {
            const zOff = -0.6;
            const perspectiveCamera = camera as THREE.PerspectiveCamera;
            const liveFOV = perspectiveCamera.fov;
            const vFOV = THREE.MathUtils.degToRad(liveFOV);
            const heightAtZ = 2 * Math.tan(vFOV / 2) * Math.abs(zOff);
            const widthAtZ = heightAtZ * perspectiveCamera.aspect;

            const sFactor = isMobile ? 1.4 : 1.0;
            const totalSlots = 7;
            const pH = heightAtZ * 0.10 * totalSlots * sFactor;
            const pW = (heightAtZ * 0.10 * sFactor) * (canvasWidth / slotSize);

            const pX = heightAtZ * 0.02;
            const pY = heightAtZ * 0.02;

            meshRef.current.position.set(
                -widthAtZ / 2 + pW / 2 + pX,
                heightAtZ / 2 - pH / 2 - pY,
                zOff
            );
            meshRef.current.scale.set(pW, pH, 1);
        }
    });

    const getHitResult = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
        const rawUv = e.uv;
        if (!rawUv) return null;

        const px = rawUv.x * canvasWidth;
        const py = (1 - rawUv.y) * canvasHeight;

        const xLeft = 15;
        const xRight = 65;

        // TV hit check
        if (px > xLeft && px < 65 && py > 0 && py < slotSize) {
            return 'tv';
        } else if (isExpanded) {
            // Check sub-items
            for (let i = 1; i < MENU_ITEMS.length; i++) {
                const yTop = i * slotSize * expansionProgress.current;
                const yBottom = (i + 1) * slotSize * expansionProgress.current;
                if (px > xLeft && px < xRight && py > yTop && py < yBottom) {
                    return MENU_ITEMS[i].id;
                }
            }
        }
        return null;
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        const hit = getHitResult(e);
        if (hit) {
            e.stopPropagation();
            if (hoveredBtn !== hit) {
                setHoveredBtn(hit as HUDButton);
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

        if (hit === 'tv') {
            setIsExpanded(!isExpanded);
        } else {
            const item = (MENU_ITEMS as readonly { id: string, state?: string }[]).find(m => m.id === hit);
            if (item && item.state) {
                onNavigate(item.state);
            }
        }
    };

    return createPortal(
        <mesh
            ref={meshRef}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={textureRef.current}
                transparent
                depthTest={false}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>,
        camera
    );
}
