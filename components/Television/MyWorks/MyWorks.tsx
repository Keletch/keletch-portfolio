import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useBlink } from '@/hooks/useBlink';
import { useScreenInteraction } from '@/hooks/useScreenInteraction';
import { updateButtonHoverAnimation } from '@/components/Television/SharedHelpers';

import { THEMES } from '@/components/Television/Types';
import { MyWorksProps, MYWORKS_BUTTON_CONFIG } from './MyWorksTypes';
import { drawPixelEye } from '@/components/Television/Helpers';
import {
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton,
    drawButtonShockwave,
    drawEyeButton,
    drawProjectInfo,
    checkButtonHover
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
    theme = 'toxic', // Default toxic (green) for MyWorks
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
    showPrevButton = false,
    prevButtonPosition,
    onPrevClick,
    showEyeButton = false,
    eyeButtonPosition,
    onEyeClick,
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

    const [galleryState, setGalleryState] = useState<'idle' | 'zooming' | 'static' | 'gallery' | 'exiting'>('idle');
    const [isProjectTransition, setIsProjectTransition] = useState(false);

    const galleryVideosRef = useRef<HTMLVideoElement[]>([]);
    const galleryEnterTime = useRef(0);
    const icoDeepStateRef = useRef<IcoDeepState>(initIcoDeepState());

    // Typewriter system (like AboutMe)
    const {
        storyMode: typingMode,
        waitingForInput,
        typingStartTime,
        startStory: startTyping,
        handleInteraction: handleOSDClick,
        signalTypingFinished,
        typingAudioRef
    } = useTypewriter({
        storyContent: ['dummy'], // We'll manage text manually but use the hook's logic
        enableStoryMode: true
    });

    const lastTypedCharCount = useRef(0);
    const hasStartedTyping = useRef(false);

    // Initialize gallery and start typing when entering gallery
    useEffect(() => {
        if (galleryState === 'gallery') {
            galleryEnterTime.current = performance.now() / 1000;
            lastTypedCharCount.current = 0;

            // Only start typing once per project
            if (!hasStartedTyping.current) {
                startTyping();
                hasStartedTyping.current = true;
            }
        } else {
            // Reset when leaving gallery
            hasStartedTyping.current = false;
        }
    }, [galleryState, currentProjectIndex]);


    const exitStartTime = useRef(0);
    const prevLookAtRef = useRef({ x: 0, y: 0 });
    const mouseVelRef = useRef({ x: 0, y: 0 });

    // Track exit time to sequence animation (User requested: "wait for flicker... then grow eye")
    useEffect(() => {
        if (galleryState === 'exiting') {
            exitStartTime.current = performance.now() / 1000;
        }
    }, [galleryState]);
    // eslint-disable-next-line react-hooks/exhaustive-deps


    // Video Loading Effect (Optimized Staggered multi-video initialization)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentSrc = PROJECTS[currentProjectIndex].videoSrc;
            const NUM_VIDEOS = 6; // Reduced from 10 for performance

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

            // Staggered "Slice Loading" to prevent main-thread freeze
            galleryVideosRef.current.forEach((vid, i) => {
                // Use a short delay per video to let the UI breathe
                setTimeout(() => {
                    if (vid.getAttribute('src') !== currentSrc) {
                        vid.src = currentSrc;
                        vid.load();

                        vid.onloadedmetadata = () => {
                            const duration = vid.duration;
                            if (duration > 0) {
                                vid.currentTime = (duration / NUM_VIDEOS) * i;
                            }
                            vid.play().catch(() => { });
                        };
                    } else {
                        if (vid.paused) vid.play().catch(() => { });
                    }
                }, i * 50); // 50ms stagger per video
            });
        }
    }, [currentProjectIndex]);

    // Navigation Handlers
    const handleNextProject = () => {
        setIsProjectTransition(true);
        setGalleryState('static');
        setTimeout(() => {
            setCurrentProjectIndex(prev => (prev + 1) % PROJECTS.length);
            setGalleryState('gallery');
            setIsProjectTransition(false);
        }, STATIC_DURATION);
    };

    const handlePrevProject = () => {
        setIsProjectTransition(true);
        setGalleryState('static');
        setTimeout(() => {
            setCurrentProjectIndex(prev => (prev - 1 + PROJECTS.length) % PROJECTS.length);
            setGalleryState('gallery');
            setIsProjectTransition(false);
        }, STATIC_DURATION);
    };


    // Transition Logic
    useEffect(() => {
        let zoomTimer: NodeJS.Timeout;
        let staticTimer: NodeJS.Timeout;

        if (isFocused) {
            // Start sequence
            setGalleryState('zooming');
            const startStaticDelay = Math.max(0, ZOOM_DURATION - STATIC_DURATION);

            zoomTimer = setTimeout(() => {
                setGalleryState('static');

                staticTimer = setTimeout(() => {
                    setGalleryState('gallery');
                }, STATIC_DURATION);

            }, startStaticDelay);

        } else {
            // Reset immediately on blur
            setGalleryState('idle');
        }

        return () => {
            clearTimeout(zoomTimer);
            clearTimeout(staticTimer);
        };
    }, [isFocused]);

    // Reset hover states
    useEffect(() => {
        if (!isFocused) {
            setStartButtonHovered(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            setPrevButtonHovered(false);
            setEyeButtonHovered(false);
            document.body.style.cursor = 'auto';
        }
    }, [isFocused]);

    const {
        renderedFigure,
        transitionOpacity: transitionOpacityRef
    } = useFigureTransition(null);

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

    // --- SHARED HOOKS ---
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

    // --- FIGURE TRANSITIONS ---

    // OSD Transition Opacity (with flicker effect)
    const {
        transitionOpacity: osdOpacityRef
    } = useFigureTransition(galleryState === 'gallery' ? 'osd' : null, 0);

    // Video Transition Opacity (same smooth flicker as OSD)
    const {
        transitionOpacity: videoOpacityRef
    } = useFigureTransition(galleryState === 'gallery' ? 'video' : null, 0);

    // Eye Transition Opacity (visible in idle/zooming, fades out in static/gallery/exiting)
    const eyeTarget = (galleryState === 'idle' || galleryState === 'zooming') ? 'eye' : null;
    const {
        transitionOpacity: eyeOpacityRef
    } = useFigureTransition(eyeTarget, 0); // timeOffset 0 to match About Me


    const activeTheme = THEMES[theme] || THEMES.classic;

    const renderAccumulator = useRef(0);
    const FPS_LIMIT = 24;
    const FRAME_DURATION = 1 / FPS_LIMIT;

    const eyeMorphProgress = useRef(0);

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 15) return;
        }

        // 1. Physics update (Native Refresh Rate)
        updateIcoDeepState(icoDeepStateRef.current, delta);

        // 2. OSD Logic Gate (24fps)
        renderAccumulator.current += delta;
        const shouldUpdateLogic = renderAccumulator.current >= FRAME_DURATION;
        const dt = shouldUpdateLogic ? renderAccumulator.current : 0;
        if (shouldUpdateLogic) {
            renderAccumulator.current %= FRAME_DURATION;
        }

        if (screenTextureRef.current && groupRef.current) {
            // --- Update Loop (Native 60fps for Icosahedron Physics) ---
            if (galleryState !== 'idle') {
                const canvas = screenTextureRef.current.image as HTMLCanvasElement;
                if (canvas) {
                    const w = canvas.width;
                    const h = canvas.height;

                    // Calculate mouse velocity for physics
                    const curX = currentLookAt.current.x * (w / 2);
                    const curY = (invertY ? currentLookAt.current.y : -currentLookAt.current.y) * (h / 2) + 20;

                    const dx = curX - prevLookAtRef.current.x;
                    const dy = curY - prevLookAtRef.current.y;

                    // Smooth the velocity a bit
                    mouseVelRef.current.x = mouseVelRef.current.x * 0.5 + (dx / delta) * 0.5;
                    mouseVelRef.current.y = mouseVelRef.current.y * 0.5 + (dy / delta) * 0.5;

                    prevLookAtRef.current.x = curX;
                    prevLookAtRef.current.y = curY;

                    const mouseIco = { x: curX, y: curY };
                    updateIcoDeepState(icoDeepStateRef.current, delta, mouseIco, mouseVelRef.current);
                }
            }
            // Update 24fps logic ONLY when gate is open
            if (shouldUpdateLogic) {
                updateScreenGaze(state, dt);
                updateBlink(dt, state.clock.elapsedTime);

                // Update Morphing (Smooth lerp)
                let targetMorph = (galleryState === 'gallery' || galleryState === 'static') ? 1.0 : 0.0;
                if (galleryState === 'exiting') {
                    const currentTime = performance.now() / 1000;
                    if (currentTime - exitStartTime.current < 0.5) targetMorph = 1.0;
                }
                const morphSpeed = 2.0 * dt;
                eyeMorphProgress.current += (targetMorph - eyeMorphProgress.current) * morphSpeed;
                if (Math.abs(eyeMorphProgress.current - targetMorph) < 0.001) eyeMorphProgress.current = targetMorph;
            }

            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            const morph = eyeMorphProgress.current;


            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;
                const time = state.clock.elapsedTime;

                // --- RENDERING PIPELINE START ---

                // 1. BACKGROUND
                // Use Standard Theme Background for ALL states to ensure consistent color
                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);

                const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                backlight.addColorStop(0, activeTheme.glowCenter);
                backlight.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = backlight;
                ctx.fillRect(0, 0, w, h);

                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);

                // Additional darkening for Gallery mode if needed, but keeping base vibrant for now
                if (galleryState === 'gallery' || galleryState === 'exiting') {
                    // Optional: slight dimming if text contrast is an issue, but user asked for SAME color
                    // ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    // ctx.fillRect(0,0,w,h);
                }


                // 2. RENDER EYE (MORPHING)
                // The eye is ALWAYS visible now, it just morphs between states.
                // State 0 (Big): Center + Mouse Gaze, Scale ~1.0
                // State 1 (Button): Fixed at `MYWORKS_BUTTON_CONFIG.EYE`, Scale ~0.3

                // Opacity: Always 1.0 unless we want effects. Let's keep it solid.
                // Or maybe slight flicker if we kept the old logic? User said "wuelva a crecer", implies continuous presence.
                // We'll remove opacity fading logic for the eye entirely.

                if (morph < 0.99 || galleryState === 'gallery' || galleryState === 'static' || galleryState === 'exiting') {
                    ctx.save();

                    // --- Interpolate Position ---
                    // Big Eye: Center (0,0 relative to translation) + Offset based on lookAt
                    // Button Eye: Fixed position (MYWORKS_BUTTON_CONFIG.EYE)

                    const isLCD = theme === 'toxic';
                    const scleraMaxOffsetX = isLCD ? 150 : 100;
                    const scleraMaxOffsetY = 100;

                    // Hover Animation Logic (User requested: "agrandan y tiemblan al hacer hover")
                    // We calculate this regardless of morph state, but apply it fully only when morphed.
                    const eyeHoverProgress = updateButtonHoverAnimation(
                        screenTextureRef.current,
                        'hoverAnimEye',
                        eyeButtonHovered
                    );

                    // Big Eye Position Components
                    const startX = currentLookAt.current.x * scleraMaxOffsetX;
                    const startY = -currentLookAt.current.y * scleraMaxOffsetY;

                    // Button Eye Position Components (Target)
                    const targetX = eyeButtonPosition ? eyeButtonPosition.x : MYWORKS_BUTTON_CONFIG.EYE.x;
                    let targetY = eyeButtonPosition ? eyeButtonPosition.y : MYWORKS_BUTTON_CONFIG.EYE.y;

                    if (invertY) {
                        targetY = -targetY;
                    }

                    // --- Jitter Effect (Shake) on Hover ---
                    // Only apply when fully morphed to button (or mostly morphed)
                    let jitterX = 0;
                    let jitterY = 0;
                    if (morph > 0.8 && eyeHoverProgress > 0.8) {
                        jitterX = (Math.random() - 0.5) * 3 * eyeHoverProgress;
                        jitterY = (Math.random() - 0.5) * 3 * eyeHoverProgress;
                    }

                    // Interpolate Position
                    const currentX = startX * (1 - morph) + (targetX + jitterX) * morph;
                    const currentY = startY * (1 - morph) + (targetY + jitterY) * morph;

                    ctx.translate(w / 2 + currentX, h / 2 + currentY);

                    // --- Interpolate Scale ---
                    // Big Eye Scale: 1.0
                    // Button Eye Scale: ~0.25
                    // Hover Effect: Grow by 10-15% when hovered (in button mode)

                    let geoCorrectionX = 1.0;
                    if (screenAspect.current > 1.2) {
                        geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    }

                    const startScale = 1.0;
                    // Apply hover growth to target scale
                    const baseTargetScale = 0.25;
                    const hoverScaleBoost = 1.0 + (eyeHoverProgress * 0.15); // Grow 15%
                    const targetScale = baseTargetScale * hoverScaleBoost;

                    // Lerp base scale
                    const currentBaseScale = startScale * (1 - morph) + targetScale * morph;

                    // Apply blinking
                    const blinkScaleY = blinkState.current.openness;

                    ctx.scale(geoCorrectionX * currentBaseScale, currentBaseScale * blinkScaleY);

                    // --- Render ---
                    let irisColor = '#5090ff';
                    if (theme === 'toxic') irisColor = '#00bb33';

                    // --- Pupil Tracking Logic ---
                    // "que realmente trackee el mouse... pero que solo funcione así cuando está en modo botón"
                    // Big Mode: Use simple `normalizedMouse` (looks at mouse relative to screen center).
                    // Button Mode: Calculate vector from Eye's new position to Mouse.

                    let pupilPos = normalizedMouse.current;

                    if (morph > 0.8) {
                        try {
                            // Convert normalized mouse to canvas coordinates (relative to center)
                            // normalizedMouse is -1 to 1. Canvas is w x h.
                            // normalizedMouse.x: +1 is right. So mx = normalizedMouse.x * (w/2).
                            // normalizedMouse.y: +1 is UP (as expected by drawPixelEye).
                            // Canvas Y is positive DOWN. So to convert normalizedMouse.y (Up-positive)
                            // to canvas pixel Y (Down-positive), we negate it.
                            const mx = normalizedMouse.current.x * (w / 2);
                            const my = -normalizedMouse.current.y * (h / 2);

                            // Eye position (currentX, currentY) in canvas pixels (relative to center)
                            // These are already in canvas-like coordinates (positive right, positive down for Y if not inverted)
                            // But currentY is already inverted if invertY is true, so it's consistent with canvas Y.
                            const ex = currentX;
                            const ey = currentY;

                            // Vector from Eye to Mouse (in canvas pixel coordinates)
                            const dx = mx - ex;
                            const dy = my - ey;

                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const maxLookDistance = 200; // Distance at which eye looks fully in that direction
                            const lookAmount = Math.min(1.0, dist / maxLookDistance);

                            // Normalize the direction vector and convert back to drawPixelEye's expected format:
                            // x: positive right, y: positive UP.
                            if (dist > 1e-6) { // Avoid division by zero
                                pupilPos = {
                                    x: (dx / dist) * lookAmount,
                                    y: -(dy / dist) * lookAmount // Negate dy to convert from canvas (Down-positive) to drawPixelEye (Up-positive)
                                };
                            } else {
                                pupilPos = { x: 0, y: 0 }; // If mouse is exactly on eye, look straight
                            }
                        } catch (e) {
                            // Fallback to default if any error occurs during calculation
                            console.error("Error calculating pupil position:", e);
                            pupilPos = normalizedMouse.current;
                        }
                    }

                    const customLookRange = 32;
                    const isHologram = false;
                    const scleraColor = '#ffffff';

                    // Draw eye
                    drawPixelEye(ctx, pupilPos, irisColor, customLookRange, scleraColor, isHologram);

                    // Button Pulse Effect (ALWAYS active when in Button Mode, i.e., morph > 0.8)
                    if (morph > 0.8) {
                        const time = state.clock.elapsedTime;

                        // Emulate `drawButtonShockwave` logic
                        const fps = 8;
                        const steppedTime = Math.floor(time * fps) / fps;
                        const waveProgress = (steppedTime % 2.0) / 2.0;

                        const baseRx = 90;
                        const baseRy = 70;
                        const expansion = waveProgress * 40;

                        // Alpha fade:
                        // 1. Fade out over time (wave cycle)
                        // 2. Fade out if hovered (User requested: "se desvanezca... cuando hago hover")
                        const hoverFade = 1.0 - eyeHoverProgress; // 1.0 -> 0.0
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
                // Show in 'gallery' always.
                // Show in 'static' ONLY during project transitions (isProjectTransition=true).
                // Show in 'exiting' to allow flicker OUT animation.
                const shouldShowContent = galleryState === 'gallery' || (galleryState === 'static' && isProjectTransition) || galleryState === 'exiting';
                if (shouldShowContent && isFocused) {
                    const currentProject = PROJECTS[currentProjectIndex];

                    // VIDEO: Multi-staggered loop icosahedron (Robust rendering)
                    const hasVideos = galleryVideosRef.current.length > 0;
                    if (hasVideos) {
                        try {
                            ctx.save();
                            ctx.translate(w / 2, h / 2);

                            if (invertY) {
                                ctx.rotate(Math.PI);
                                ctx.scale(-1, 1);
                            }

                            // 3D Chaotic Video Icosahedron (Staggered Looping + Interactive Deformation)
                            const videoOpacity = videoOpacityRef.current;

                            // Calculate local mouse position for the icosahedron
                            // currentLookAt is -1 to 1 relative to screen center.
                            const mouseIco = {
                                x: currentLookAt.current.x * (w / 2),
                                y: (invertY ? currentLookAt.current.y : -currentLookAt.current.y) * (h / 2) + 20
                            };

                            // Position slightly above center (lowered from -70 to -20 for better centring)
                            ctx.translate(0, -20);

                            // Draw chaotic icosahedron using the array of staggered videos and interactivity
                            drawChaoticIcosahedronVideo(ctx, galleryVideosRef.current, videoOpacity, icoDeepStateRef.current, mouseIco);

                            ctx.restore();
                        } catch (e) {
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
                    const typingState = drawProjectInfo(ctx, w, h, currentProject, typingStartTime, waitingForInput, osdOpacity);

                    // Sound for typewriter (EXACT AboutMe logic)
                    if (typingState && typingState.charsShown > lastTypedCharCount.current) {
                        if (typingAudioRef.current && osdOpacity > 0.1) {
                            typingAudioRef.current.playbackRate = 0.9 + Math.random() * 0.3;
                            typingAudioRef.current.currentTime = 0;
                            typingAudioRef.current.play().catch(() => { });
                        }
                        lastTypedCharCount.current = typingState.charsShown;
                    }

                    // Signal typing finished (like AboutMe)
                    if (typingState && typingState.isComplete && !waitingForInput) {
                        signalTypingFinished();
                    }

                    ctx.restore();
                }

                // Focused Text
                // 3. TITLE (always visible in gallery or static)
                if (isFocused && focusedText && (galleryState === 'gallery' || galleryState === 'static')) {
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

                // 4. BUTTONS (always visible in gallery or static)
                if (isFocused && (galleryState === 'gallery' || galleryState === 'static')) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    // Use shared helper for hover animations
                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : MYWORKS_BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : MYWORKS_BUTTON_CONFIG.PLAY.y;

                        const hoverProgress = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnim', startButtonHovered
                        );

                        if (!disableStartPulse) {
                            drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, '#ffffff');
                        }
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, 0, '#ffffff');
                    }

                    if (showPrevButton) {
                        const btnPrevX = prevButtonPosition ? prevButtonPosition.x : MYWORKS_BUTTON_CONFIG.PREV.x;
                        const btnPrevY = prevButtonPosition ? prevButtonPosition.y : MYWORKS_BUTTON_CONFIG.PREV.y;

                        const hoverProgressPrev = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimPrev', prevButtonHovered
                        );

                        drawPlayStopButton(ctx, btnPrevX, btnPrevY, hoverProgressPrev, 0, '#ffffff', Math.PI);
                    }

                    if (showBackButton) {
                        const btnBackX = backButtonPosition ? backButtonPosition.x : MYWORKS_BUTTON_CONFIG.BACK.x;
                        const btnBackY = backButtonPosition ? backButtonPosition.y : MYWORKS_BUTTON_CONFIG.BACK.y;

                        const hoverProgressBack = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimBack', backButtonHovered
                        );

                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack, '#ffffff');
                    }

                    if (showMenuButton) {
                        const btnMenuX = menuButtonPosition ? menuButtonPosition.x : MYWORKS_BUTTON_CONFIG.MENU.x;
                        const btnMenuY = menuButtonPosition ? menuButtonPosition.y : MYWORKS_BUTTON_CONFIG.MENU.y;

                        const hoverProgressMenu = updateButtonHoverAnimation(
                            screenTextureRef.current, 'hoverAnimMenu', menuButtonHovered
                        );

                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu, '#ffffff');
                    }

                    // Eye button: NO LONGER DRAWN SEPARATELY
                    // The Main Eye morphs into this position.
                    // We only need to handle the hover visual if you want extra effects (added above)

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                }


                // --- RENDERING PIPELINE END ---
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
                    onPointerMove={(e: any) => {
                        if (!isFocused) return;
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
                        if (!isFocused) return;
                        if (startButtonHovered) setStartButtonHovered(false);
                        if (backButtonHovered) setBackButtonHovered(false);
                        if (menuButtonHovered) setMenuButtonHovered(false);
                        if (prevButtonHovered) setPrevButtonHovered(false);
                        if (eyeButtonHovered) setEyeButtonHovered(false);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e: any) => {
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
                                // Trigger Exit Transition
                                setGalleryState('exiting');
                                setTimeout(() => {
                                    onBackClick();
                                }, STATIC_DURATION);
                            } else if (buttonHit === 'menu' && onMenuClick) {
                                e.stopPropagation();
                                setGalleryState('exiting');
                                setTimeout(() => {
                                    onMenuClick();
                                }, STATIC_DURATION);
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

