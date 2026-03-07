import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { AboutMeProps, ABOUTME_THEME, ABOUTME_BUTTON_CONFIG } from './AboutMeTypes';
import { THEMES } from '../Types';
import { drawPixelEye, drawPlayStopButton, drawBackButton, drawMenuButton, drawButtonShockwave, paginateStory, drawNeuralMesh, drawLiquidMetal, drawHyperPulse, drawAudioWaveform, drawOrbitalRings } from './AboutMeHelpers';

interface ThemeOverride {
    bgColor: string;
    baseColor: string;
    glowCenter: string;
    vignetteColor: string;
    irisColor: string;
    scleraColor: string;
    isHologram?: boolean;
    textColor?: string;
    highlightColor?: string;
    textShadow1?: string;
    textShadow2?: string;
}

import { useTypewriter } from '@/hooks/useTypewriter';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';

const DEFAULT_SCREEN_NAMES = ['screen'];
const ABOUT_FIGURES = ['neural_mesh', 'architecture', 'hyper_pulse', 'audio_waveform', 'orbital_rings'];

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
    enableStoryMode = false,
    themeOverride
}: AboutMeProps & { themeOverride?: ThemeOverride }) {
    const themeBasedDefaults = THEMES[theme as keyof typeof THEMES] || ABOUTME_THEME;
    const activeTheme = themeOverride ? { ...themeBasedDefaults, ...themeOverride } : themeBasedDefaults;
    const buttonColor = theme === 'classic' ? '#ffffff' : activeTheme.highlightColor;
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });
    const [startButtonHovered, setStartButtonHovered] = useState(false);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);

    // Reset UI state when losing focus
    const [delayedUI, setDelayedUI] = useState(false);

    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedUI(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedUI(false);
            setStartButtonHovered(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            document.body.style.cursor = 'auto';
        }
    }, [isFocused]);

    const { renderedFigure: renderedUI, transitionOpacity: uiOpacityRef } = useFigureTransition(delayedUI ? 'ui' : null, 0);

    const paginationResult = useMemo(() => {
        if (!enableStoryMode || !storyContent) {
            return { pages: [], paragraphMap: [] };
        }
        return paginateStory(
            storyContent,
            380,
            4,
            '20px "Courier New", monospace'
        );
    }, [storyContent, enableStoryMode]);

    const {
        storyMode,
        currentParagraph,
        waitingForInput,
        typingStartTime,
        startStory,
        stopStory,
        handleInteraction,
        signalTypingFinished,
        playTypewriterSound
    } = useTypewriter({
        storyContent: paginationResult.pages,
        enableStoryMode
    });

    // Reset story if focus is lost while playing
    useEffect(() => {
        if (!isFocused && storyMode) {
            stopStory();
        }
    }, [isFocused, storyMode, stopStory]);

    const lastCharCountRef = useRef(0);

    // Reset char count when paragraph changes or story stops
    useEffect(() => {
        lastCharCountRef.current = 0;
    }, [currentParagraph, storyMode, typingStartTime]);

    const actualParagraphIndex = paginationResult.paragraphMap[currentParagraph] ?? 0;
    const currentFigureProp = (storyMode && storyFigures && storyFigures[actualParagraphIndex]) ? storyFigures[actualParagraphIndex] : 'eye';

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
        screenMeshRef
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


    // UV-based interaction check for HUD buttons
    const checkButtonHover = (uv: THREE.Vector2): 'play' | 'back' | 'menu' | 'story_text' | null => {
        if (!isFocused || renderedUI !== 'ui') return null;

        const px = uv.x * 512;
        const py = (1 - uv.y) * 512;
        const dx = px - 256;
        let dy = py - 256;

        if (invertY) dy = -dy;

        if (showStartButton) {
            const btnX = startButtonPosition ? startButtonPosition.x : ABOUTME_BUTTON_CONFIG.PLAY.x;
            const btnY = startButtonPosition ? startButtonPosition.y : ABOUTME_BUTTON_CONFIG.PLAY.y;
            if (Math.sqrt((dx - btnX) ** 2 + (dy - btnY) ** 2) < ABOUTME_BUTTON_CONFIG.PLAY.radius) return 'play';
        }

        if (showBackButton) {
            const btnX = backButtonPosition ? backButtonPosition.x : ABOUTME_BUTTON_CONFIG.BACK.x;
            const btnY = backButtonPosition ? backButtonPosition.y : ABOUTME_BUTTON_CONFIG.BACK.y;
            if (Math.sqrt((dx - btnX) ** 2 + (dy - btnY) ** 2) < ABOUTME_BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const btnX = menuButtonPosition ? menuButtonPosition.x : ABOUTME_BUTTON_CONFIG.MENU.x;
            const btnY = menuButtonPosition ? menuButtonPosition.y : ABOUTME_BUTTON_CONFIG.MENU.y;
            if (Math.sqrt((dx - btnX) ** 2 + (dy - btnY) ** 2) < ABOUTME_BUTTON_CONFIG.MENU.radius) return 'menu';
        }

        if (storyMode) {
            const halfW = 410 / 2;
            if (dx >= -halfW && dx <= halfW && dy >= 55 && dy <= 55 + 86) return 'story_text';
        }

        return null;
    };

    const targetPosRef = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
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
            const aspectCompensation = 1.0;

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

                // Background and backlight rendering
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

                    if (type === 'neural_mesh') {
                        ctx.translate(w / 2, h / 2);
                        drawNeuralMesh(ctx, time);
                    } else if (type === 'liquid_metal') {
                        ctx.translate(w / 2, h / 2);
                        drawLiquidMetal(ctx, time);
                    } else if (type === 'hyper_pulse') {
                        ctx.translate(w / 2, h / 2);
                        drawHyperPulse(ctx, time);
                    } else if (type === 'audio_waveform') {
                        ctx.translate(w / 2, h / 2);
                        drawAudioWaveform(ctx, time);
                    } else if (type === 'orbital_rings') {
                        ctx.translate(w / 2, h / 2);
                        drawOrbitalRings(ctx, time);
                    } else {
                        // Default Eye
                        const scleraMaxOffsetX = 100;
                        const scleraMaxOffsetY = 100;
                        const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                        const effectiveScleraY = -currentLookAt.current.y * scleraMaxOffsetY;
                        ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);
                        const isHologram = (theme === 'sonar' || theme === 'mobile' || (activeTheme as ThemeOverride).isHologram);
                        ctx.scale(1.0, blink.openness);

                        const irisColor = activeTheme.irisColor;

                        drawPixelEye(
                            ctx,
                            normalizedMouse.current,
                            irisColor,
                            activeTheme.lookRange,
                            activeTheme.scleraColor,
                            isHologram
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
                gradient.addColorStop(1, activeTheme.vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // Story Text Rendering
                const storyOpacity = storyOpacityRef.current;
                const storyStepped = Math.floor(storyOpacity * steps) / steps;

                if (renderedStoryFigure === 'story' && storyStepped > 0.01) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }
                    const textBoxY = 42;
                    const maxWidth = 380;
                    const lineHeight = 28;
                    const padding = 15;
                    const boxHeight = 142;
                    const totalWidth = maxWidth + (padding * 2);

                    ctx.globalAlpha = storyStepped;
                    ctx.strokeStyle = activeTheme.highlightColor ? `rgba(${parseInt(activeTheme.highlightColor.slice(1, 3), 16)}, ${parseInt(activeTheme.highlightColor.slice(3, 5), 16)}, ${parseInt(activeTheme.highlightColor.slice(5, 7), 16)}, ${storyStepped})` : `rgba(255, 255, 255, ${storyStepped})`;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-totalWidth / 2, textBoxY - padding, totalWidth, boxHeight);

                    const fullText = paginationResult.pages[currentParagraph] || '';
                    if (fullText) {
                        let charsToShow = 0;
                        if (waitingForInput) {
                            charsToShow = fullText.length;
                        } else {
                            const charSpeed = 0.05;
                            const timeSinceStart = (Date.now() - typingStartTime) / 1000;
                            charsToShow = Math.floor(timeSinceStart / charSpeed);

                            if (charsToShow >= fullText.length) signalTypingFinished();
                        }

                        charsToShow = Math.min(charsToShow, fullText.length);

                        if (charsToShow > lastCharCountRef.current) {
                            playTypewriterSound();
                            lastCharCountRef.current = charsToShow;
                        }

                        const currentVisibleText = fullText.slice(0, charsToShow);

                        ctx.font = '20px "Courier New", monospace';
                        ctx.fillStyle = activeTheme.textColor || '#ffffff';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';

                        currentVisibleText.split('\n').forEach((txt, i) => {
                            const baseTextColor = activeTheme.textColor || '#ffffff';
                            // Parse hex to rgb for alpha
                            const r = parseInt(baseTextColor.slice(1, 3), 16);
                            const g = parseInt(baseTextColor.slice(3, 5), 16);
                            const b = parseInt(baseTextColor.slice(5, 7), 16);
                            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${storyStepped})`;
                            ctx.fillText(txt, -maxWidth / 2, textBoxY + (i * lineHeight));
                        });
                    }

                    if (waitingForInput && Math.floor(state.clock.elapsedTime * 2) % 2 === 0) {
                        ctx.font = '20px "Courier New", monospace';
                        const arrowColor = activeTheme.highlightColor || '#ffffff';
                        const r = parseInt(arrowColor.slice(1, 3), 16);
                        const g = parseInt(arrowColor.slice(3, 5), 16);
                        const b = parseInt(arrowColor.slice(5, 7), 16);
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${storyStepped})`;
                        ctx.fillText('▼', (maxWidth / 2) - 15, textBoxY + (lineHeight * 1.5));
                    }
                    ctx.restore();
                }

                // UI Overlay (Focused Text & Buttons)
                const uiOpacityVal = uiOpacityRef.current;
                const uiSteppedOpacity = Math.floor(uiOpacityVal * 10) / 10;

                if (uiSteppedOpacity > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = uiSteppedOpacity;

                    // Focused Text
                    if (focusedText) {
                        ctx.save();

                        const titleJitter = Math.sin(state.clock.elapsedTime * 15) > 0.8 ? (Math.random() - 0.5) * 0.2 : 0;
                        const titleAlpha = Math.max(0, Math.min(1, uiSteppedOpacity + titleJitter));
                        ctx.globalAlpha = titleAlpha;

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
                        const shadow1 = activeTheme.textShadow1 || 'rgba(255, 0, 0, 0.5)';
                        const shadow2 = activeTheme.textShadow2 || 'rgba(0, 255, 255, 0.5)';

                        ctx.fillStyle = (activeTheme.textShadow1) ? shadow1 + '80' : shadow1;
                        ctx.fillText(focusedText, jitterX + 4, textY + jitterY);

                        ctx.fillStyle = (activeTheme.textShadow2) ? shadow2 + '80' : shadow2;
                        ctx.fillText(focusedText, jitterX - 4, textY + jitterY);

                        ctx.fillStyle = activeTheme.textColor || '#ffffff';
                        if (Math.random() > 0.1) {
                            ctx.fillText(focusedText, jitterX, textY + jitterY);
                        }
                        ctx.restore();
                    }

                    // Buttons
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    const btnJitterBase = Math.sin(state.clock.elapsedTime * 12 + 5) > 0.8 ? (Math.random() - 0.5) * 0.3 : 0;
                    const btnBaseAlpha = Math.max(0, Math.min(1, uiSteppedOpacity + btnJitterBase));
                    ctx.globalAlpha = btnBaseAlpha;

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
                            hoverProgress = screenTextureRef.current.userData.hoverAnim;
                        }
                        const morphTarget = storyMode ? 1 : 0;
                        morphProgressRef.current += (morphTarget - morphProgressRef.current) * 0.15;
                        drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, buttonColor);
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, morphProgressRef.current, buttonColor);
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
                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack, buttonColor);
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
                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu, buttonColor);
                    }

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                    ctx.restore(); // End of UI Overlay save block
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
                    }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
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
