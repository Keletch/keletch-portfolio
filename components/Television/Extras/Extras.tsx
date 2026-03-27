import { useRef, useEffect, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ExtrasProps, EXTRAS_BUTTON_CONFIG } from './ExtrasTypes';
import { THEMES } from '../Types';
import {
    drawBackButton,
    drawMenuButton,
    drawPlayStopButton,
    checkButtonHover,
    drawTelevisionHeader
} from './ExtrasHelpers';
import {
    drawAbstractGamesAnimation,
    drawPortalAnimation
} from './Games/GamesHelpers';
import { drawPixelEye } from '../Helpers';
import { useTVModel } from '@/hooks/useTVModel';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useSettingsStore } from '@/components/store/useSettingsStore';

const DEFAULT_SCREEN_NAMES = ['screen'];

export default function ExtrasTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'classic',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText = 'EXTRAS',
    isFocused = false,
    showBackButton = false,
    onBackClick,
    backButtonPosition = EXTRAS_BUTTON_CONFIG.BACK,
    showMenuButton = false,
    menuButtonPosition = EXTRAS_BUTTON_CONFIG.MENU,
    onMenuClick,
    showLeftButton = true,
    leftButtonPosition = EXTRAS_BUTTON_CONFIG.LEFT,
    onLeftClick,
    showRightButton = true,
    rightButtonPosition = EXTRAS_BUTTON_CONFIG.RIGHT,
    onRightClick,
    showGamesButton = true,
    gamesButtonPosition = EXTRAS_BUTTON_CONFIG.GAMES,
    onGamesClick
}: ExtrasProps) {
    const activeTheme = THEMES[theme as keyof typeof THEMES] || THEMES.classic;
    const buttonColor = activeTheme.highlightColor || '#ffffff';
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

    const [hoveredButton, setHoveredButton] = useState<'back' | 'menu' | 'left' | 'right' | 'games' | null>(null);

    const CATEGORIES = ['Games', 'Visualizer'];
    const [categoryIndex, setCategoryIndex] = useState(0);

    const handlePrevCategory = () => {
        setCategoryIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length);
        if (onLeftClick) onLeftClick();
    };

    const handleNextCategory = () => {
        setCategoryIndex((prev) => (prev + 1) % CATEGORIES.length);
        if (onRightClick) onRightClick();
    };

    const { clonedModel, screenTextureRef, screenMeshRef, screenAspect } = useTVModel({
        modelPath,
        screenNames,
        rotationX,
        modelYOffset,
        uvRotation
    });

    const blinkState = useRef({
        isBlinking: false, openness: 1.0, nextBlinkTime: 0, blinkDuration: 0.15, blinkTimer: 0
    });

    // Removed hoverProgressRefs, now using cache directly

    const [delayedFocus, setDelayedFocus] = useState(false);
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedFocus(true), 600);
            return () => clearTimeout(t);
        } else {
            setDelayedFocus(false);
            setHoveredButton(null);
        }
    }, [isFocused]);

    // 1. Overall transition (Eye vs. HUD)
    const { renderedFigure: overallFigure, transitionOpacity: overallOpacity } = useFigureTransition(!delayedFocus ? 'eye' : 'content', 0);
    
    // 2. Category-specific transition (Only for flicker on category change)
    const { renderedFigure: renderedCategoryName, transitionOpacity: categoryOpacity } = useFigureTransition(CATEGORIES[categoryIndex].toLowerCase(), 0);

    const targetPosRef = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
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
                const mesh = screenMeshRef.current;
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const box = mesh.geometry.boundingBox;
                if (box) {
                    box.getCenter(targetPos);
                    mesh.localToWorld(targetPos);
                }
            } else {
                groupRef.current.getWorldPosition(targetPos);
            }

            const tvScreenPos = targetPos.project(state.camera);
            const gazeX = state.mouse.x - tvScreenPos.x;
            const gazeY = state.mouse.y - tvScreenPos.y;

            let aspectCompensation = 1.0;
            if (theme === 'toxic' && screenAspect.current > 1.1) {
                aspectCompensation = 1 / screenAspect.current;
            }

            const finalX = (gazeX * 5.0) + gazeOffset.x;
            const finalY = (invertY ? -gazeY : gazeY) * 5.0 * aspectCompensation + gazeOffset.y;

            normalizedMouse.current.x = Math.max(-1, Math.min(1, finalX));
            normalizedMouse.current.y = Math.max(-1, Math.min(1, finalY));

            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            const speed = 2.0 * dt;
            currentLookAt.current.x += (normalizedMouse.current.x - currentLookAt.current.x) * speed;
            currentLookAt.current.y += (normalizedMouse.current.y - currentLookAt.current.y) * speed;

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

                // Caching
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
                }

                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);
                if (cache.backlight) {
                    ctx.fillStyle = cache.backlight;
                    ctx.fillRect(0, 0, w, h);
                }

                const currentOverallOpacity = Math.floor(overallOpacity.current * 10) / 10;
                const currentCategoryOpacity = Math.floor(categoryOpacity.current * 10) / 10;

                // --- Eye Rendering ---
                if (overallFigure === 'eye') {
                    ctx.save();
                    ctx.globalAlpha = currentOverallOpacity;

                    let geoCorrectionX = 1.0;
                    if (theme === 'toxic' && screenAspect.current > 1.2) {
                        geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    }

                    ctx.translate(w / 2 + currentLookAt.current.x * 100, h / 2 - currentLookAt.current.y * 100);
                    ctx.scale(geoCorrectionX, blink.openness);
                    drawPixelEye(ctx, { x: normalizedMouse.current.x, y: normalizedMouse.current.y }, activeTheme.irisColor, activeTheme.lookRange, activeTheme.scleraColor, activeTheme.isHologram);
                    ctx.restore();
                }

                // --- Extras Content (HUD) ---
                if (overallFigure === 'content') {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }
                    
                    ctx.save();
                    ctx.globalAlpha = currentOverallOpacity;

                    // BUTTONS HOVER ANIMATION LOGIC
                    if (typeof cache.hoverAnimBack === 'undefined') cache.hoverAnimBack = 0;
                    if (typeof cache.hoverAnimMenu === 'undefined') cache.hoverAnimMenu = 0;
                    if (typeof cache.hoverAnimLeft === 'undefined') cache.hoverAnimLeft = 0;
                    if (typeof cache.hoverAnimRight === 'undefined') cache.hoverAnimRight = 0;
                    if (typeof cache.hoverAnimGames === 'undefined') cache.hoverAnimGames = 0;

                    const lerpSpeed = 0.15;
                    cache.hoverAnimBack += (((hoveredButton === 'back') ? 1 : 0) - cache.hoverAnimBack) * lerpSpeed;
                    cache.hoverAnimMenu += (((hoveredButton === 'menu') ? 1 : 0) - cache.hoverAnimMenu) * lerpSpeed;
                    cache.hoverAnimLeft += (((hoveredButton === 'left') ? 1 : 0) - cache.hoverAnimLeft) * lerpSpeed;
                    cache.hoverAnimRight += (((hoveredButton === 'right') ? 1 : 0) - cache.hoverAnimRight) * lerpSpeed;
                    cache.hoverAnimGames += (((hoveredButton === 'games') ? 1 : 0) - cache.hoverAnimGames) * lerpSpeed;

                    // UI BUTTONS RENDERING
                    ctx.globalCompositeOperation = 'screen';
                    if (showBackButton) drawBackButton(ctx, backButtonPosition.x, backButtonPosition.y, cache.hoverAnimBack, buttonColor);
                    if (showMenuButton) drawMenuButton(ctx, menuButtonPosition.x, menuButtonPosition.y, cache.hoverAnimMenu, buttonColor);
                    if (showLeftButton) drawPlayStopButton(ctx, leftButtonPosition.x, leftButtonPosition.y, cache.hoverAnimLeft, 0, buttonColor, Math.PI);
                    if (showRightButton) drawPlayStopButton(ctx, rightButtonPosition.x, rightButtonPosition.y, cache.hoverAnimRight, 0, buttonColor, 0);

                    ctx.restore(); // End stable elements

                    // 2. CATEGORY-SPECIFIC ELEMENTS (Animation and Label)
                    // These use categoryOpacity which flickers on category change OR eye transition
                    // We multiply by overallOpacity to ensure they fade out when exiting Extras
                    ctx.save();
                    const combinedOpacity = currentCategoryOpacity * currentOverallOpacity;
                    ctx.globalAlpha = combinedOpacity;

                    // MAIN ANIMATION (XOR)
                    // We only show the animation if there's a valid category currently "rendered" by the transition hook
                    if (showGamesButton && renderedCategoryName) {
                        if (renderedCategoryName === 'games') {
                            drawPortalAnimation(ctx, 0, -20, cache.hoverAnimGames, buttonColor, time);
                        } else {
                            drawAbstractGamesAnimation(ctx, gamesButtonPosition.x, gamesButtonPosition.y, cache.hoverAnimGames, buttonColor, time);
                        }
                    }

                    // CATEGORY LABEL
                    if (renderedCategoryName) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'source-over';
                        // No need for globalAlpha again, it's inherited from combinedOpacity

                        const fontSize = 38;
                        ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';

                        // Use capitalized rendered figure name for the label
                        const labelText = renderedCategoryName.charAt(0).toUpperCase() + renderedCategoryName.slice(1);
                        const textWidth = ctx.measureText(labelText).width;
                        let currentX = -textWidth / 2;
                        const labelY = 190;

                        const globalJitterX = (Math.random() - 0.5) * 3;
                        const globalJitterY = (Math.random() - 0.5) * 3;

                        const chars = labelText.split('');
                        chars.forEach((char: string) => {
                            const charWidth = ctx.measureText(char).width;
                            if (Math.random() > 0.05) {
                                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                                ctx.fillText(char, currentX + 1 + globalJitterX, labelY + 1 + globalJitterY);
                                ctx.fillStyle = activeTheme.textColor || '#ffffff';
                                ctx.fillText(char, currentX + globalJitterX, labelY + globalJitterY);
                            }
                            currentX += charWidth;
                        });
                        ctx.restore();
                    }

                    ctx.restore(); // End category elements
                    ctx.restore(); // End translation (MATCHES line 231)

                    // Draw Header ON TOP (Clean Absolute Origin)
                    if (overallFigure === 'content' && currentOverallOpacity > 0.01 && focusedText) {
                        const premiumGlowIntensity = useSettingsStore.getState().premiumGlowIntensity;
                        ctx.save();
                        ctx.translate(w / 2, h / 2);
                        if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }
                        ctx.translate(-w / 2, -h / 2);
                        drawTelevisionHeader(ctx, focusedText, w, h, premiumGlowIntensity, currentOverallOpacity, state.clock.elapsedTime, buttonColor);
                        ctx.restore();
                    }
                }

                // IMPORTANT: Texture must be flagged to update or the pixels won't change on the mesh!
                screenTextureRef.current.needsUpdate = true;
            }
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}
            onPointerOut={() => { setHoveredButton(null); document.body.style.cursor = 'auto'; }}
        >
            {clonedModel && (
                <primitive
                    object={clonedModel}
                    onPointerMove={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || overallFigure !== 'content') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            let buttonHit: 'back' | 'menu' | 'left' | 'right' | 'games' | null = null;
                            if (showBackButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.BACK, 512, 512)) buttonHit = 'back';
                            if (showMenuButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.MENU, 512, 512)) buttonHit = 'menu';
                            if (showLeftButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.LEFT, 512, 512)) buttonHit = 'left';
                            if (showRightButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.RIGHT, 512, 512)) buttonHit = 'right';
                            if (showGamesButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.GAMES, 512, 512)) buttonHit = 'games';

                            if (buttonHit !== hoveredButton) setHoveredButton(buttonHit);
                            document.body.style.cursor = buttonHit ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused || overallFigure !== 'content') return;
                        setHoveredButton(null);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || overallFigure !== 'content') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            let buttonHit: 'back' | 'menu' | 'left' | 'right' | 'games' | null = null;
                            if (showBackButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.BACK, 512, 512)) buttonHit = 'back';
                            if (showMenuButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.MENU, 512, 512)) buttonHit = 'menu';
                            if (showLeftButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.LEFT, 512, 512)) buttonHit = 'left';
                            if (showRightButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.RIGHT, 512, 512)) buttonHit = 'right';
                            if (showGamesButton && checkButtonHover(e.uv.x, e.uv.y, invertY, EXTRAS_BUTTON_CONFIG.GAMES, 512, 512)) buttonHit = 'games';

                            if (buttonHit === 'back' && onBackClick) onBackClick();
                            else if (buttonHit === 'menu' && onMenuClick) onMenuClick();
                            else if (buttonHit === 'left') handlePrevCategory();
                            else if (buttonHit === 'right') handleNextCategory();
                            else if (buttonHit === 'games' && onGamesClick) onGamesClick();
                        }
                    }}
                />
            )}

        </group>
    );
}

useGLTF.preload('/models/cartridge_QwertyShoot.glb');
