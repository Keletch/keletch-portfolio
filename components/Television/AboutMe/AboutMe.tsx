import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AboutMeProps, ABOUTME_THEME, ABOUTME_BUTTON_CONFIG } from './AboutMeTypes';
import { drawPixelEye, drawConcentricCircles, draw3DCube, drawDNAHelix, drawPlayStopButton, drawBackButton, drawMenuButton, drawButtonShockwave, paginateStory } from './AboutMeHelpers';

import { useTypewriter } from '@/hooks/useTypewriter';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';

const DEFAULT_SCREEN_NAMES = ['screen'];

export default function AboutMeTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'void',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText,
    isFocused = false,
    textYOffset = 60,
    showStartButton = false,
    startButtonPosition,
    onStartClick,
    showBackButton = false,
    onBackClick,
    backButtonPosition,
    showMenuButton = false,
    menuButtonPosition,
    onMenuClick,
    storyContent,
    storyFigures,
    enableStoryMode = false
}: AboutMeProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { size } = useThree();
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });
    const [startButtonHovered, setStartButtonHovered] = useState(false);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);

    // Reset hover states and cursor when losing focus to prevent stuck visuals on re-entry
    useEffect(() => {
        if (!isFocused) {
            setStartButtonHovered(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            document.body.style.cursor = 'auto'; // Reset global cursor
        }
    }, [isFocused]);

    const paginationResult = useMemo(() => {
        if (!enableStoryMode || !storyContent) {
            return { pages: [], paragraphMap: [] };
        }
        return paginateStory(
            storyContent,
            380,
            2,
            '20px "Courier New", monospace'
        );
    }, [storyContent, enableStoryMode]);

    const {
        storyMode,
        displayedText,
        waitingForInput,
        currentParagraph,
        startStory,
        stopStory,
        handleInteraction
    } = useTypewriter({
        storyContent: paginationResult.pages,
        enableStoryMode
    });

    const actualParagraphIndex = paginationResult.paragraphMap[currentParagraph] ?? 0;
    const currentFigureProp = (storyMode && storyFigures && storyFigures[actualParagraphIndex]) ? storyFigures[actualParagraphIndex] : null;

    const {
        renderedFigure,
        transitionOpacity: transitionOpacityRef
    } = useFigureTransition(currentFigureProp);

    const {
        renderedFigure: renderedStoryFigure,
        transitionOpacity: storyOpacityRef
    } = useFigureTransition(storyMode ? 'story' : null);

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

    const morphProgressRef = useRef(0);

    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0,
        nextBlinkTime: 0,
        blinkDuration: 0.15,
        blinkTimer: 0
    });

    const activeTheme = ABOUTME_THEME;

    const checkButtonHover = (uv: THREE.Vector2): 'play' | 'back' | 'menu' | 'story_text' | null => {
        if (!isFocused) return null;

        let px = uv.x * 512;
        let py = (1 - uv.y) * 512;
        let dx = px - 256;
        let dy = py - 256;

        if (invertY) {
            dy = -dy;
        }

        if (showStartButton) {
            const btnX = startButtonPosition ? startButtonPosition.x : ABOUTME_BUTTON_CONFIG.PLAY.x;
            const btnY = startButtonPosition ? startButtonPosition.y : ABOUTME_BUTTON_CONFIG.PLAY.y;
            const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distPlay < ABOUTME_BUTTON_CONFIG.PLAY.radius) return 'play';
        }

        if (showBackButton) {
            const btnX = backButtonPosition ? backButtonPosition.x : ABOUTME_BUTTON_CONFIG.BACK.x;
            const btnY = backButtonPosition ? backButtonPosition.y : ABOUTME_BUTTON_CONFIG.BACK.y;
            const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distBack < ABOUTME_BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const btnX = menuButtonPosition ? menuButtonPosition.x : ABOUTME_BUTTON_CONFIG.MENU.x;
            const btnY = menuButtonPosition ? menuButtonPosition.y : ABOUTME_BUTTON_CONFIG.MENU.y;
            const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distMenu < ABOUTME_BUTTON_CONFIG.MENU.radius) return 'menu';
        }

        if (storyMode) {
            const boxW = 410;
            const boxH = 86;
            const boxTopY = 55;
            const halfW = boxW / 2;
            if (dx >= -halfW && dx <= halfW) {
                if (dy >= boxTopY && dy <= boxTopY + boxH) {
                    return 'story_text';
                }
            }
        }

        return null;
    };

    const renderAccumulator = useRef(0);
    const FPS_LIMIT = 24;
    const FRAME_DURATION = 1 / FPS_LIMIT;

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 15) return;
        }

        renderAccumulator.current += delta;
        if (renderAccumulator.current < FRAME_DURATION) return;

        const dt = renderAccumulator.current;
        renderAccumulator.current %= FRAME_DURATION;

        if (screenTextureRef.current && groupRef.current) {
            const targetPos = new THREE.Vector3();
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
                mesh.geometry.computeBoundingBox();
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

            const sensitivity = 5.0;
            let aspectCompensation = 1.0;
            // Simplified aspect logic for AboutMe (usually standard screen)

            const finalX = (gazeX * sensitivity) + gazeOffset.x;
            const finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

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
                const time = state.clock.elapsedTime;

                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);
                const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                backlight.addColorStop(0, activeTheme.glowCenter);
                backlight.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = backlight;
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);

                const drawContent = (type: string | null, alpha: number) => {
                    ctx.save();
                    ctx.globalAlpha = alpha;

                    if (type === 'circles') {
                        ctx.translate(w / 2, h / 2);
                        drawConcentricCircles(ctx, time);
                    } else if (type === 'cube') {
                        ctx.translate(w / 2, h / 2);
                        draw3DCube(ctx, time);
                    } else if (type === 'dna') {
                        ctx.translate(w / 2, h / 2);
                        drawDNAHelix(ctx, time);
                    } else {
                        // Default Eye
                        const scleraMaxOffsetX = 100;
                        const scleraMaxOffsetY = 100;
                        const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                        const effectiveScleraY = -currentLookAt.current.y * scleraMaxOffsetY;
                        ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);
                        const isHologram = (theme === 'sonar' || theme === 'mobile');
                        ctx.scale(1.0, blink.openness);

                        // simplified colors for about me (void usually)
                        let irisColor = '#9900ff';
                        if (theme === 'void') irisColor = '#9900ff';

                        drawPixelEye(
                            ctx,
                            normalizedMouse.current,
                            irisColor,
                            26,
                            '#ffffff',
                            false
                        );
                    }
                    ctx.restore();
                };

                const steps = 5;
                const transitionOpacity = transitionOpacityRef.current;
                const steppedOpacity = Math.floor(transitionOpacity * steps) / steps;
                if (steppedOpacity > 0.05) {
                    drawContent(renderedFigure, steppedOpacity);
                }

                // Vignette & Glow (Standard wrapper)
                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                // ... Theme colors ...
                gradient.addColorStop(1, 'rgba(10, 0, 20, 0.95)'); // Void vignette
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // Story Rendering
                const storyOpacity = storyOpacityRef.current;
                const storyStepped = Math.floor(storyOpacity * steps) / steps;

                if (renderedStoryFigure === 'story' && storyStepped > 0.01) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }
                    const textBoxY = 70;
                    const maxWidth = 380;
                    const lineHeight = 28;
                    const maxLines = 2;
                    const padding = 15;
                    const totalWidth = maxWidth + (padding * 2);
                    const totalHeight = (maxLines * lineHeight) + (padding * 2);

                    ctx.globalAlpha = storyStepped;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${storyStepped})`;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-totalWidth / 2, textBoxY - padding, totalWidth, totalHeight);

                    if (displayedText) {
                        ctx.font = '20px "Courier New", monospace';
                        ctx.fillStyle = '#ffffff';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';

                        const words = displayedText.split(' ');
                        let line = '';
                        const lines: string[] = [];
                        for (let i = 0; i < words.length; i++) {
                            const testLine = line + words[i] + ' ';
                            const metrics = ctx.measureText(testLine);
                            if (metrics.width > maxWidth && i > 0) {
                                lines.push(line);
                                line = words[i] + ' ';
                            } else {
                                line = testLine;
                            }
                        }
                        lines.push(line);
                        const visibleLines = lines.slice(0, maxLines);
                        visibleLines.forEach((txt, i) => {
                            ctx.fillStyle = `rgba(255, 255, 255, ${storyStepped})`;
                            ctx.fillText(txt, -maxWidth / 2, textBoxY + (i * lineHeight));
                        });
                    }
                    if (waitingForInput && displayedText) {
                        if (Math.floor(state.clock.elapsedTime * 2) % 2 === 0) {
                            ctx.font = '20px "Courier New", monospace';
                            ctx.fillStyle = `rgba(255, 255, 255, ${storyStepped})`;
                            ctx.fillText('▼', (maxWidth / 2) - 15, textBoxY + (lineHeight * 1.5));
                        }
                    }
                    ctx.restore();
                }

                // Focused Text
                if (isFocused && focusedText) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }
                    const jitterX = (Math.random() - 0.5) * 4;
                    const jitterY = (Math.random() - 0.5) * 4;
                    ctx.font = '900 50px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const textY = -h / 2 + textYOffset;
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillText(focusedText, jitterX + 4, textY + jitterY);
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.fillText(focusedText, jitterX - 4, textY + jitterY);
                    ctx.fillStyle = '#ffffff';
                    if (Math.random() > 0.1) {
                        ctx.fillText(focusedText, jitterX, textY + jitterY);
                    }
                    ctx.restore();
                }

                // Buttons
                if (isFocused) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : ABOUTME_BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : ABOUTME_BUTTON_CONFIG.PLAY.y;
                        const isHover = startButtonHovered;
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnim === 'undefined') screenTextureRef.current.userData.hoverAnim = 0;
                            const target = isHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnim += (target - screenTextureRef.current.userData.hoverAnim) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnim) < 0.001) screenTextureRef.current.userData.hoverAnim = 0;
                            hoverProgress = screenTextureRef.current.userData.hoverAnim;
                        }
                        const morphTarget = storyMode ? 1 : 0; // Morph only on storyMode
                        morphProgressRef.current += (morphTarget - morphProgressRef.current) * 0.15;
                        if (Math.abs(morphProgressRef.current - morphTarget) < 0.001) morphProgressRef.current = morphTarget;
                        drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, '#ffffff');
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, morphProgressRef.current, '#ffffff');
                    }

                    if (showBackButton) {
                        const btnBackX = backButtonPosition ? backButtonPosition.x : ABOUTME_BUTTON_CONFIG.BACK.x;
                        const btnBackY = backButtonPosition ? backButtonPosition.y : ABOUTME_BUTTON_CONFIG.BACK.y;
                        const isBackHover = backButtonHovered;
                        let hoverProgressBack = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimBack === 'undefined') {
                                screenTextureRef.current.userData.hoverAnimBack = 0;
                            }
                            const targetBack = isBackHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimBack += (targetBack - screenTextureRef.current.userData.hoverAnimBack) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimBack) < 0.001) {
                                screenTextureRef.current.userData.hoverAnimBack = 0;
                            }
                            hoverProgressBack = screenTextureRef.current.userData.hoverAnimBack;
                        }
                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack);
                    }

                    if (showMenuButton) {
                        const btnMenuX = menuButtonPosition ? menuButtonPosition.x : ABOUTME_BUTTON_CONFIG.MENU.x;
                        const btnMenuY = menuButtonPosition ? menuButtonPosition.y : ABOUTME_BUTTON_CONFIG.MENU.y;
                        const isMenuHover = menuButtonHovered;
                        let hoverProgressMenu = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimMenu === 'undefined') {
                                screenTextureRef.current.userData.hoverAnimMenu = 0;
                            }
                            const targetMenu = isMenuHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimMenu += (targetMenu - screenTextureRef.current.userData.hoverAnimMenu) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimMenu) < 0.001) {
                                screenTextureRef.current.userData.hoverAnimMenu = 0;
                            }
                            hoverProgressMenu = screenTextureRef.current.userData.hoverAnimMenu;
                        }
                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu);
                    }

                    ctx.globalCompositeOperation = 'source-over';
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
                    onPointerMove={(e: any) => {
                        if (!isFocused) return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            const buttonHit = checkButtonHover(e.uv);

                            const newPlayHover = buttonHit === 'play';
                            const newBackHover = buttonHit === 'back';
                            const newMenuHover = buttonHit === 'menu';
                            const newTextHover = buttonHit === 'story_text';

                            if (newPlayHover !== startButtonHovered) setStartButtonHovered(newPlayHover);
                            if (newBackHover !== backButtonHovered) setBackButtonHovered(newBackHover);
                            if (newMenuHover !== menuButtonHovered) setMenuButtonHovered(newMenuHover);

                            document.body.style.cursor = (newPlayHover || newBackHover || newMenuHover || newTextHover) ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused) return;
                        if (startButtonHovered) setStartButtonHovered(false);
                        if (backButtonHovered) setBackButtonHovered(false);
                        if (menuButtonHovered) setMenuButtonHovered(false);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e: any) => {
                        if (e.object.userData.isScreen && e.uv) {
                            const buttonHit = checkButtonHover(e.uv);
                            if (buttonHit === 'play') {
                                e.stopPropagation();
                                if (storyMode) {
                                    stopStory();
                                } else {
                                    startStory();
                                    if (onStartClick) onStartClick();
                                }
                            } else if (buttonHit === 'back' && onBackClick) {
                                e.stopPropagation();
                                stopStory();
                                onBackClick();
                            } else if (buttonHit === 'menu' && onMenuClick) {
                                e.stopPropagation();
                                stopStory();
                                onMenuClick();
                            } else if (buttonHit === 'story_text') {
                                e.stopPropagation();
                                handleInteraction();
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}
