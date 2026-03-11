import { useRef, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { THEMES } from '../Types';
import { ContactProps, CONTACT_BUTTON_CONFIG } from './ContactTypes';
import { drawPixelEye } from '../Helpers';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';
import { updateButtonHoverAnimation } from '../SharedHelpers';
import { checkContactButtonHover, drawBackButton, drawMenuButton, HitResult } from './ContactHelpers';

const DEFAULT_SCREEN_NAMES = ['mobileScreen'];

const CONTACT_LINKS = [
    { id: 'email', label: 'EMAIL:', value: 'aerocha56@gmail.com' },
    { id: 'linkedin', label: 'LINKEDIN:', value: '/in/keletch' },
    { id: 'github', label: 'GITHUB:', value: '/keletch' }
];

export default function ContactTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'mobile',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText = 'LET\'S CONNECT',
    isFocused = false,
    textYOffset = 45, // will calculate relative to -h/2
    showBackButton = false,
    onBackClick,
    backButtonPosition = CONTACT_BUTTON_CONFIG.BACK,
    showMenuButton = false,
    onMenuClick,
    menuButtonPosition = CONTACT_BUTTON_CONFIG.MENU
}: ContactProps) {
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

    const [hoveredButton, setHoveredButton] = useState<HitResult>(null);

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

    const blinkState = useRef({
        isBlinking: false, openness: 1.0, nextBlinkTime: 0, blinkDuration: 0.15, blinkTimer: 0
    });

    const activeTheme = THEMES[theme as keyof typeof THEMES] || THEMES.mobile;
    const buttonColor = activeTheme.highlightColor || '#ffffff';

    const hoverProgressRefs = useRef({ back: 0, menu: 0, email: 0, linkedin: 0, github: 0 });

    const [delayedFocus, setDelayedFocus] = useState(false);
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedFocus(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedFocus(false);
            setHoveredButton(null);
            document.body.style.cursor = 'auto';
        }
    }, [isFocused]);

    const { renderedFigure, transitionOpacity } = useFigureTransition(delayedFocus ? 'ui' : 'eye', 0);

    const targetPosRef = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 30) return;
        }

        const dt = delta;

        // Smooth Button Hover Animations
        if (isFocused && screenTextureRef.current) {
            hoverProgressRefs.current.back = updateButtonHoverAnimation(screenTextureRef.current, 'btnBack', hoveredButton === 'back', dt * 10);
            hoverProgressRefs.current.menu = updateButtonHoverAnimation(screenTextureRef.current, 'btnMenu', hoveredButton === 'menu', dt * 10);
            hoverProgressRefs.current.email = updateButtonHoverAnimation(screenTextureRef.current, 'lnkEmail', hoveredButton === 'link_email', dt * 10);
            hoverProgressRefs.current.linkedin = updateButtonHoverAnimation(screenTextureRef.current, 'lnkLinkedin', hoveredButton === 'link_linkedin', dt * 10);
            hoverProgressRefs.current.github = updateButtonHoverAnimation(screenTextureRef.current, 'lnkGithub', hoveredButton === 'link_github', dt * 10);
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

            // Sensitivity config
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

            // Blinking logic
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

                // Cache Gradients
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
                if (cache.backlight) {
                    ctx.fillStyle = cache.backlight;
                    ctx.fillRect(0, 0, w, h);
                }
                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);

                const opacityVal = transitionOpacity.current;
                const steppedOpacity = Math.floor(opacityVal * 10) / 10;

                // 1. IDLE EYE STATE
                if (renderedFigure === 'eye') {
                    ctx.save();
                    ctx.globalAlpha = steppedOpacity;

                    const scleraMaxOffsetX = 100;
                    const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                    const effectiveScleraY = -currentLookAt.current.y * 100;

                    ctx.translate(w / 2 + scleraX, h / 2 + effectiveScleraY);

                    // Mobile has specific scale factors logic
                    const scaleEye = 0.6;
                    ctx.scale(scaleEye, blink.openness * scaleEye);

                    drawPixelEye(
                        ctx,
                        { x: normalizedMouse.current.x, y: normalizedMouse.current.y },
                        activeTheme.irisColor,
                        15, // Mobile defined lookRange
                        activeTheme.scleraColor || '#ffffff',
                        true // isHologram for Mobile
                    );
                    ctx.restore();
                }

                // 2. FOCUSED UI STATE
                if (renderedFigure === 'ui' && steppedOpacity > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = steppedOpacity;
                    ctx.translate(w / 2, h / 2);
                    if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }

                    // -- Title Layer --
                    ctx.save();
                    const titleJitter = Math.sin(state.clock.elapsedTime * 15) > 0.8 ? (Math.random() - 0.5) * 0.2 : 0;
                    const titleAlpha = Math.max(0, Math.min(1.0, steppedOpacity * 1.5 + titleJitter));
                    ctx.globalAlpha = titleAlpha;
                    const jx = (Math.random() - 0.5) * 4;
                    const jy = (Math.random() - 0.5) * 4;
                    ctx.font = '900 50px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const textY = -h / 2 + textYOffset;

                    const shadow1 = activeTheme.textShadow1 || 'rgba(255, 0, 0, 0.5)';
                    const shadow2 = activeTheme.textShadow2 || 'rgba(0, 255, 255, 0.5)';

                    ctx.fillStyle = activeTheme.textShadow1 ? shadow1 + '80' : shadow1;
                    ctx.fillText(focusedText, jx + 3, textY + jy);

                    ctx.fillStyle = activeTheme.textShadow2 ? shadow2 + '80' : shadow2;
                    ctx.fillText(focusedText, jx - 3, textY + jy);

                    ctx.fillStyle = buttonColor;
                    if (Math.random() > 0.1) ctx.fillText(focusedText, jx, textY + jy);
                    ctx.restore();

                    const btnJitterBase = Math.sin(state.clock.elapsedTime * 12 + 5) > 0.8 ? (Math.random() - 0.5) * 0.3 : 0;
                    const btnBaseAlpha = Math.max(0, Math.min(1, steppedOpacity + btnJitterBase));

                    // -- Content Links Layer --
                    ctx.font = 'bold 28px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const baseTextColor = activeTheme.textColor || '#ffffff';
                    const linkSpacing = 110;
                    const startY = -70;

                    CONTACT_LINKS.forEach((link, idx) => {
                        const linkY = startY + (idx * linkSpacing);
                        const progress = hoverProgressRefs.current[link.id as 'email' | 'linkedin' | 'github'];

                        if (progress > 0) {
                            ctx.fillStyle = buttonColor;
                            ctx.fillText(`> ${link.label} <`, 0, linkY - 14);
                            ctx.fillText(link.value, 0, linkY + 14);
                        } else {
                            ctx.fillStyle = baseTextColor;
                            ctx.fillText(link.label, 0, linkY - 14);
                            ctx.globalAlpha = btnBaseAlpha * 0.6;
                            ctx.fillText(link.value, 0, linkY + 14);
                            ctx.globalAlpha = btnBaseAlpha;
                        }
                    });

                    // -- Buttons Layer --
                    ctx.globalAlpha = btnBaseAlpha;

                    if (showBackButton) {
                        drawBackButton(ctx, backButtonPosition.x, backButtonPosition.y, hoverProgressRefs.current.back, buttonColor);
                    }
                    if (showMenuButton) {
                        drawMenuButton(ctx, menuButtonPosition.x, menuButtonPosition.y, hoverProgressRefs.current.menu, buttonColor);
                    }

                    ctx.restore();
                }

                // Vignette goes on top
                if (cache.vignette) {
                    ctx.fillStyle = cache.vignette;
                    ctx.fillRect(0, 0, w, h);
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
                        if (!isFocused || renderedFigure !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            const hit = checkContactButtonHover(
                                e.uv, isFocused, invertY,
                                showBackButton, showMenuButton,
                                backButtonPosition, menuButtonPosition
                            );
                            if (hit !== hoveredButton) setHoveredButton(hit);
                            document.body.style.cursor = hit ? 'pointer' : 'auto';
                        }
                    }}
                    onPointerOut={() => {
                        if (!isFocused) return;
                        setHoveredButton(null);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused || renderedFigure !== 'ui') return;
                        if (e.object.userData.isScreen && e.uv) {
                            const hit = checkContactButtonHover(
                                e.uv, isFocused, invertY,
                                showBackButton, showMenuButton,
                                backButtonPosition, menuButtonPosition
                            );
                            if (!hit) return;
                            e.stopPropagation();

                            if (hit === 'back' && onBackClick) onBackClick();
                            else if (hit === 'menu' && onMenuClick) onMenuClick();
                            else if (hit === 'link_email') window.open('mailto:aerocha56@gmail.com');
                            else if (hit === 'link_linkedin') window.open('https://linkedin.com/in/keletch', '_blank');
                            else if (hit === 'link_github') window.open('https://github.com/keletch', '_blank');
                        }
                    }}
                />
            )}
        </group>
    );
}
