
import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RadioProps, RADIO_THEME, RADIO_BUTTON_CONFIG } from './RadioTypes';
import { drawPixelEye, drawPlayPauseButton, drawBackButton, drawMenuButton, drawNextButton, drawButtonShockwave, drawProgressBar, drawTrackList, drawReactiveCircle } from './RadioHelpers';

import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';

const DEFAULT_SCREEN_NAMES = ['screen'];

export default function RadioTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
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
    onStopClick,
    status = 'stopped',
    currentSongName = '',
    currentProgress = 0,
    onSeek,
    showBackButton = false,
    onBackClick,
    backButtonPosition,
    showMenuButton = false,
    menuButtonPosition,
    showNextButton = false,
    nextButtonPosition,
    onNextClick,
    tracks = [],
    onSelectTrack,
    audioAnalyser,
    accentColor,
    themeOverride
}: RadioProps & { accentColor?: string; themeOverride?: { bgColor: string; baseColor: string; glowCenter: string; vignetteColor: string; irisColor: string; scleraColor: string } }) {
    const accent = accentColor || '#00ff44';
    const activeTheme = themeOverride ? { ...RADIO_THEME, ...themeOverride } : RADIO_THEME;
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });
    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const [startButtonHovered, setStartButtonHovered] = useState(false);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);
    const [nextButtonHovered, setNextButtonHovered] = useState(false);

    // Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const scrollYRef = useRef(0);
    const targetScrollYRef = useRef(0);
    const [hoveredTrackIndex, setHoveredTrackIndex] = useState(-1);
    const isListDraggingRef = useRef(false);
    const dragStartYRef = useRef(0);
    const dragStartScrollRef = useRef(0);
    const dragTotalDistanceRef = useRef(0);

    // Optimization: Pre-calculate track names
    const formattedTracks = useMemo(() => {
        return tracks.map(path => ({
            path,
            displayName: path.split('/').pop()?.replace(/\.(mp3|m4a)$/, '') || 'Unknown'
        }));
    }, [tracks]);

    const [delayedUI, setDelayedUI] = useState(false);

    // Reset UI state when losing focus
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedUI(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedUI(false);
            setStartButtonHovered(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            setNextButtonHovered(false);
            scrollYRef.current = 0;
            targetScrollYRef.current = 0;
        }
    }, [isFocused]);

    const { renderedFigure: renderedUI, transitionOpacity: uiOpacityRef } = useFigureTransition(delayedUI ? 'ui' : null, 0);

    const playerFigure = currentSongName ? `player_${currentSongName}` : 'player';
    const targetFigure = (isMenuOpen && isFocused) ? 'menu' : (status !== 'stopped' ? playerFigure : null);

    // Track transition source to prevent eye flashes
    const lastTargetRef = useRef<string | null>(null);
    const transitionSourceRef = useRef<string | null>(null);

    if (targetFigure !== lastTargetRef.current) {
        transitionSourceRef.current = lastTargetRef.current;
        lastTargetRef.current = targetFigure;
    }

    const {
        renderedFigure,
        linearOpacity,
        transitionOpacity
    } = useFigureTransition(targetFigure);

    const [isSeekDragging, setIsSeekDragging] = useState(false);
    const [seekDragValue, setSeekDragValue] = useState(0);

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



    const checkButtonHover = (uv: THREE.Vector2): 'play' | 'back' | 'menu' | 'next' | null => {
        if (!isFocused) return null;

        const px = uv.x * 512;
        const py = (1 - uv.y) * 512;

        const dx = px - 256;
        let dy = py - 256;

        if (invertY) {
            dy = -dy;
        }

        if (showStartButton) {
            const btnX = startButtonPosition ? startButtonPosition.x : RADIO_BUTTON_CONFIG.PLAY.x;
            const btnY = startButtonPosition ? startButtonPosition.y : RADIO_BUTTON_CONFIG.PLAY.y;
            const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distPlay < RADIO_BUTTON_CONFIG.PLAY.radius) return 'play';
        }

        if (showBackButton) {
            const btnX = backButtonPosition ? backButtonPosition.x : RADIO_BUTTON_CONFIG.BACK.x;
            const btnY = backButtonPosition ? backButtonPosition.y : RADIO_BUTTON_CONFIG.BACK.y;
            const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distBack < RADIO_BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const btnX = menuButtonPosition ? menuButtonPosition.x : RADIO_BUTTON_CONFIG.MENU.x;
            const btnY = menuButtonPosition ? menuButtonPosition.y : RADIO_BUTTON_CONFIG.MENU.y;
            const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distMenu < RADIO_BUTTON_CONFIG.MENU.radius) return 'menu';
        }

        if (showNextButton) {
            const btnX = nextButtonPosition ? nextButtonPosition.x : RADIO_BUTTON_CONFIG.NEXT.x;
            const btnY = nextButtonPosition ? nextButtonPosition.y : RADIO_BUTTON_CONFIG.NEXT.y;
            const distNext = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distNext < RADIO_BUTTON_CONFIG.NEXT.radius) return 'next';
        }

        return null;
    };

    const targetPosRef = useRef(new THREE.Vector3());
    const frustumRef = useRef(new THREE.Frustum());
    const projScreenMatrixRef = useRef(new THREE.Matrix4());

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 50) return;
        }

        const dt = delta;

        // Smooth scroll
        if (isMenuOpen) {
            const listHeight = 280;
            const itemHeight = 40;
            const maxScroll = Math.max(0, (tracks.length * itemHeight) - listHeight);
            scrollYRef.current = THREE.MathUtils.lerp(scrollYRef.current, targetScrollYRef.current, dt * 8);
            // Safety clamp
            if (targetScrollYRef.current > maxScroll) targetScrollYRef.current = maxScroll;
        }

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
            const finalX = (gazeX * sensitivity) + gazeOffset.x;
            const finalY = (invertY ? -gazeY : gazeY) * sensitivity + gazeOffset.y;

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

                let eyeOpacity = 1.0;
                const hidesEye = (fig: string | null) => fig === 'menu' || (fig && fig.startsWith('player'));

                if (renderedFigure) {
                    const sourceHides = hidesEye(transitionSourceRef.current);
                    const targetHides = hidesEye(targetFigure);

                    if (sourceHides && targetHides) {
                        eyeOpacity = 0;
                    } else {
                        eyeOpacity = Math.max(0, 1.0 - (transitionOpacity.current || 0));
                    }
                }

                if (eyeOpacity > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = eyeOpacity;
                    const scleraMaxOffsetX = 100;
                    const scleraMaxOffsetY = 100;
                    const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                    const effectiveScleraY = -currentLookAt.current.y * scleraMaxOffsetY;
                    ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);
                    const scaleEye = 0.6;
                    ctx.scale(scaleEye, blink.openness * scaleEye);
                    const irisColor = accent;
                    const customLookRange = 15;
                    const isHologram = true;
                    const scleraColor = activeTheme.scleraColor;
                    drawPixelEye(ctx, normalizedMouse.current, irisColor, customLookRange, scleraColor, isHologram);
                    ctx.restore();
                }

                // Vignette and glow effects
                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                const vignetteColor = activeTheme.vignetteColor;
                gradient.addColorStop(1, vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);

                ctx.save();
                ctx.translate(w / 2, h / 2);
                if (invertY) {
                    ctx.rotate(Math.PI);
                    ctx.scale(-1, 1);
                }

                const uiOpacityVal = uiOpacityRef.current;
                const uiSteppedOpacity = Math.floor(uiOpacityVal * 10) / 10;

                if (uiSteppedOpacity > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = uiSteppedOpacity;

                    if (focusedText) {
                        ctx.save();

                        const titleJitter = Math.sin(state.clock.elapsedTime * 15) > 0.8 ? (Math.random() - 0.5) * 0.2 : 0;
                        // Increased title opacity
                        const titleAlpha = Math.max(0, Math.min(1.0, uiSteppedOpacity * 1.5 + titleJitter));
                        ctx.globalAlpha = titleAlpha;

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
                        ctx.fillStyle = accent;
                        if (Math.random() > 0.1) {
                            ctx.fillText(focusedText, jitterX, textY + jitterY);
                        }
                        ctx.restore();
                    }

                    ctx.globalCompositeOperation = 'screen';

                    const btnJitterBase = Math.sin(state.clock.elapsedTime * 12 + 5) > 0.8 ? (Math.random() - 0.5) * 0.3 : 0;
                    const btnBaseAlpha = Math.max(0, Math.min(1, uiSteppedOpacity + btnJitterBase));
                    ctx.globalAlpha = btnBaseAlpha;

                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : RADIO_BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : RADIO_BUTTON_CONFIG.PLAY.y;
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
                        const morphTarget = status === 'playing' ? 1 : 0;
                        morphProgressRef.current += (morphTarget - morphProgressRef.current) * 0.15;
                        if (Math.abs(morphProgressRef.current - morphTarget) < 0.001) morphProgressRef.current = morphTarget;
                        drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, accent);
                        drawPlayPauseButton(ctx, btnX, btnY, hoverProgress, morphProgressRef.current, accent);
                    }

                    if (showBackButton) {
                        const btnX = backButtonPosition ? backButtonPosition.x : RADIO_BUTTON_CONFIG.BACK.x;
                        const btnY = backButtonPosition ? backButtonPosition.y : RADIO_BUTTON_CONFIG.BACK.y;
                        const isHover = backButtonHovered;
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimBack === 'undefined') screenTextureRef.current.userData.hoverAnimBack = 0;
                            const target = isHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimBack += (target - screenTextureRef.current.userData.hoverAnimBack) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimBack) < 0.001) screenTextureRef.current.userData.hoverAnimBack = 0;
                            hoverProgress = screenTextureRef.current.userData.hoverAnimBack;
                        }
                        drawBackButton(ctx, btnX, btnY, hoverProgress, accent);
                    }

                    if (showMenuButton) {
                        const btnX = menuButtonPosition ? menuButtonPosition.x : RADIO_BUTTON_CONFIG.MENU.x;
                        const btnY = menuButtonPosition ? menuButtonPosition.y : RADIO_BUTTON_CONFIG.MENU.y;
                        const isHover = menuButtonHovered || isMenuOpen;
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimMenu === 'undefined') {
                                screenTextureRef.current.userData.hoverAnimMenu = 0;
                            }
                            const target = isHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimMenu += (target - screenTextureRef.current.userData.hoverAnimMenu) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimMenu) < 0.001) {
                                screenTextureRef.current.userData.hoverAnimMenu = 0;
                            }
                            hoverProgress = screenTextureRef.current.userData.hoverAnimMenu;
                        }
                        drawMenuButton(ctx, btnX, btnY, hoverProgress, accent);
                    }

                    if (showNextButton) {
                        const btnX = nextButtonPosition ? nextButtonPosition.x : 200;
                        const btnY = nextButtonPosition ? nextButtonPosition.y : 190;
                        const isHover = nextButtonHovered;
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimNext === 'undefined') {
                                screenTextureRef.current.userData.hoverAnimNext = 0;
                            }
                            const target = isHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimNext += (target - screenTextureRef.current.userData.hoverAnimNext) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimNext) < 0.001) {
                                screenTextureRef.current.userData.hoverAnimNext = 0;
                            }
                            hoverProgress = screenTextureRef.current.userData.hoverAnimNext;
                        }
                        drawNextButton(ctx, btnX, btnY, hoverProgress, accent);
                    }

                    ctx.restore();
                }

                const figureOpacity = transitionOpacity.current;
                const figureStepped = Math.floor(figureOpacity * 5) / 5;

                const linOpacity = linearOpacity.current;
                const linStepped = Math.floor(linOpacity * 5) / 5;

                // Music Mode Visuals: Progress Bar + Reactive Circle
                if (renderedFigure && renderedFigure.startsWith('player')) {
                    // Reactive circle (always visible if playing)
                    if (audioAnalyser && linStepped > 0.01) {
                        drawReactiveCircle(
                            ctx,
                            0, // Center X
                            30, // Center Y
                            80, // Radius
                            audioAnalyser,
                            state.clock.elapsedTime,
                            accent,
                            linStepped
                        );
                    }

                    // Progress info (only when focused)
                    if (figureStepped > 0.01 && isFocused) {
                        const jitterAmount = (1 - figureStepped) * 20;
                        const jX = (Math.random() - 0.5) * jitterAmount;
                        const jY = (Math.random() - 0.5) * jitterAmount;

                        const barX = -150 + jX;
                        const barY = 190 + jY;
                        const barWidth = 300;
                        const actualProgress = isSeekDragging
                            ? seekDragValue
                            : (typeof currentProgress === 'number' ? currentProgress : currentProgress.current);

                        drawProgressBar(
                            ctx,
                            barX,
                            barY,
                            barWidth,
                            actualProgress,
                            currentSongName,
                            figureStepped,
                            accent
                        );
                    }
                }

                if (renderedFigure === 'menu' && figureStepped > 0.01 && isFocused) {
                    drawTrackList(
                        ctx,
                        formattedTracks,
                        scrollYRef.current,
                        hoveredTrackIndex,
                        currentSongName,
                        figureStepped,
                        accent
                    );
                }

                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }
            screenTextureRef.current.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}
            onWheel={(e) => {
                if (!isFocused || !isMenuOpen) return;
                e.stopPropagation();
                const listHeight = 280;
                const itemHeight = 40;
                const maxScroll = Math.max(0, (tracks.length * itemHeight) - listHeight);
                targetScrollYRef.current = Math.max(0, Math.min(maxScroll, targetScrollYRef.current + e.deltaY * 0.5));
            }}
        >
            {clonedModel && (
                <primitive
                    object={clonedModel}
                    onPointerMove={(e: ThreeEvent<PointerEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();

                            const dx = e.uv.x * 512 - 256;
                            let dy = (1 - e.uv.y) * 512 - 256;
                            if (invertY) dy = -dy;

                            // Handle Seek Drag
                            if (isSeekDragging && onSeek) {
                                const barX = -150;
                                const barWidth = 300;
                                const progress = Math.max(0, Math.min(1, (dx - barX) / barWidth));
                                setSeekDragValue(progress);
                                return;
                            }

                            if (isListDraggingRef.current && isMenuOpen) {
                                const deltaY = dy - dragStartYRef.current;
                                dragTotalDistanceRef.current = Math.max(dragTotalDistanceRef.current, Math.abs(deltaY));
                                const newScroll = dragStartScrollRef.current - deltaY;
                                const listHeight = 280;
                                const itemHeight = 40;
                                const maxScroll = Math.max(0, (tracks.length * itemHeight) - listHeight);
                                targetScrollYRef.current = Math.max(0, Math.min(maxScroll, newScroll));
                                return;
                            }

                            // Buttons Hover
                            const buttonHit = checkButtonHover(e.uv);

                            const barX = -150;
                            const barY = 190;
                            const barWidth = 300;
                            const tolerance = 20;

                            const isBarHover = !isMenuOpen && status !== 'stopped' && (dx >= barX && dx <= barX + barWidth && Math.abs(dy - barY) <= tolerance);

                            // List Hover? (Cursor change)
                            const listX = -220; const listY = -140; const listW = 440; const listH = 280;
                            const isListHover = isMenuOpen && (dx >= listX && dx <= listX + listW && dy >= listY && dy <= listY + listH);

                            if (isListHover) {
                                const relativeY = dy - listY + scrollYRef.current;
                                const index = Math.floor(relativeY / 40);
                                if (index >= 0 && index < tracks.length) {
                                    setHoveredTrackIndex(index);
                                } else {
                                    setHoveredTrackIndex(-1);
                                }
                            } else {
                                setHoveredTrackIndex(-1);
                            }

                            const newPlayHover = buttonHit === 'play';
                            const newBackHover = buttonHit === 'back';
                            const newMenuHover = buttonHit === 'menu';
                            const newNextHover = buttonHit === 'next';

                            if (newPlayHover !== startButtonHovered) setStartButtonHovered(newPlayHover);
                            if (newBackHover !== backButtonHovered) setBackButtonHovered(newBackHover);
                            if (newMenuHover !== menuButtonHovered) setMenuButtonHovered(newMenuHover);
                            if (newNextHover !== nextButtonHovered) setNextButtonHovered(newNextHover);

                            document.body.style.cursor = (newPlayHover || newBackHover || newMenuHover || newNextHover || isBarHover || isListHover) ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            const dx = e.uv.x * 512 - 256;
                            let dy = (1 - e.uv.y) * 512 - 256;
                            if (invertY) dy = -dy;

                            // Seek Bar Click/Drag
                            const barX = -150; const barY = 190; const barWidth = 300; const tolerance = 20;
                            if (!isMenuOpen && status !== 'stopped' && dx >= barX && dx <= barX + barWidth && Math.abs(dy - barY) <= tolerance) {
                                e.stopPropagation();
                                const progress = Math.max(0, Math.min(1, (dx - barX) / barWidth));
                                setIsSeekDragging(true);
                                setSeekDragValue(progress);
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                return;
                            }

                            // List Drag
                            const listX = -220; const listY = -140; const listW = 440; const listH = 280;
                            if (isMenuOpen && dx >= listX && dx <= listX + listW && dy >= listY && dy <= listY + listH) {
                                e.stopPropagation();
                                isListDraggingRef.current = true;
                                dragStartYRef.current = dy;
                                dragStartScrollRef.current = scrollYRef.current;
                                dragTotalDistanceRef.current = 0;
                                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                return;
                            }
                        }
                    }}
                    onPointerUp={(e: ThreeEvent<PointerEvent>) => {
                        if (isSeekDragging && onSeek) {
                            e.stopPropagation();
                            setIsSeekDragging(false);
                            onSeek(seekDragValue);
                            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                        }
                        if (isListDraggingRef.current) {
                            e.stopPropagation();
                            isListDraggingRef.current = false;
                            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        setStartButtonHovered(false);
                        setBackButtonHovered(false);
                        setMenuButtonHovered(false);
                        setNextButtonHovered(false);
                        setHoveredTrackIndex(-1);
                    }}
                    onClick={(e: ThreeEvent<PointerEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            if (isSeekDragging) return;

                            const buttonHit = checkButtonHover(e.uv);
                            if (buttonHit === 'play') {
                                e.stopPropagation();
                                if (onStartClick) {
                                    if (clickTimer.current) {
                                        clearTimeout(clickTimer.current);
                                        clickTimer.current = null;
                                        if (onStopClick) onStopClick();
                                    } else {
                                        clickTimer.current = setTimeout(() => {
                                            clickTimer.current = null;
                                            onStartClick();
                                        }, 250);
                                    }
                                }
                            } else if (buttonHit === 'back' && onBackClick) {
                                e.stopPropagation();
                                onBackClick();
                            } else if (buttonHit === 'menu') {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            } else if (buttonHit === 'next' && onNextClick) {
                                e.stopPropagation();
                                onNextClick();
                            } else if (isMenuOpen) {
                                if (dragTotalDistanceRef.current > 10) return; // Prevent accidental click if user was scrolling

                                // Recalculate List Click for reliable mobile touch
                                const dx = e.uv.x * 512 - 256;
                                let dy = (1 - e.uv.y) * 512 - 256;
                                if (invertY) dy = -dy;

                                const listX = -220; const listY = -140; const listW = 440; const listH = 280;
                                const isListHit = dx >= listX && dx <= listX + listW && dy >= listY && dy <= listY + listH;
                                
                                if (isListHit) {
                                    const relativeY = dy - listY + scrollYRef.current;
                                    const index = Math.floor(relativeY / 40);
                                    if (index >= 0 && index < tracks.length) {
                                        if (onSelectTrack) {
                                            e.stopPropagation();
                                            onSelectTrack(tracks[index]);
                                            setIsMenuOpen(false);
                                        }
                                    }
                                }
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}
