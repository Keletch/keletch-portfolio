import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { THEMES } from '@/components/Television/Types';
import { MyWorksProps, MYWORKS_BUTTON_CONFIG } from './MyWorksTypes';
import { drawPixelEye } from '@/components/Television/Helpers';
import {
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton,
    drawButtonShockwave,
    drawStaticNoise,
    drawOSD,
    drawEyeButton,
    calculateOSDLayout
} from './MyWorksHelpers';

const PROJECTS = [
    {
        title: "Infinite Gallery 2025",
        stack: "Next.js / React Three Fiber / Supabase",
        desc: "Interactive 3D Gallery",
        videoSrc: "/works/infiniteGallery.webm",
        link: "https://galeria.chu.mx/gallery"
    },
    {
        title: "Food landing 2025",
        stack: "Wordpress / GLSL / HTML",
        desc: "Made with Elementor and animated with GLSL",
        videoSrc: "/works/parrillita.webm",
        link: "https://laredosparrillita.com/"
    }
];

const DEFAULT_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'screen_lcd'];

// Standard transition timings
const ZOOM_DURATION = 1000; // Time to wait for zoom
const STATIC_DURATION = 500; // Duration of static noise

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
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });
    const [startButtonHovered, setStartButtonHovered] = useState(false);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);
    const [prevButtonHovered, setPrevButtonHovered] = useState(false);
    const [eyeButtonHovered, setEyeButtonHovered] = useState(false);

    // Project Navigation State
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

    const [galleryState, setGalleryState] = useState<'idle' | 'zooming' | 'static' | 'gallery' | 'exiting'>('idle');
    const [isProjectTransition, setIsProjectTransition] = useState(false);

    const galleryVideoRef = useRef<HTMLVideoElement | null>(null);
    const galleryEnterTime = useRef(0);

    // Audio Refs
    const typingAudioRef = useRef<HTMLAudioElement | null>(null);
    const lastTypedCharCount = useRef(0);

    // Skip Typing State
    const [skipTyping, setSkipTyping] = useState(false);

    // Optimization: Memoize OSD Layout
    const osdLayout = useMemo(() => {
        return calculateOSDLayout(PROJECTS[currentProjectIndex]);
    }, [currentProjectIndex]);

    // Init Audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('/sounds/Bip.wav');
            audio.volume = 0.05; // Increased volume
            typingAudioRef.current = audio;
        }
    }, []);

    // Spacebar Listener for Skip
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFocused && e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                setSkipTyping(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFocused]);

    useEffect(() => {
        if (galleryState === 'gallery') {
            galleryEnterTime.current = performance.now() / 1000;
            lastTypedCharCount.current = 0;
        }
    }, [galleryState, currentProjectIndex]); // Reset when project changes too

    // Reset Skip on Project Change
    useEffect(() => {
        setSkipTyping(false);
    }, [currentProjectIndex]);

    // Video Loading Effect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentSrc = PROJECTS[currentProjectIndex].videoSrc;

            // Check if we already have a video element
            let vid = galleryVideoRef.current;
            if (!vid) {
                vid = document.createElement('video');
                vid.loop = true;
                vid.muted = true;
                vid.playsInline = true;
                vid.crossOrigin = 'anonymous';
                galleryVideoRef.current = vid;
            }

            // Update source if changed
            // Note: simple src check might need full URL comparison in some browsers, 
            // but for relative paths this usually works if we keep it consistent.
            // To be safe, we just set it.
            if (vid.getAttribute('src') !== currentSrc) {
                vid.src = currentSrc;
                vid.load();
                vid.play().catch(() => { });
            } else {
                // Ensure playing
                if (vid.paused) vid.play().catch(() => { });
            }
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
        }, 300);
    };

    const handlePrevProject = () => {
        setIsProjectTransition(true);
        setGalleryState('static');
        setTimeout(() => {
            setCurrentProjectIndex(prev => (prev - 1 + PROJECTS.length) % PROJECTS.length);
            setGalleryState('gallery');
            setIsProjectTransition(false);
        }, 300);
    };


    // Transition Logic
    useEffect(() => {
        let zoomTimer: NodeJS.Timeout;
        let staticTimer: NodeJS.Timeout;

        if (isFocused) {
            // Start sequence
            setGalleryState('zooming');

            // We want static to END when zoom ENDS.
            // So start static at (ZOOM - STATIC)
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
            // Reset to first project on exit? Or keep state?
            // Keeping state feels more natural for "pausing". 
            // If user wants reset, we can do it here. 
            // Let's keep it for now.
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

    const morphProgressRef = useRef(0);

    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0,
        nextBlinkTime: 0,
        blinkDuration: 0.15,
        blinkTimer: 0
    });

    // OSD Transition Opacity
    const {
        transitionOpacity: osdOpacityRef
    } = useFigureTransition(galleryState === 'gallery' ? 'osd' : null);

    const activeTheme = THEMES[theme] || THEMES.classic;

    const checkButtonHover = (uv: THREE.Vector2): 'play' | 'back' | 'menu' | 'prev' | 'eye' | 'text_box' | null => {
        if (!isFocused) return null;

        let px = uv.x * 512;
        let py = (1 - uv.y) * 512;
        let dx = px - 256;
        let dy = py - 256;

        if (invertY) dy = -dy;

        if (showStartButton) {
            const btnX = startButtonPosition ? startButtonPosition.x : MYWORKS_BUTTON_CONFIG.PLAY.x;
            const btnY = startButtonPosition ? startButtonPosition.y : MYWORKS_BUTTON_CONFIG.PLAY.y;
            const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distPlay < MYWORKS_BUTTON_CONFIG.PLAY.radius) return 'play';
        }

        if (showBackButton) {
            const btnX = backButtonPosition ? backButtonPosition.x : MYWORKS_BUTTON_CONFIG.BACK.x;
            const btnY = backButtonPosition ? backButtonPosition.y : MYWORKS_BUTTON_CONFIG.BACK.y;
            const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distBack < MYWORKS_BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const btnX = menuButtonPosition ? menuButtonPosition.x : MYWORKS_BUTTON_CONFIG.MENU.x;
            const btnY = menuButtonPosition ? menuButtonPosition.y : MYWORKS_BUTTON_CONFIG.MENU.y;
            const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distMenu < MYWORKS_BUTTON_CONFIG.MENU.radius) return 'menu';
        }

        if (showPrevButton) {
            const btnX = prevButtonPosition ? prevButtonPosition.x : MYWORKS_BUTTON_CONFIG.PREV.x;
            const btnY = prevButtonPosition ? prevButtonPosition.y : MYWORKS_BUTTON_CONFIG.PREV.y;
            const distPrev = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distPrev < MYWORKS_BUTTON_CONFIG.PREV.radius) return 'prev';
        }

        if (showEyeButton) {
            const btnX = eyeButtonPosition ? eyeButtonPosition.x : MYWORKS_BUTTON_CONFIG.EYE.x;
            const btnY = eyeButtonPosition ? eyeButtonPosition.y : MYWORKS_BUTTON_CONFIG.EYE.y;
            const distEye = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distEye < MYWORKS_BUTTON_CONFIG.EYE.radius) return 'eye';
        }

        // Check Text Box Hit (Optimized)
        if (galleryState === 'gallery') {
            const { minX, maxX, minY, maxY } = osdLayout.hitArea;
            if (dx > minX && dx < maxX && dy > minY && dy < maxY) {
                return 'text_box';
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
            if (theme === 'toxic' && screenAspect.current > 1.1) {
                aspectCompensation = 1 / screenAspect.current;
            }

            let finalX = (gazeX * sensitivity) + gazeOffset.x;
            let finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

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

                // --- RENDERING PIPELINE START ---

                // 1. BACKGROUND / BASE
                // If in 'gallery' or 'exiting', we draw the image/video first.
                // This keeps the video visible under the exit static.

                if (galleryState === 'gallery' || galleryState === 'exiting' || galleryState === 'static') {
                    let drawn = false;
                    if (galleryVideoRef.current && galleryVideoRef.current.readyState >= 2) {
                        try {
                            const vid = galleryVideoRef.current;
                            if (vid.paused) vid.play().catch(() => { });

                            ctx.save();

                            const now = performance.now() / 1000;
                            const timeSinceEntry = now - galleryEnterTime.current;
                            let vHoldOffset = 0;

                            if (galleryState === 'gallery' && timeSinceEntry < 1.0) {
                                const t = timeSinceEntry;
                                vHoldOffset = (h * 0.15) * Math.exp(-t * 5) * Math.cos(t * 10);
                            }

                            ctx.translate(0, h + vHoldOffset);
                            ctx.scale(1, -1);
                            ctx.drawImage(vid, 0, 0, w, h);
                            ctx.restore();
                            drawn = true;
                        } catch (e) {
                        }
                    }

                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(0, 0, w, h);

                } else {
                    // Standard Theme Background
                    ctx.fillStyle = activeTheme.bgColor;
                    ctx.fillRect(0, 0, w, h);

                    const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                    backlight.addColorStop(0, activeTheme.glowCenter);
                    backlight.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = backlight;
                    ctx.fillRect(0, 0, w, h);

                    ctx.fillStyle = activeTheme.baseColor;
                    ctx.fillRect(0, 0, w, h);

                    ctx.save();
                    const isLCD = theme === 'toxic';
                    const scleraMaxOffsetX = isLCD ? 150 : 100;
                    const scleraMaxOffsetY = 100;
                    const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                    const effectiveScleraY = -currentLookAt.current.y * scleraMaxOffsetY;

                    ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);

                    let scaleEye = 1.0;
                    let geoCorrectionX = 1.0;
                    if (theme === 'toxic' && screenAspect.current > 1.2) {
                        geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    }
                    ctx.scale(geoCorrectionX * scaleEye, blink.openness * scaleEye);

                    let irisColor = '#5090ff';
                    if (theme === 'toxic') irisColor = '#00bb33';

                    const customLookRange = 32;
                    const isHologram = false;
                    const scleraColor = '#ffffff';

                    drawPixelEye(ctx, normalizedMouse.current, irisColor, customLookRange, scleraColor, isHologram);
                    ctx.restore();
                }

                // 1.5 TITLE INTRO (Rendered before Static so it gets affected)
                // Only show after static (Gallery/Exiting)
                if (isFocused && focusedText && (galleryState === 'gallery' || (galleryState === 'static' && isProjectTransition))) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);

                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    const fontSize = '40px';
                    const targetY = -190;

                    const jitterX = (Math.random() - 0.5) * 4;
                    const jitterY = (Math.random() - 0.5) * 4;

                    ctx.font = `900 ${fontSize} "Courier New", monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillText(focusedText, 0 + jitterX + 4, targetY + jitterY);

                    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.fillText(focusedText, 0 + jitterX - 4, targetY + jitterY);

                    ctx.fillStyle = '#ffffff';

                    if (Math.random() > 0.1) {
                        ctx.fillText(focusedText, 0 + jitterX, targetY + jitterY);
                    }

                    ctx.restore();
                }

                // 1.8 UI / BUTTONS (Rendered before Static)
                // Show ONLY when in 'gallery' (after static) or 'exiting'.
                // Hidden during 'zooming' and initial 'static'.
                if (isFocused && (galleryState === 'gallery' || (galleryState === 'static' && isProjectTransition))) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : MYWORKS_BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : MYWORKS_BUTTON_CONFIG.PLAY.y;
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
                        if (!disableStartPulse) {
                            drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, '#ffffff');
                        }
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, 0, '#ffffff');
                    }

                    if (showPrevButton) {
                        const btnPrevX = prevButtonPosition ? prevButtonPosition.x : MYWORKS_BUTTON_CONFIG.PREV.x;
                        const btnPrevY = prevButtonPosition ? prevButtonPosition.y : MYWORKS_BUTTON_CONFIG.PREV.y;
                        const isPrevHover = prevButtonHovered;
                        let hoverProgressPrev = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimPrev === 'undefined') screenTextureRef.current.userData.hoverAnimPrev = 0;
                            const targetPrev = isPrevHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimPrev += (targetPrev - screenTextureRef.current.userData.hoverAnimPrev) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimPrev) < 0.001) screenTextureRef.current.userData.hoverAnimPrev = 0;
                            hoverProgressPrev = screenTextureRef.current.userData.hoverAnimPrev;
                        }
                        drawPlayStopButton(ctx, btnPrevX, btnPrevY, hoverProgressPrev, 0, '#ffffff', Math.PI);
                    }

                    if (showBackButton) {
                        const btnBackX = backButtonPosition ? backButtonPosition.x : MYWORKS_BUTTON_CONFIG.BACK.x;
                        const btnBackY = backButtonPosition ? backButtonPosition.y : MYWORKS_BUTTON_CONFIG.BACK.y;
                        const isBackHover = backButtonHovered;
                        let hoverProgressBack = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimBack === 'undefined') screenTextureRef.current.userData.hoverAnimBack = 0;
                            const targetBack = isBackHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimBack += (targetBack - screenTextureRef.current.userData.hoverAnimBack) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimBack) < 0.001) screenTextureRef.current.userData.hoverAnimBack = 0;
                            hoverProgressBack = screenTextureRef.current.userData.hoverAnimBack;
                        }
                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack, '#ffffff');
                    }

                    if (showMenuButton) {
                        const btnMenuX = menuButtonPosition ? menuButtonPosition.x : MYWORKS_BUTTON_CONFIG.MENU.x;
                        const btnMenuY = menuButtonPosition ? menuButtonPosition.y : MYWORKS_BUTTON_CONFIG.MENU.y;
                        const isMenuHover = menuButtonHovered;
                        let hoverProgressMenu = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimMenu === 'undefined') screenTextureRef.current.userData.hoverAnimMenu = 0;
                            const targetMenu = isMenuHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimMenu += (targetMenu - screenTextureRef.current.userData.hoverAnimMenu) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimMenu) < 0.001) screenTextureRef.current.userData.hoverAnimMenu = 0;
                            hoverProgressMenu = screenTextureRef.current.userData.hoverAnimMenu;
                        }
                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu, '#ffffff');
                    }

                    if (showEyeButton) {
                        const btnX = eyeButtonPosition ? eyeButtonPosition.x : MYWORKS_BUTTON_CONFIG.EYE.x;
                        const btnY = eyeButtonPosition ? eyeButtonPosition.y : MYWORKS_BUTTON_CONFIG.EYE.y;
                        const isHover = eyeButtonHovered;
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnimEye === 'undefined') screenTextureRef.current.userData.hoverAnimEye = 0;
                            const target = isHover ? 1 : 0;
                            screenTextureRef.current.userData.hoverAnimEye += (target - screenTextureRef.current.userData.hoverAnimEye) * 0.1;
                            if (Math.abs(screenTextureRef.current.userData.hoverAnimEye) < 0.001) screenTextureRef.current.userData.hoverAnimEye = 0;
                            hoverProgress = screenTextureRef.current.userData.hoverAnimEye;
                        }
                        const eyeRadius = eyeButtonPosition && (eyeButtonPosition as any).radius ? (eyeButtonPosition as any).radius : MYWORKS_BUTTON_CONFIG.EYE.radius;
                        drawEyeButton(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, '#ffffff', eyeRadius);
                    }

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                }

                // 2. STATIC OVERLAY
                if (galleryState === 'static' || galleryState === 'exiting') {
                    // Full Static
                    drawStaticNoise(ctx, w, h, time, 0.9);
                } else if (galleryState === 'gallery') {
                    // Subtle grain over gallery? (Optional, adds realism)
                    drawStaticNoise(ctx, w, h, time, 0.05);

                    // 2.1 OSD TEXT (Project Info)
                    // We need to flip coordinate system so it draws correctly on the inverted screen.
                    // Canvas Bottom = Screen Top. We want OSD at Screen Bottom (Canvas Top).
                    // And we need text to be flipped relative to Canvas so it's upright on Screen.
                    const osdOpacity = osdOpacityRef.current; // Get opacity from hook

                    ctx.save();
                    if (invertY) {
                        ctx.translate(0, h);
                        ctx.scale(1, -1);
                    }
                    // Use performance.now() to match galleryEnterTime basis
                    const now = performance.now() / 1000;
                    // USE CURRENT PROJECT
                    const currentProject = PROJECTS[currentProjectIndex];
                    const typingState = drawOSD(ctx, w, h, now, osdLayout, galleryEnterTime.current, osdOpacity, skipTyping);
                    ctx.restore();

                    // Sound Logic (New)
                    if (typingState && typingState.isTyping && typingState.charsDrawn > lastTypedCharCount.current) {
                        if (typingAudioRef.current && osdOpacity > 0.1) {
                            typingAudioRef.current.playbackRate = 0.9 + Math.random() * 0.3;
                            typingAudioRef.current.currentTime = 0;
                            typingAudioRef.current.play().catch(() => { });
                        }
                        lastTypedCharCount.current = typingState.charsDrawn;
                    } else if (typingState && !typingState.isTyping && lastTypedCharCount.current < typingState.charsDrawn) {
                        // Catch up count if paused/done
                        lastTypedCharCount.current = typingState.charsDrawn;
                    }
                }

                // 3. VIGNETTE & GLOW (Standard TV Effects)
                // Applied on top of everything
                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                let vignetteColor = 'rgba(0, 10, 0, 0.95)'; // Toxic default
                if (galleryState === 'gallery') vignetteColor = 'rgba(0,0,0,0.8)'; // Darker vignette for gallery

                gradient.addColorStop(1, vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

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
                            const buttonHit = checkButtonHover(e.uv);

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
                            const buttonHit = checkButtonHover(e.uv);
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
                                setSkipTyping(true);
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}
