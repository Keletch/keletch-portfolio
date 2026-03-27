import { useRef, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { LifestyleProps, LIFESTYLE_BUTTON_CONFIG } from './LifestyleTypes';
import { THEMES } from '../Types';
import {
    drawBackButton,
    drawMenuButton,
    checkButtonHover,
    drawPixelEye,
    drawTelevisionHeader
} from './LifestyleHelpers';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { POLAROIDS } from './LifestylePolaroids';
import { drawPolaroids, drawZoomedPolaroid, checkPolaroidHit, updatePolaroids } from './LifestylePolaroidsDrawing';

const DEFAULT_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'typicaltvscreen', 'typical_tv_screen', 'tipicaltvscreen'];

export default function LifestyleTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'sulfur',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText,
    isFocused = false,
    showBackButton = false,
    backButtonPosition,
    onBackClick,
    showMenuButton = false,
    menuButtonPosition,
    onMenuClick
}: LifestyleProps) {
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);

    // Polaroid States
    const polaroidAnimProgress = useRef(0);
    const [zoomedPolaroidId, setZoomedPolaroidId] = useState<string | null>(null);
    const [hoveredPolaroidId, setHoveredPolaroidId] = useState<string | null>(null);

    // Reset hover states and cursor when losing focus
    useEffect(() => {
        if (!isFocused) {
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            setHoveredPolaroidId(null);
            setZoomedPolaroidId(null);
        }
    }, [isFocused]);

    const activeTheme = THEMES[theme as keyof typeof THEMES] || THEMES.sulfur;
    const buttonColor = activeTheme.highlightColor || '#ffffff';

    // Delay the entrance flicker to give the camera time to reach the screen
    const [delayedFocus, setDelayedFocus] = useState(false);
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedFocus(true), 600);
            return () => clearTimeout(t);
        } else {
            setDelayedFocus(false);
        }
    }, [isFocused]);

    const targetFigure = delayedFocus ? 'polaroids' : 'eye';
    const { renderedFigure, transitionOpacity } = useFigureTransition(targetFigure);

    const {
        clonedModel,
        screenTextureRef,
        screenMeshRef,
        screenAspect
    } = useTVModel({
        modelPath,
        screenNames,
        rotationX,
        modelYOffset,
        uvRotation
    });

    const targetPosRef = useRef(new THREE.Vector3());

    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0,
        nextBlinkTime: 0,
        blinkDuration: 0.15,
        blinkTimer: 0
    });

    const frustumRef = useRef(new THREE.Frustum());
    const projScreenMatrixRef = useRef(new THREE.Matrix4());

    useFrame((state, delta) => {
        if (typeof document !== 'undefined' && !document.hasFocus()) return;

        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 50) return;
        }

        const dt = delta;

        if (screenTextureRef.current && groupRef.current) {
            const targetPos = targetPosRef.current;

            if (!screenMeshRef.current) {
                groupRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const childNameLower = child.name.toLowerCase();
                        if (screenNames.some(name => childNameLower.includes(name.toLowerCase()))) {
                            screenMeshRef.current = child;
                        }
                    }
                });
            }

            if (screenMeshRef.current) {
                const frustum = frustumRef.current;
                const projScreenMatrix = projScreenMatrixRef.current;
                projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
                frustum.setFromProjectionMatrix(projScreenMatrix);

                if (!frustum.intersectsObject(screenMeshRef.current)) {
                    return; // Frustum Culling: skip rendering 2D canvas if TV is off-screen
                }

                const mesh = screenMeshRef.current;
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const box = mesh.geometry.boundingBox;
                if (box) {
                    box.getCenter(targetPos);
                    mesh.localToWorld(targetPos);
                } else {
                    mesh.getWorldPosition(targetPos);
                }
            } else {
                groupRef.current.getWorldPosition(targetPos);
            }

            const tvScreenPos = targetPos.project(state.camera);
            const gazeX = state.mouse.x - tvScreenPos.x;
            const gazeY = state.mouse.y - tvScreenPos.y;

            const sensitivity = 5.0;
            let aspectCompensation = 1.0;
            if (theme === 'toxic' && screenAspect.current > 1.1) {
                aspectCompensation = 1 / screenAspect.current;
            }

            let finalX = (gazeX * sensitivity) + gazeOffset.x;
            let finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

            if (uvRotation !== 0) {
                if (Math.abs(uvRotation - Math.PI / 2) < 0.01) {
                    const temp = finalX; finalX = -finalY; finalY = temp;
                } else if (Math.abs(uvRotation + Math.PI / 2) < 0.01) {
                    const temp = finalX; finalX = finalY; finalY = -temp;
                } else {
                    const cosR = Math.cos(-uvRotation);
                    const sinR = Math.sin(-uvRotation);
                    const rotatedX = finalX * cosR - finalY * sinR;
                    const rotatedY = finalX * sinR + finalY * cosR;
                    finalX = rotatedX;
                    finalY = rotatedY;
                }
            }

            normalizedMouse.current.x = Math.max(-1, Math.min(1, finalX));
            normalizedMouse.current.y = Math.max(-1, Math.min(1, finalY));

            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');

            const speed = 2.0 * dt;
            currentLookAt.current.x += (normalizedMouse.current.x - currentLookAt.current.x) * speed;
            currentLookAt.current.y += (normalizedMouse.current.y - currentLookAt.current.y) * speed;

            // Polaroid Animation Progress
            // Polaroid Animation Progress: lock at 1.0 while rendering so they flicker out instead of smoothly shrinking
            const pSpeed = 1.2 * dt;
            if (isFocused || targetFigure === 'polaroids' || renderedFigure === 'polaroids') {
                polaroidAnimProgress.current = Math.min(1.0, polaroidAnimProgress.current + pSpeed);
            } else {
                polaroidAnimProgress.current = Math.max(0.0, polaroidAnimProgress.current - pSpeed);
            }

            // Advance the stateful polaroid engine
            const keepPolaroidsAlive = isFocused || targetFigure === 'polaroids' || renderedFigure === 'polaroids';
            updatePolaroids(dt, hoveredPolaroidId, zoomedPolaroidId, keepPolaroidsAlive, POLAROIDS);

            const blink = blinkState.current;
            blink.blinkTimer += dt;

            if (!blink.isBlinking) {
                if (state.clock.elapsedTime > blink.nextBlinkTime) {
                    blink.isBlinking = true;
                    blink.blinkTimer = 0;
                    blink.nextBlinkTime = state.clock.elapsedTime + Math.random() * 4 + 2;
                }
                blink.openness = 1.0;
            } else {
                const progress = blink.blinkTimer / blink.blinkDuration;
                if (progress >= 1) {
                    blink.isBlinking = false;
                    blink.openness = 1.0;
                } else {
                    blink.openness = Math.abs(Math.cos(progress * Math.PI));
                }
            }

            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;

                // Optimization: Cache gradients
                if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                const cache = screenTextureRef.current.userData;
                const needsUpdate = cache.w !== w || cache.h !== h || cache.theme !== theme;

                if (needsUpdate) {
                    cache.w = w;
                    cache.h = h;
                    cache.theme = theme;

                    const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                    backlight.addColorStop(0, activeTheme.glowCenter);
                    backlight.addColorStop(1, 'rgba(0,0,0,0)');
                    cache.backlight = backlight;

                    const vignette = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                    vignette.addColorStop(0, 'rgba(0,0,0,0)');
                    vignette.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                    vignette.addColorStop(1, activeTheme.vignetteColor);
                    cache.vignette = vignette;
                }

                // Base Background
                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);

                if (cache.backlight) {
                    ctx.fillStyle = cache.backlight;
                    ctx.fillRect(0, 0, w, h);
                }

                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);

                const figureOpacity = transitionOpacity.current;
                const figureStepped = Math.floor(figureOpacity * 10) / 10;

                // 1. Draw Eye
                if (renderedFigure === 'eye') {
                    ctx.save();
                    ctx.globalAlpha = figureStepped;

                    const isLCD = theme === 'toxic';
                    const scleraMaxOffsetX = isLCD ? 150 : 100;
                    const scleraMaxOffsetY = 100;

                    const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                    const effectiveScleraY = -currentLookAt.current.y * scleraMaxOffsetY;

                    ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);

                    let scaleEye = 1.0;
                    if (theme === 'mobile') scaleEye = 0.6;

                    let geoCorrectionX = 1.0;
                    if (theme === 'toxic' && screenAspect.current > 1.2) {
                        geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    }

                    ctx.scale(geoCorrectionX * scaleEye, blink.openness * scaleEye);

                    const irisColor = activeTheme.irisColor;
                    const customLookRange = (theme === 'toxic') ? 32 : (theme === 'mobile') ? 15 : 26;
                    const isHologram = theme === 'mobile' || theme === 'hacker' || theme === 'holo';
                    const scleraColor = activeTheme.scleraColor || '#ffffff';

                    drawPixelEye(
                        ctx,
                        normalizedMouse.current,
                        irisColor,
                        customLookRange,
                        scleraColor,
                        isHologram
                    );

                    ctx.restore();
                }

                const isContentVisible = renderedFigure === 'polaroids';

                // 2. Focused Text & Polaroid Collage
                if (isContentVisible && figureStepped > 0.01) {
                    const premiumGlowIntensity = cache.premiumGlowIntensity || 1.0;
                    
                    // Center rendering context and handle hardware-specific UV inversions
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }
                    ctx.translate(-w / 2, -h / 2);

                    // Draw the dynamic interactive polaroid collage
                    drawPolaroids(
                        ctx,
                        w,
                        h,
                        hoveredPolaroidId,
                        zoomedPolaroidId,
                        polaroidAnimProgress.current,
                        state.clock.elapsedTime,
                        figureStepped
                    );

                    // Draw Header ON TOP of polaroids
                    if (focusedText) {
                        drawTelevisionHeader(ctx, focusedText, w, h, premiumGlowIntensity, figureStepped, state.clock.elapsedTime, buttonColor);
                    }
                    
                    ctx.restore();
                }

                // 3. UI Buttons
                if (isContentVisible && figureStepped > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = figureStepped;

                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    ctx.globalCompositeOperation = 'screen';

                    // Animated Hover States
                    if (typeof cache.hoverAnimBack === 'undefined') cache.hoverAnimBack = 0;
                    if (typeof cache.hoverAnimMenu === 'undefined') cache.hoverAnimMenu = 0;

                    const lerpSpeed = 0.15;
                    cache.hoverAnimBack += ((backButtonHovered ? 1 : 0) - cache.hoverAnimBack) * lerpSpeed;
                    cache.hoverAnimMenu += ((menuButtonHovered ? 1 : 0) - cache.hoverAnimMenu) * lerpSpeed;

                    // Bottom Navigation (Back, Menu)
                    if (showBackButton) {
                        const btnX = backButtonPosition ? backButtonPosition.x : LIFESTYLE_BUTTON_CONFIG.BACK.x;
                        const btnY = backButtonPosition ? backButtonPosition.y : LIFESTYLE_BUTTON_CONFIG.BACK.y;
                        drawBackButton(ctx, btnX, btnY, cache.hoverAnimBack, buttonColor);
                    }

                    if (showMenuButton) {
                        const btnX = menuButtonPosition ? menuButtonPosition.x : LIFESTYLE_BUTTON_CONFIG.MENU.x;
                        const btnY = menuButtonPosition ? menuButtonPosition.y : LIFESTYLE_BUTTON_CONFIG.MENU.y;
                        drawMenuButton(ctx, btnX, btnY, cache.hoverAnimMenu, buttonColor);
                    }

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                }

                // 4. Draw Zoomed Polaroid last so it covers UI and text
                if (isContentVisible && zoomedPolaroidId) {
                    ctx.save();
                    if (invertY) {
                        // Canvas is already centered at 0,0 for drawZoomedPolaroid
                        // but we need to pass invertY flip *around center* if we want to reverse its orientation.
                        // Actually, the easiest way is to apply the same transform applied to the main context before.
                        ctx.translate(w / 2, h / 2);
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                        ctx.translate(-w / 2, -h / 2);
                    }
                    drawZoomedPolaroid(
                        ctx,
                        w,
                        h,
                        POLAROIDS,
                        zoomedPolaroidId,
                        polaroidAnimProgress.current,
                        state.clock.elapsedTime,
                        figureStepped
                    );
                    ctx.restore();
                }
            }

            screenTextureRef.current.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            {clonedModel && (
                <primitive
                    object={clonedModel}
                    onPointerMove={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || renderedFigure !== 'polaroids') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();

                            // 1. If a polaroid is zoomed, it covers the whole screen
                            if (zoomedPolaroidId) {
                                if (backButtonHovered) setBackButtonHovered(false);
                                if (menuButtonHovered) setMenuButtonHovered(false);
                                if (hoveredPolaroidId) setHoveredPolaroidId(null);
                                document.body.style.cursor = 'pointer';
                                return;
                            }

                            // 2. Check UI Buttons
                            const buttonHit = checkButtonHover(
                                e.uv,
                                isFocused,
                                invertY,
                                showBackButton,
                                showMenuButton,
                                backButtonPosition,
                                menuButtonPosition
                            );

                            const newBackHover = buttonHit === 'back';
                            const newMenuHover = buttonHit === 'menu';

                            if (newBackHover !== backButtonHovered) setBackButtonHovered(newBackHover);
                            if (newMenuHover !== menuButtonHovered) setMenuButtonHovered(newMenuHover);

                            // 3. Check Polaroids only if NO button was hit
                            let hitPolaroid = null;
                            if (!buttonHit && polaroidAnimProgress.current > 0.5 && screenTextureRef.current) {
                                const canvas = screenTextureRef.current.image as HTMLCanvasElement;
                                // We don't need focusTime anymore because getActivePolaroids uses the module state directly
                                hitPolaroid = checkPolaroidHit(e.uv, canvas.width, canvas.height, POLAROIDS, null, hoveredPolaroidId, invertY);
                            }
                            if (hitPolaroid !== hoveredPolaroidId) {
                                setHoveredPolaroidId(hitPolaroid);
                            }

                            document.body.style.cursor = (buttonHit || hitPolaroid) ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused || renderedFigure !== 'polaroids') return;
                        setBackButtonHovered(false);
                        setMenuButtonHovered(false);
                    }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || renderedFigure !== 'polaroids') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            // 1. If zoomed, clicking anywhere dismisses it
                            if (zoomedPolaroidId) {
                                setZoomedPolaroidId(null);
                                return;
                            }

                            // 2. Check UI Buttons
                            const buttonHit = checkButtonHover(
                                e.uv,
                                isFocused,
                                invertY,
                                showBackButton,
                                showMenuButton,
                                backButtonPosition,
                                menuButtonPosition
                            );

                            if (buttonHit === 'back' && onBackClick) {
                                onBackClick();
                                return;
                            } else if (buttonHit === 'menu' && onMenuClick) {
                                onMenuClick();
                                return;
                            }

                            // 3. Check Polaroids
                            if (polaroidAnimProgress.current > 0.5 && screenTextureRef.current) {
                                const canvas = screenTextureRef.current.image as HTMLCanvasElement;
                                const hit = checkPolaroidHit(e.uv, canvas.width, canvas.height, POLAROIDS, null, hoveredPolaroidId, invertY);
                                if (hit) {
                                    setZoomedPolaroidId(hit);
                                }
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}
