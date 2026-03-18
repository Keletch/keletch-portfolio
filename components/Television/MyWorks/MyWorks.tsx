import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useBlink } from '@/hooks/useBlink';
import { useScreenInteraction } from '@/hooks/useScreenInteraction';
import { updateButtonHoverAnimation } from '@/components/Television/SharedHelpers';

import { THEMES, ThemeColors } from '@/components/Television/Types';
import { MyWorksProps, MYWORKS_BUTTON_CONFIG } from './MyWorksTypes';
import { drawPixelEye } from '@/components/Television/Helpers';
import {
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton,
    drawButtonShockwave,
    drawProjectInfo,
    checkButtonHover,
    wrapText
} from './MyWorksHelpers';
import { drawChaoticIcosahedronVideo, initIcoDeepState, updateIcoDeepState, IcoDeepState } from './MyWorksIcosahedron';
import { PROJECTS, DEFAULT_SCREEN_NAMES, ZOOM_DURATION, STATIC_DURATION } from './MyWorksData';

export default function MyWorks({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'toxic',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText,
    isFocused = false,
    textYOffset = 60,
    showStartButton = false,
    startButtonPosition,
    showBackButton = false,
    onBackClick,
    backButtonPosition,
    showMenuButton = false,
    menuButtonPosition,
    onMenuClick,
    showPrevButton = false,
    prevButtonPosition,
    showEyeButton = false,
    eyeButtonPosition,
    disableStartPulse = false
}: MyWorksProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [startButtonHovered, setStartButtonHovered] = useState(false);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);
    const [prevButtonHovered, setPrevButtonHovered] = useState(false);
    const [eyeButtonHovered, setEyeButtonHovered] = useState(false);

    // Project Navigation State
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const currentProject = PROJECTS[currentProjectIndex];

    const wrappedLines = useMemo(() => {
        if (typeof document === 'undefined') return { lines: [], fullText: '' };
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return { lines: [], fullText: '' };
        ctx.font = 'bold 15px "Courier New", monospace';
        const maxWidth = 380;
        const rawLines = [
            currentProject.title,
            currentProject.stack,
            '',
            currentProject.desc
        ];
        const result: string[] = [];
        for (const line of rawLines) {
            if (!line) result.push('');
            else result.push(...wrapText(ctx, line, maxWidth));
        }
        return {
            lines: result,
            fullText: result.join('\n')
        };
    }, [currentProject]);

    const [galleryState, setGalleryState] = useState<'idle' | 'zooming' | 'static' | 'gallery' | 'exiting'>('idle');
    const [isProjectTransition, setIsProjectTransition] = useState(false);

    const galleryVideosRef = useRef<HTMLVideoElement[]>([]);
    const galleryEnterTime = useRef(0);
    const icoDeepStateRef = useRef<IcoDeepState>(initIcoDeepState());

    const {
        waitingForInput,
        typingStartTime,
        startStory: startTyping,
        handleInteraction: handleOSDClick,
        signalTypingFinished,
        playTypewriterSound
    } = useTypewriter({
        storyContent: ['dummy'],
        enableStoryMode: true
    });

    const lastTypedCharCount = useRef(0);
    const hasStartedTyping = useRef(false);

    // Typing effect initialization
    useEffect(() => {
        if (galleryState === 'gallery') {
            galleryEnterTime.current = performance.now() / 1000;
            lastTypedCharCount.current = 0;
            if (!hasStartedTyping.current) {
                startTyping();
                hasStartedTyping.current = true;
            }
        } else {
            hasStartedTyping.current = false;
        }
    }, [galleryState, currentProjectIndex, startTyping]);


    const exitStartTime = useRef(0);
    const prevLookAtRef = useRef({ x: 0, y: 0 });
    const mouseVelRef = useRef({ x: 0, y: 0 });
    const mouseIcoRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (galleryState === 'exiting') {
            exitStartTime.current = performance.now() / 1000;
        }
    }, [galleryState]);



    // Video Loading Effect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentSrc = PROJECTS[currentProjectIndex].videoSrc;
            const NUM_VIDEOS = 1;

            // Initialize video array if empty
            if (galleryVideosRef.current.length === 0) {
                for (let i = 0; i < NUM_VIDEOS; i++) {
                    const vid = document.createElement('video');
                    vid.loop = true;
                    vid.muted = true;
                    vid.playsInline = true;
                    vid.crossOrigin = 'anonymous';
                    galleryVideosRef.current.push(vid);
                }
            }

            // Update video source
            const vid = galleryVideosRef.current[0];
            if (vid && vid.getAttribute('src') !== currentSrc) {
                vid.src = currentSrc;
                const playPromise = vid.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => { });
                }
            }
        }
    }, [currentProjectIndex]);

    // Navigation logic with flicker transitions
    const handleNextProject = () => {
        setIsProjectTransition(true);
        setGalleryState('static');
        setTimeout(() => {
            setCurrentProjectIndex(prev => (prev + 1) % PROJECTS.length);
        }, 100);
        setTimeout(() => {
            setGalleryState('gallery');
            setIsProjectTransition(false);
        }, STATIC_DURATION);
    };

    const handlePrevProject = () => {
        setIsProjectTransition(true);
        setGalleryState('static');
        setTimeout(() => {
            setCurrentProjectIndex(prev => (prev - 1 + PROJECTS.length) % PROJECTS.length);
        }, 100);
        setTimeout(() => {
            setGalleryState('gallery');
            setIsProjectTransition(false);
        }, STATIC_DURATION);
    };


    // Screen state transitions (idle -> zoom -> static -> gallery)
    useEffect(() => {
        let zoomTimer: NodeJS.Timeout;
        let staticTimer: NodeJS.Timeout;

        if (isFocused) {
            setGalleryState('zooming');
            const startStaticDelay = Math.max(0, ZOOM_DURATION - STATIC_DURATION);
            zoomTimer = setTimeout(() => {
                setGalleryState('static');
                staticTimer = setTimeout(() => {
                    setGalleryState('gallery');
                }, STATIC_DURATION);
            }, startStaticDelay);
        } else {
            if (galleryState === 'gallery' || galleryState === 'static') {
                setGalleryState('exiting');
                zoomTimer = setTimeout(() => setGalleryState('idle'), 1000);
            } else {
                setGalleryState('idle');
            }
        }

        return () => {
            clearTimeout(zoomTimer);
            clearTimeout(staticTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused]);

    const [delayedUI, setDelayedUI] = useState(false);

    // Reset hover states
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedUI(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedUI(false);
            setStartButtonHovered(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            setPrevButtonHovered(false);
            setEyeButtonHovered(false);
        }
    }, [isFocused]);

    const { renderedFigure: renderedUI, transitionOpacity: uiOpacityRef } = useFigureTransition(delayedUI ? 'ui' : null, 0);


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

    // --- UI State & Physics ---
    const {
        normalizedMouse,
        currentLookAt,
        updateScreenGaze
    } = useScreenInteraction({
        groupRef,
        screenNames,
        gazeOffset,
        invertY
    });

    const {
        blinkState,
        updateBlink
    } = useBlink();

    // --- TRANSITIONS ---

    // OSD Transition Opacity (with flicker effect)
    const {
        transitionOpacity: osdOpacityRef
    } = useFigureTransition(galleryState === 'gallery' ? 'osd' : null, 0);

    // Video Transition Opacity (same smooth flicker as OSD)
    const {
        transitionOpacity: videoOpacityRef
    } = useFigureTransition(galleryState === 'gallery' ? 'video' : null, 0);

    const eyeTarget = (galleryState === 'idle' || galleryState === 'zooming') ? 'eye' : null;
    useFigureTransition(eyeTarget, 0);


    const activeTheme = THEMES[theme as keyof typeof THEMES] || THEMES.classic;
    const buttonColor = activeTheme.highlightColor || '#ffffff';



    const eyeMorphProgress = useRef(0);
    const frustumRef = useRef(new THREE.Frustum());
    const projScreenMatrixRef = useRef(new THREE.Matrix4());

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 50) return;
        }


        if (screenTextureRef.current && groupRef.current) {
            if (screenMeshRef.current) {
                const frustum = frustumRef.current;
                const projScreenMatrix = projScreenMatrixRef.current;
                projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
                frustum.setFromProjectionMatrix(projScreenMatrix);

                if (!frustum.intersectsObject(screenMeshRef.current)) {
                    return; // Frustum Culling: skip rendering 2D canvas if TV is off-screen
                }
            }

            if (galleryState !== 'idle') {
                const canvas = screenTextureRef.current.image as HTMLCanvasElement;
                if (canvas) {
                    const w = canvas.width;
                    const h = canvas.height;

                    const curX = currentLookAt.current.x * (w / 2);
                    const curY = (invertY ? currentLookAt.current.y : -currentLookAt.current.y) * (h / 2) + 20;

                    const dx = curX - prevLookAtRef.current.x;
                    const dy = curY - prevLookAtRef.current.y;

                    const safeDelta = Math.max(0.0001, delta);
                    mouseVelRef.current.x = mouseVelRef.current.x * 0.5 + (dx / safeDelta) * 0.5;
                    mouseVelRef.current.y = mouseVelRef.current.y * 0.5 + (dy / safeDelta) * 0.5;

                    mouseVelRef.current.x = Number.isFinite(mouseVelRef.current.x) ? mouseVelRef.current.x : 0;
                    mouseVelRef.current.y = Number.isFinite(mouseVelRef.current.y) ? mouseVelRef.current.y : 0;

                    prevLookAtRef.current.x = curX;
                    prevLookAtRef.current.y = curY;

                    updateIcoDeepState(icoDeepStateRef.current, delta, { x: curX, y: curY }, mouseVelRef.current);
                }
            }

            updateScreenGaze(state, delta);
            updateBlink(delta, state.clock.elapsedTime);

            let targetMorph = (galleryState === 'gallery' || galleryState === 'static') ? 1.0 : 0.0;
            if (galleryState === 'exiting') {
                const currentTime = performance.now() / 1000;
                if (currentTime - exitStartTime.current < 0.5) targetMorph = 1.0;
            }
            const morphSpeed = 2.0 * delta;
            eyeMorphProgress.current += (targetMorph - eyeMorphProgress.current) * morphSpeed;
            if (Math.abs(eyeMorphProgress.current - targetMorph) < 0.001) eyeMorphProgress.current = targetMorph;


            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            const morph = eyeMorphProgress.current;

            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;

                // --- RENDERING PIPELINE START ---

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

                // Additional darkening for Gallery mode
                if (galleryState === 'gallery' || galleryState === 'exiting') {
                }

                // 2. RENDER EYE
                if (morph < 0.99 || galleryState === 'gallery' || galleryState === 'static' || galleryState === 'exiting') {
                    ctx.save();

                    const isLCD = theme === 'toxic';
                    const scleraMaxOffsetX = isLCD ? 150 : 100;
                    const scleraMaxOffsetY = 100;

                    const eyeHoverProgress = updateButtonHoverAnimation(
                        screenTextureRef.current,
                        'hoverAnimEye',
                        eyeButtonHovered
                    );

                    const startX = currentLookAt.current.x * scleraMaxOffsetX;
                    const startY = -currentLookAt.current.y * scleraMaxOffsetY;

                    const targetX = eyeButtonPosition ? eyeButtonPosition.x : MYWORKS_BUTTON_CONFIG.EYE.x;
                    let targetY = eyeButtonPosition ? eyeButtonPosition.y : MYWORKS_BUTTON_CONFIG.EYE.y;
                    if (invertY) targetY = -targetY;

                    let jitterX = 0;
                    let jitterY = 0;
                    if (morph > 0.8 && eyeHoverProgress > 0.8) {
                        jitterX = (Math.random() - 0.5) * 3 * eyeHoverProgress;
                        jitterY = (Math.random() - 0.5) * 3 * eyeHoverProgress;
                    }

                    const currentX = startX * (1 - morph) + (targetX + jitterX) * morph;
                    const currentY = startY * (1 - morph) + (targetY + jitterY) * morph;

                    ctx.translate(w / 2 + currentX, h / 2 + currentY);

                    let geoCorrectionX = 1.0;
                    if (screenAspect.current > 1.2) {
                        geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    }

                    const startScale = 1.0;
                    const baseTargetScale = 0.25;
                    const hoverScaleBoost = 1.0 + (eyeHoverProgress * 0.15);
                    const targetScale = baseTargetScale * hoverScaleBoost;
                    const currentBaseScale = startScale * (1 - morph) + targetScale * morph;

                    const blinkScaleY = blinkState.current.openness;
                    ctx.scale(geoCorrectionX * currentBaseScale, currentBaseScale * blinkScaleY);

                    const irisColor = activeTheme.irisColor;

                    let pupilPos = normalizedMouse.current;
                    if (morph > 0.8) {
                        try {
                            const mx = normalizedMouse.current.x * (w / 2);
                            const my = -normalizedMouse.current.y * (h / 2);
                            const ex = currentX;
                            const ey = currentY;
                            const dx = mx - ex;
                            const dy = my - ey;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const maxLookDistance = 200;
                            const lookAmount = Math.min(1.0, dist / maxLookDistance);

                            if (dist > 1e-6) {
                                pupilPos = {
                                    x: (dx / dist) * lookAmount,
                                    y: -(dy / dist) * lookAmount
                                };
                            } else {
                                pupilPos = { x: 0, y: 0 };
                            }
                        } catch {
                            pupilPos = normalizedMouse.current;
                        }
                    }

                    drawPixelEye(ctx, pupilPos, irisColor, 32, activeTheme.scleraColor, !!(activeTheme as ThemeColors).isHologram);

                    if (morph > 0.8) {
                        const time = state.clock.elapsedTime;
                        const fps = 8;
                        const steppedTime = Math.floor(time * fps) / fps;
                        const waveProgress = (steppedTime % 2.0) / 2.0;

                        const baseRx = 90;
                        const baseRy = 70;
                        const expansion = waveProgress * 40;

                        const hoverFade = 1.0 - eyeHoverProgress;
                        const waveAlpha = Math.max(0, 1.0 - waveProgress) * hoverFade;

                        if (waveAlpha > 0.01) {
                            ctx.save();
                            ctx.globalAlpha = waveAlpha;
                            ctx.beginPath();
                            ctx.ellipse(0, 0, baseRx + expansion, baseRy + (expansion * 0.8), 0, 0, Math.PI * 2);
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 3;
                            ctx.stroke();
                            ctx.restore();
                        }
                    }

                    ctx.restore();
                }

                // 3. VIDEO + PROJECT INFO
                const shouldShowContent = galleryState === 'gallery' || (galleryState === 'static' && isProjectTransition) || galleryState === 'exiting';
                if (shouldShowContent) {

                    const hasVideos = galleryVideosRef.current.length > 0;
                    if (hasVideos) {
                        try {
                            ctx.save();
                            ctx.translate(w / 2, h / 2);

                            if (invertY) {
                                ctx.rotate(Math.PI);
                                ctx.scale(-1, 1);
                            }

                            // 3D Chaotic Video Icosahedron
                            const videoOpacity = videoOpacityRef.current;

                            mouseIcoRef.current.x = currentLookAt.current.x * (w / 2);
                            mouseIcoRef.current.y = (invertY ? currentLookAt.current.y : -currentLookAt.current.y) * (h / 2) + 20;

                            ctx.translate(0, -20);

                            drawChaoticIcosahedronVideo(ctx, galleryVideosRef.current, videoOpacity, icoDeepStateRef.current);

                            ctx.restore();
                        } catch {
                        }
                    }

                    // OSD: Project info text box
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    const osdOpacity = osdOpacityRef.current;
                    const typingState = drawProjectInfo(
                        ctx,
                        w,
                        h,
                        wrappedLines.lines,
                        wrappedLines.fullText,
                        typingStartTime,
                        waitingForInput,
                        osdOpacity,
                        activeTheme.textColor || '#ffffff',
                        activeTheme.highlightColor || '#ffffff'
                    );

                    // Sound for typewriter
                    if (typingState && typingState.charsShown > lastTypedCharCount.current) {
                        if (osdOpacity > 0.1) {
                            playTypewriterSound();
                        }
                        lastTypedCharCount.current = typingState.charsShown;
                    }

                    // Signal typing finished
                    if (typingState && typingState.isComplete && !waitingForInput) {
                        signalTypingFinished();
                    }

                    ctx.restore();
                }

                // UI Overlay (Title & Buttons)
                const uiOpacityVal = uiOpacityRef.current;
                const uiSteppedOpacity = Math.floor(uiOpacityVal * 10) / 10;

                if (uiSteppedOpacity > 0.01 && (galleryState === 'gallery' || galleryState === 'static' || galleryState === 'exiting')) {
                    ctx.save();
                    ctx.globalAlpha = uiSteppedOpacity;

                    // 3. TITLE
                    if (focusedText) {
                        ctx.save();
                        ctx.translate(w / 2, h / 2);
                        if (invertY) {
                            ctx.rotate(Math.PI);
                            ctx.scale(-1, 1);
                        }

                        // Async flicker jitter for title
                        const time = state.clock.elapsedTime;
                        const titleJitter = Math.sin(time * 15) > 0.8 ? (Math.random() - 0.5) * 0.2 : 0;
                        // Increased opacity for titles
                        const titleAlpha = Math.max(0, Math.min(1.0, uiSteppedOpacity * 1.5 + titleJitter));
                        ctx.globalAlpha = titleAlpha;

                        const locJitterX = (Math.random() - 0.5) * 4;
                        const locJitterY = (Math.random() - 0.5) * 4;
                        ctx.font = '900 50px "Courier New", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        const textY = -h / 2 + textYOffset;

                        const shadow1 = activeTheme.textShadow1 || 'rgba(255, 0, 0, 0.5)';
                        const shadow2 = activeTheme.textShadow2 || 'rgba(0, 255, 255, 0.5)';

                        ctx.fillStyle = (activeTheme.textShadow1) ? shadow1 + '80' : shadow1;
                        ctx.fillText(focusedText, locJitterX + 4, textY + locJitterY);

                        ctx.fillStyle = (activeTheme.textShadow2) ? shadow2 + '80' : shadow2;
                        ctx.fillText(focusedText, locJitterX - 4, textY + locJitterY);

                        ctx.fillStyle = buttonColor;
                        if (Math.random() > 0.1) {
                            ctx.fillText(focusedText, locJitterX, textY + locJitterY);
                        }

                        ctx.restore();
                    }

                    // 4. BUTTONS
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    // Async flicker jitter base for buttons
                    const btnJitterBase = Math.sin(state.clock.elapsedTime * 12 + 5) > 0.8 ? (Math.random() - 0.5) * 0.3 : 0;
                    const btnBaseAlpha = Math.max(0, Math.min(1, uiSteppedOpacity + btnJitterBase));
                    ctx.globalAlpha = btnBaseAlpha;

                    // Use shared helper for hover animations
                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : MYWORKS_BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : MYWORKS_BUTTON_CONFIG.PLAY.y;

                        const hoverProgress = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnim', startButtonHovered
                        );

                        if (!disableStartPulse) {
                            drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, buttonColor);
                        }
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, 0, buttonColor);
                    }

                    if (showPrevButton) {
                        const btnPrevX = prevButtonPosition ? prevButtonPosition.x : MYWORKS_BUTTON_CONFIG.PREV.x;
                        const btnPrevY = prevButtonPosition ? prevButtonPosition.y : MYWORKS_BUTTON_CONFIG.PREV.y;

                        const hoverProgressPrev = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimPrev', prevButtonHovered
                        );

                        drawPlayStopButton(ctx, btnPrevX, btnPrevY, hoverProgressPrev, 0, buttonColor, Math.PI);
                    }

                    if (showBackButton) {
                        const btnBackX = backButtonPosition ? backButtonPosition.x : MYWORKS_BUTTON_CONFIG.BACK.x;
                        const btnBackY = backButtonPosition ? backButtonPosition.y : MYWORKS_BUTTON_CONFIG.BACK.y;

                        const hoverProgressBack = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimBack', backButtonHovered
                        );

                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack, buttonColor);
                    }

                    if (showMenuButton) {
                        const btnMenuX = menuButtonPosition ? menuButtonPosition.x : MYWORKS_BUTTON_CONFIG.MENU.x;
                        const btnMenuY = menuButtonPosition ? menuButtonPosition.y : MYWORKS_BUTTON_CONFIG.MENU.y;

                        const hoverProgressMenu = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimMenu', menuButtonHovered
                        );

                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu, buttonColor);
                    }

                    // Eye button is part of the morphing eye

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                    ctx.restore(); // End UI overlay
                }

                // --- RENDERING PIPELINE END ---
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
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            const buttonHit = checkButtonHover(
                                e.uv,
                                isFocused,
                                invertY,
                                galleryState,
                                currentProjectIndex,
                                showStartButton,
                                showBackButton,
                                showMenuButton,
                                showPrevButton,
                                showEyeButton,
                                startButtonPosition,
                                backButtonPosition,
                                menuButtonPosition,
                                prevButtonPosition,
                                eyeButtonPosition
                            );

                            const newPlayHover = buttonHit === 'play';
                            const newBackHover = buttonHit === 'back';
                            const newMenuHover = buttonHit === 'menu';
                            const newPrevHover = buttonHit === 'prev';
                            const newEyeHover = buttonHit === 'eye';
                            const newTextHover = buttonHit === 'text_box';

                            if (newPlayHover !== startButtonHovered) setStartButtonHovered(newPlayHover);
                            if (newBackHover !== backButtonHovered) setBackButtonHovered(newBackHover);
                            if (newMenuHover !== menuButtonHovered) setMenuButtonHovered(newMenuHover);
                            if (newPrevHover !== prevButtonHovered) setPrevButtonHovered(newPrevHover);
                            if (newEyeHover !== eyeButtonHovered) setEyeButtonHovered(newEyeHover);

                            document.body.style.cursor = (newPlayHover || newBackHover || newMenuHover || newPrevHover || newEyeHover || newTextHover) ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (startButtonHovered) setStartButtonHovered(false);
                        if (backButtonHovered) setBackButtonHovered(false);
                        if (menuButtonHovered) setMenuButtonHovered(false);
                        if (prevButtonHovered) setPrevButtonHovered(false);
                        if (eyeButtonHovered) setEyeButtonHovered(false);
                    }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            // Ensure click hits the button
                            const buttonHit = checkButtonHover(
                                e.uv,
                                isFocused,
                                invertY,
                                galleryState,
                                currentProjectIndex,
                                showStartButton,
                                showBackButton,
                                showMenuButton,
                                showPrevButton,
                                showEyeButton,
                                startButtonPosition,
                                backButtonPosition,
                                menuButtonPosition,
                                prevButtonPosition,
                                eyeButtonPosition
                            );
                            if (buttonHit === 'play') {
                                e.stopPropagation();
                                handleNextProject(); // INTERNAL NAV
                            } else if (buttonHit === 'back' && onBackClick) {
                                e.stopPropagation();
                                // Trigger Exit Transition immediately
                                onBackClick();
                            } else if (buttonHit === 'menu' && onMenuClick) {
                                e.stopPropagation();
                                onMenuClick();
                            } else if (buttonHit === 'prev') {
                                e.stopPropagation();
                                handlePrevProject(); // INTERNAL NAV
                            } else if (buttonHit === 'eye') {
                                e.stopPropagation();
                                window.open(PROJECTS[currentProjectIndex].link, '_blank');
                            } else if (buttonHit === 'text_box') {
                                e.stopPropagation();
                                handleOSDClick(); // Skip typing or advance like AboutMe
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}

