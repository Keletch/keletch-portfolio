import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { THEMES } from '../Types';
import { VisionProps } from './VisionTypes';
import { drawPixelEye } from '../Helpers';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { useScreenInteraction } from '@/hooks/useScreenInteraction';
import { useBlink } from '@/hooks/useBlink';
import {
    SphereChar,
    SphereWave,
    buildSphereSystem,
    activateParagraph,
    returnParagraph,
    resetAllChars,
    updateSphereChars,
    drawSphereSystem
} from './VisionASCII';
import {
    checkVisionButtonHover,
    drawBackButton,
    drawMenuButton,
    drawPlayStopButton,
    drawButtonShockwave,
    updateButtonHoverAnimation,
    VISION_BUTTON_CONFIG
} from './VisionHelpers';
import { VISION_STORY } from './VisionData';

const DEFAULT_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'monitor', 'glass', 'vidrio', 'cristal', 'tube', 'lcdscreen', 'lcd_screen', 'redtvscreen', 'dirtytvscreen', 'tipicaltvscreen', 'toontvscreen', 'toontv_screen'];

const ZOOM_DURATION = 1800;
const STATIC_DURATION = 600;

const SPHERE_Y = -260;
const SPHERE_R = 250;
const TEXT_Y = 50;
const TEXT_MAX_W = 320;
const TEXT_LINE_H = 22;
const SPHERE_FONT_SIZE = 11;
const TEXT_FONT_SIZE = 16;
const TEXT_FONT = `bold ${TEXT_FONT_SIZE}px "Courier New", monospace`;

export default function Vision({
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
    focusedText,
    isFocused = false,
    textYOffset = 60,
    showBackButton = false,
    onBackClick,
    backButtonPosition,
    showMenuButton = false,
    onMenuClick,
    menuButtonPosition,
    visionColors
}: VisionProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [backButtonHovered, setBackButtonHovered] = useState(false);
    const [menuButtonHovered, setMenuButtonHovered] = useState(false);
    const [playButtonHovered, setPlayButtonHovered] = useState(false);

    const [galleryState, setGalleryState] = useState<'idle' | 'zooming' | 'static' | 'content' | 'exiting'>('idle');

    const [visionState, setVisionState] = useState<'sphere' | 'extracting' | 'showing' | 'reforming'>('sphere');
    const [currentParagraph, setCurrentParagraph] = useState(0);
    const [storyActive, setStoryActive] = useState(false);

    const actionStartTimeRef = useRef(0);
    const morphProgressRef = useRef(0);
    const wavesRef = useRef<SphereWave[]>([]);
    const clockTimeRef = useRef(0);

    // Characters for wave selection
    const WAVE_CHARS = '{}[]<>=/*&|!?;:@#$%^~';

    const triggerWave = useCallback(() => {
        const time = clockTimeRef.current;
        const char = WAVE_CHARS[Math.floor(Math.random() * WAVE_CHARS.length)];
        wavesRef.current.push({ startTime: time, char });
        wavesRef.current = wavesRef.current.filter(w => (time - w.startTime) < 3);
    }, []);

    // Sphere character system (lazy init)
    const sphereCharsRef = useRef<SphereChar[] | null>(null);
    if (sphereCharsRef.current === null && typeof document !== 'undefined') {
        sphereCharsRef.current = buildSphereSystem(
            VISION_STORY, 0, TEXT_Y, TEXT_MAX_W, TEXT_LINE_H, TEXT_FONT
        );
    }

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

    const { blinkState, updateBlink } = useBlink();

    // --- TRANSITIONS ---
    const sphereTarget = (galleryState === 'content' || galleryState === 'static') ? 'sphere' : null;
    const { transitionOpacity: sphereOpacityRef } = useFigureTransition(sphereTarget, 0);
    const eyeTarget = (galleryState === 'idle' || galleryState === 'zooming') ? 'eye' : null;
    const { transitionOpacity: eyeOpacityRef } = useFigureTransition(eyeTarget, 0);

    const eyeMorphProgress = useRef(0);
    const themeBasedDefaults = THEMES[theme] || THEMES.classic;
    const activeTheme = visionColors ? { ...themeBasedDefaults, ...visionColors } : themeBasedDefaults;
    const buttonColor = activeTheme.highlightColor || '#ffffff';

    // Focus and zoom lifecycle management
    useEffect(() => {
        let zoomTimer: NodeJS.Timeout;
        let staticTimer: NodeJS.Timeout;

        if (isFocused) {
            setGalleryState('zooming');
            const startStaticDelay = Math.max(0, ZOOM_DURATION - STATIC_DURATION);
            zoomTimer = setTimeout(() => {
                setGalleryState('static');
                staticTimer = setTimeout(() => setGalleryState('content'), STATIC_DURATION);
            }, startStaticDelay);
        } else {
            if (galleryState === 'content' || galleryState === 'static') {
                setGalleryState('exiting');
                if (storyActive) setStoryActive(false);
                zoomTimer = setTimeout(() => {
                    setVisionState('sphere');
                    setCurrentParagraph(0);
                    if (sphereCharsRef.current) resetAllChars(sphereCharsRef.current);
                    setGalleryState('idle');
                }, 1000);
            } else {
                setGalleryState('idle');
                if (storyActive) setStoryActive(false);
                setVisionState('sphere');
                setCurrentParagraph(0);
                if (sphereCharsRef.current) resetAllChars(sphereCharsRef.current);
            }
        }

        return () => { clearTimeout(zoomTimer); clearTimeout(staticTimer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused]);

    const [delayedUI, setDelayedUI] = useState(false);

    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedUI(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedUI(false);
            setBackButtonHovered(false);
            setMenuButtonHovered(false);
            setPlayButtonHovered(false);
            document.body.style.cursor = 'auto';
        }
    }, [isFocused]);

    const { renderedFigure: renderedUI, transitionOpacity: uiOpacityRef } = useFigureTransition(delayedUI ? 'ui' : null, 0);

    useEffect(() => {
        if (!storyActive) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleAdvance();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyActive, visionState, currentParagraph]);

    const handlePlayClick = useCallback(() => {
        if (!sphereCharsRef.current) return;

        if (!storyActive) {
            setStoryActive(true);
            setCurrentParagraph(0);
            activateParagraph(sphereCharsRef.current, 0);
            actionStartTimeRef.current = performance.now() / 1000;
            setVisionState('extracting');
        } else {
            returnParagraph(sphereCharsRef.current, currentParagraph);
            actionStartTimeRef.current = performance.now() / 1000;
            setVisionState('reforming');
            setStoryActive(false);
        }
    }, [storyActive, currentParagraph]);

    const handleAdvance = useCallback(() => {
        if (!storyActive || visionState !== 'showing' || !sphereCharsRef.current) return;

        triggerWave();
        returnParagraph(sphereCharsRef.current, currentParagraph);
        actionStartTimeRef.current = performance.now() / 1000;
        setVisionState('reforming');
    }, [storyActive, visionState, currentParagraph, triggerWave]);

    const frustumRef = useRef(new THREE.Frustum());
    const projScreenMatrixRef = useRef(new THREE.Matrix4());

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 25) return;
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

            updateScreenGaze(state, delta);
            updateBlink(delta, state.clock.elapsedTime);

            const targetMorph = (galleryState === 'content' || galleryState === 'static' || galleryState === 'exiting') ? 1.0 : 0.0;
            const morphSpeed = galleryState === 'exiting' ? 1.5 : 2.0;
            eyeMorphProgress.current += (targetMorph - eyeMorphProgress.current) * (morphSpeed * delta);
            if (Math.abs(eyeMorphProgress.current - targetMorph) < 0.001) eyeMorphProgress.current = targetMorph;

            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            const morph = eyeMorphProgress.current;
            const time = state.clock.elapsedTime;
            clockTimeRef.current = time;

            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;

                if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                const cache = screenTextureRef.current.userData;
                if (cache.w !== w || cache.h !== h || cache.theme !== theme) {
                    cache.w = w; cache.h = h; cache.theme = theme;
                    const bl = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                    bl.addColorStop(0, activeTheme.glowCenter);
                    bl.addColorStop(1, 'rgba(0,0,0,0)');
                    cache.backlight = bl;
                    const vg = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                    vg.addColorStop(0, 'rgba(0,0,0,0)');
                    vg.addColorStop(0.5, 'rgba(0,0,0,0.1)');
                    vg.addColorStop(1, activeTheme.vignetteColor);
                    cache.vignette = vg;
                }

                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);
                if (cache.backlight) { ctx.fillStyle = cache.backlight; ctx.fillRect(0, 0, w, h); }
                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);

                if (morph < 0.99) {
                    ctx.save();
                    const isLCD = theme === 'toxic';
                    const scleraMaxOffsetX = isLCD ? 150 : 100;
                    const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                    const effectiveScleraY = -currentLookAt.current.y * 100;
                    ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);
                    const scaleEye = theme === 'mobile' ? 0.6 : 1.0;
                    let geoCorrectionX = 1.0;
                    if (theme === 'toxic' && screenAspect.current > 1.2) geoCorrectionX = 1 / (screenAspect.current * 0.85);
                    ctx.globalAlpha = (1.0 - morph) * eyeOpacityRef.current;
                    ctx.scale(geoCorrectionX * scaleEye, blinkState.current.openness * scaleEye);
                    const customLookRange = theme === 'toxic' ? 32 : theme === 'mobile' ? 15 : 26;
                    const isHologram = theme === 'mobile' || theme === 'hacker' || theme === 'holo';
                    drawPixelEye(ctx, normalizedMouse.current, activeTheme.irisColor, customLookRange, activeTheme.scleraColor || '#ffffff', isHologram);
                    ctx.restore();
                }

                if (morph > 0.01 && (galleryState === 'content' || galleryState === 'static' || galleryState === 'exiting') && sphereCharsRef.current) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }

                    const sphereOpacity = sphereOpacityRef.current * morph;
                    const sphereColor = visionColors?.irisColor || activeTheme.irisColor;
                    const chars = sphereCharsRef.current;
                    const elapsed = performance.now() / 1000 - actionStartTimeRef.current;

                    if (visionState === 'extracting') {
                        const { allLeavingDone } = updateSphereChars(chars, delta, elapsed);
                        if (allLeavingDone) setVisionState('showing');
                    } else if (visionState === 'reforming') {
                        const { allReturningDone } = updateSphereChars(chars, delta, elapsed);
                        if (allReturningDone) {
                            if (storyActive) {
                                const next = currentParagraph + 1;
                                if (next < VISION_STORY.length) {
                                    setCurrentParagraph(next);
                                    activateParagraph(chars, next);
                                    actionStartTimeRef.current = performance.now() / 1000;
                                    setVisionState('extracting');
                                } else {
                                    setStoryActive(false);
                                    setCurrentParagraph(0);
                                    setVisionState('sphere');
                                }
                            } else {
                                setVisionState('sphere');
                            }
                        }
                    }

                    drawSphereSystem(ctx, chars, time, sphereOpacity, 0, SPHERE_Y, SPHERE_R, sphereColor, SPHERE_FONT_SIZE, wavesRef.current, TEXT_FONT_SIZE);

                    if (visionState === 'showing' && storyActive) {
                        const pulse = 0.4 + Math.sin(time * 3) * 0.3;
                        const isLast = currentParagraph >= VISION_STORY.length - 1;
                        ctx.globalAlpha = sphereOpacity * pulse;
                        ctx.fillStyle = visionColors?.highlightColor || activeTheme.highlightColor || '#ffffff';
                        if (!isLast) {
                            ctx.font = `bold 10px "Courier New", monospace`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('▾', 0, TEXT_Y + 70);
                        } else {
                            ctx.beginPath();
                            ctx.arc(0, TEXT_Y + 70, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    ctx.restore();
                }

                if (cache.vignette) { ctx.fillStyle = cache.vignette; ctx.fillRect(0, 0, w, h); }

                // UI Overlay (Focused Text & Buttons)
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

                        ctx.translate(w / 2, h / 2);
                        if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }
                        const jx = (Math.random() - 0.5) * 4;
                        const jy = (Math.random() - 0.5) * 4;
                        ctx.font = '900 42px "Courier New", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        const textY = -h / 2 + textYOffset;
                        const s1 = activeTheme.textShadow1 || 'rgba(255, 0, 0, 0.5)';
                        const s2 = activeTheme.textShadow2 || 'rgba(0, 255, 255, 0.5)';
                        ctx.fillStyle = (activeTheme.textShadow1) ? s1 + '80' : s1;
                        ctx.fillText(focusedText, jx + 4, textY + jy);
                        ctx.fillStyle = (activeTheme.textShadow2) ? s2 + '80' : s2;
                        ctx.fillText(focusedText, jx - 4, textY + jy);
                        ctx.fillStyle = buttonColor || '#ffffff';
                        if (Math.random() > 0.1) ctx.fillText(focusedText, jx, textY + jy);
                        ctx.restore();
                    }

                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }

                    const btnJitterBase = Math.sin(state.clock.elapsedTime * 12 + 5) > 0.8 ? (Math.random() - 0.5) * 0.3 : 0;
                    const btnBaseAlpha = Math.max(0, Math.min(1, uiSteppedOpacity + btnJitterBase));
                    ctx.globalAlpha = btnBaseAlpha;

                    if (galleryState === 'content' || galleryState === 'static') {
                        const bx = VISION_BUTTON_CONFIG.PLAY.x;
                        const by = VISION_BUTTON_CONFIG.PLAY.y;
                        const hp = updateButtonHoverAnimation(screenTextureRef.current, 'hoverAnimPlay', playButtonHovered);
                        const mt = storyActive ? 1 : 0;
                        morphProgressRef.current += (mt - morphProgressRef.current) * 0.15;
                        if (Math.abs(morphProgressRef.current - mt) < 0.001) morphProgressRef.current = mt;
                        drawButtonShockwave(ctx, bx, by, hp, time, buttonColor);
                        drawPlayStopButton(ctx, bx, by, hp, morphProgressRef.current, buttonColor);
                    }

                    if (showBackButton) {
                        const bx = backButtonPosition?.x ?? VISION_BUTTON_CONFIG.BACK.x;
                        const by = backButtonPosition?.y ?? VISION_BUTTON_CONFIG.BACK.y;
                        const hp = updateButtonHoverAnimation(screenTextureRef.current, 'hoverAnimBack', backButtonHovered);
                        drawBackButton(ctx, bx, by, hp, buttonColor);
                    }

                    if (showMenuButton) {
                        const bx = menuButtonPosition?.x ?? VISION_BUTTON_CONFIG.MENU.x;
                        const by = menuButtonPosition?.y ?? VISION_BUTTON_CONFIG.MENU.y;
                        const hp = updateButtonHoverAnimation(screenTextureRef.current, 'hoverAnimMenu', menuButtonHovered);
                        drawMenuButton(ctx, bx, by, hp, buttonColor);
                    }

                    ctx.restore();
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
                    onPointerMove={(e: ThreeEvent<PointerEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            // Button hover detection and cursor management
                            const hit = checkVisionButtonHover(
                                e.uv, isFocused, invertY,
                                showBackButton, showMenuButton,
                                galleryState === 'content' || galleryState === 'static',
                                storyActive,
                                backButtonPosition, menuButtonPosition
                            );
                            const nb = hit === 'back', nm = hit === 'menu', np = hit === 'play';
                            if (nb !== backButtonHovered) setBackButtonHovered(nb);
                            if (nm !== menuButtonHovered) setMenuButtonHovered(nm);
                            if (np !== playButtonHovered) setPlayButtonHovered(np);
                            document.body.style.cursor = (nb || nm || np) ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerLeave={() => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        setBackButtonHovered(false);
                        setMenuButtonHovered(false);
                        setPlayButtonHovered(false);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e: ThreeEvent<PointerEvent>) => {
                        if (!isFocused || renderedUI !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            const hit = checkVisionButtonHover(
                                e.uv, isFocused, invertY,
                                showBackButton, showMenuButton,
                                galleryState === 'content' || galleryState === 'static',
                                storyActive,
                                backButtonPosition, menuButtonPosition
                            );
                            if (hit === 'play') { e.stopPropagation(); handlePlayClick(); }
                            else if (hit === 'back' && onBackClick) { e.stopPropagation(); onBackClick(); }
                            else if (hit === 'menu' && onMenuClick) { e.stopPropagation(); onMenuClick(); }
                            else if (storyActive && visionState === 'showing') { e.stopPropagation(); handleAdvance(); }
                            else if (e.object.userData.isScreen) {
                                // Non-button click on screen: trigger wave
                                e.stopPropagation();
                                triggerWave();
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}
