import { useRef, useEffect, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SettingsProps, SETTINGS_BUTTON_CONFIG } from './SettingsTypes';
import { THEMES } from '../Types';
import { drawPixelEye } from '../Helpers';
import { drawBackButton, drawMenuButton } from './SettingsHelpers';
import { useTVModel } from '@/hooks/useTVModel';
import { updateButtonHoverAnimation } from '../SharedHelpers';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useSettingsStore } from '@/components/store/useSettingsStore';

const SETTINGS_ROWS = [
    { type: 'header', label: '--- VISUAL ---' },
    { id: 'theme', label: 'THEME', type: 'setting' },
    { id: 'curve', label: 'CURVATURE', type: 'setting' },
    { id: 'vignette', label: 'VIGNETTE', type: 'setting' },
    { id: 'scanline', label: 'SCANLINE OPACITY', type: 'setting' },
    { id: 'scanlineCount', label: 'SCANLINE COUNT', type: 'setting' },
    { id: 'noise', label: 'NOISE', type: 'setting' },
    { id: 'blur', label: 'VHS BLUR', type: 'setting' },
    { id: 'aberration', label: 'ABERRATION', type: 'setting' },
    { id: 'barrel', label: 'BARREL SCANLINE', type: 'setting' },
    { type: 'header', label: '--- AUDIO ---' },
    { id: 'musicVolume', label: 'MUSIC VOLUME', type: 'setting' },
    { id: 'bubblesVolume', label: 'BUBBLES VOLUME', type: 'setting' },
    { type: 'header', label: '--- ENVIRONMENT ---' },
    { id: 'ambient', label: 'AMBIENT LIGHT', type: 'setting' },
    { type: 'header', label: '--- PHYSICS ---' },
    { id: 'gravity', label: 'GRAVITY', type: 'setting' },
    { type: 'header', label: '--- CAMERA ---' },
    { id: 'fov', label: 'CAMERA FOV', type: 'setting' }
] as const;

const ROW_HEIGHT = 50;
const VISIBLE_ROWS = 6.5;
const MENU_HEIGHT = SETTINGS_ROWS.length * ROW_HEIGHT;
const VIEWPORT_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT;

type SettingRow = typeof SETTINGS_ROWS[number];
type SettingId = Extract<SettingRow, { id: string }>['id'];
type ActionType = 'inc' | 'dec' | 'slider';
type HitResult = 'back' | 'menu' | `${SettingId}_${ActionType}` | null;

const DEFAULT_SCREEN_NAMES = ['toonTVScreen', 'screen', 'toontvscreen'];

export default function SettingsTV({
    modelPath,
    screenNames = DEFAULT_SCREEN_NAMES,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = 0,
    theme = 'toon',
    invertY = false,
    gazeOffset = { x: 0, y: 0 },
    uvRotation = 0,
    modelYOffset = -0.3,
    focusedText = 'SETTINGS',
    isFocused = false,
    textYOffset = 50,
    showBackButton = false,
    onBackClick,
    backButtonPosition = SETTINGS_BUTTON_CONFIG.BACK,
    showMenuButton = false,
    menuButtonPosition = SETTINGS_BUTTON_CONFIG.MENU,
    onMenuClick
}: SettingsProps) {
    const SETTINGS_BOUNDS: Record<string, [number, number]> = {
        curve: [2.0, 10.0],
        scanline: [0.0, 1.0],
        noise: [0.0, 1.0],
        aberration: [0.0, 0.05],
        vignette: [0.1, 1.0],
        scanlineCount: [100, 2000],
        blur: [0.0, 0.003],
        ambient: [0.0, 2.0],
        gravity: [-20.0, 0.0],
        fov: [15, 75],
        musicVolume: [0.0, 2.5],
        bubblesVolume: [0.0, 2.5]
    };

    const activeTheme = THEMES[theme as keyof typeof THEMES] || THEMES.toon;
    const textColor = activeTheme.textColor || '#ffffff';
    const highlightColor = activeTheme.highlightColor || '#00ffcc';
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

    const settings = useSettingsStore();

    const [hoveredButton, setHoveredButton] = useState<HitResult>(null);
    const activeSliderRef = useRef<SettingId | null>(null);
    const scrollYRef = useRef(0);
    const targetScrollYRef = useRef(0);

    const { clonedModel, screenTextureRef, screenMeshRef } = useTVModel({
        modelPath,
        screenNames,
        rotationX,
        modelYOffset,
        uvRotation
    });

    const blinkState = useRef({
        isBlinking: false, openness: 1.0, nextBlinkTime: 0, blinkDuration: 0.15, blinkTimer: 0
    });

    const hoverProgressRefs = useRef({ back: 0, menu: 0 });

    const [delayedFocus, setDelayedFocus] = useState(false);
    useEffect(() => {
        if (isFocused) {
            const t = setTimeout(() => setDelayedFocus(true), 900);
            return () => clearTimeout(t);
        } else {
            setDelayedFocus(false);
            setHoveredButton(null);
        }
    }, [isFocused]);

    const { renderedFigure, transitionOpacity } = useFigureTransition(delayedFocus ? 'settings' : 'eye', 0);

    const checkButtonHover = (uv: THREE.Vector2): HitResult => {
        if (!isFocused || renderedFigure !== 'settings') return null;

        const px = uv.x * 512;
        const py = (1 - uv.y) * 512;
        const dx = px - 256;
        let dy = py - 256;

        if (invertY) dy = -dy;

        if (showBackButton) {
            const dist = Math.sqrt(Math.pow(dx - backButtonPosition.x, 2) + Math.pow(dy - backButtonPosition.y, 2));
            if (dist < SETTINGS_BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const dist = Math.sqrt(Math.pow(dx - menuButtonPosition.x, 2) + Math.pow(dy - menuButtonPosition.y, 2));
            if (dist < SETTINGS_BUTTON_CONFIG.MENU.radius) return 'menu';
        }

        // Check rows
        const scrollY = scrollYRef.current;
        const startY = -VIEWPORT_HEIGHT / 2 + 30;

        for (let i = 0; i < SETTINGS_ROWS.length; i++) {
            const row = SETTINGS_ROWS[i];
            if (row.type === 'header') continue;

            const rowY = startY + (i * ROW_HEIGHT) - scrollY;

            // Only hittable if within viewport
            if (rowY < -VIEWPORT_HEIGHT / 2 || rowY > VIEWPORT_HEIGHT / 2 + 20) continue;

            const controlsX = 130;

            // Theme still uses arrows
            if (row.id === 'theme') {
                if (Math.abs(dx - (controlsX - 60)) < 30 && Math.abs(dy - rowY) < 20) return `${row.id}_dec` as const;
                if (Math.abs(dx - (controlsX + 60)) < 30 && Math.abs(dy - rowY) < 20) return `${row.id}_inc` as const;
                continue;
            }

            // Slider area
            if (row.id !== 'barrel') {
                if (Math.abs(dx - controlsX) < 80 && Math.abs(dy - rowY) < 20) return `${row.id}_slider` as const;
            } else {
                // Toggle barrel
                if (Math.abs(dx - controlsX) < 40 && Math.abs(dy - rowY) < 20) return `${row.id}_inc` as const;
            }
        }

        return null;
    };

    const targetPosRef = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 30) return;
        }

        const dt = delta;

        // Smooth scroll
        scrollYRef.current = THREE.MathUtils.lerp(scrollYRef.current, targetScrollYRef.current, dt * 8);

        if (isFocused && screenTextureRef.current) {
            hoverProgressRefs.current.back = updateButtonHoverAnimation(screenTextureRef.current, 'btnBack', hoveredButton === 'back', dt * 10);
            hoverProgressRefs.current.menu = updateButtonHoverAnimation(screenTextureRef.current, 'btnMenu', hoveredButton === 'menu', dt * 10);
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

            const finalX = (gazeX * 5.0) + gazeOffset.x;
            const finalY = (invertY ? -gazeY : gazeY) * 5.0 + gazeOffset.y;

            normalizedMouse.current.x = Math.max(-1, Math.min(1, finalX));
            normalizedMouse.current.y = Math.max(-1, Math.min(1, finalY));

            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');
            const speed = 2.0 * dt;
            currentLookAt.current.x += (normalizedMouse.current.x - currentLookAt.current.x) * speed;
            currentLookAt.current.y += (normalizedMouse.current.y - currentLookAt.current.y) * speed;

            // Slider dragging (logic removed to fix unused variables error)

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
                ctx.fillStyle = activeTheme.bgColor; ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = activeTheme.baseColor; ctx.fillRect(0, 0, w, h);

                const opacityVal = transitionOpacity.current;
                const steppedOpacity = Math.floor(opacityVal * 10) / 10;

                if (renderedFigure === 'eye') {
                    ctx.save();
                    ctx.globalAlpha = steppedOpacity;
                    ctx.translate(w / 2 + currentLookAt.current.x * 100, h / 2 - currentLookAt.current.y * 100);
                    ctx.scale(1.0, blink.openness);
                    drawPixelEye(ctx, { x: normalizedMouse.current.x, y: normalizedMouse.current.y }, activeTheme.irisColor, activeTheme.lookRange, activeTheme.scleraColor, activeTheme.isHologram);
                    ctx.restore();
                }

                if (renderedFigure === 'settings') {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) { ctx.rotate(Math.PI); ctx.scale(-1, 1); }
                    ctx.globalAlpha = steppedOpacity;

                    // TITLE
                    const buttonColor = activeTheme.highlightColor || '#ffffff';
                    const time = state.clock.elapsedTime;
                    const titleJitter = Math.sin(time * 15) > 0.8 ? (Math.random() - 0.5) * 0.2 : 0;
                    
                    // Increased title opacity with flicker
                    const titleAlpha = Math.max(0, Math.min(1.0, steppedOpacity * 1.5 + titleJitter));
                    ctx.globalAlpha = titleAlpha;

                    const jitterX = (Math.random() - 0.5) * 4;
                    const jitterY = (Math.random() - 0.5) * 4;

                    ctx.font = '900 44px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const titleY = -h / 2 + textYOffset - 10;

                    ctx.fillStyle = activeTheme.textShadow1 || 'rgba(255, 0, 0, 0.5)';
                    ctx.fillText(focusedText, jitterX + 3, titleY + jitterY + 3);
                    ctx.fillStyle = activeTheme.textShadow2 || 'rgba(0, 255, 255, 0.5)';
                    ctx.fillText(focusedText, jitterX - 3, titleY + jitterY - 3);
                    
                    ctx.fillStyle = buttonColor;
                    if (Math.random() > 0.1) {
                        ctx.fillText(focusedText, jitterX, titleY + jitterY);
                    }

                    // VERTICAL CLIPPING FOR ROWS
                    const viewportStartY = -VIEWPORT_HEIGHT / 2 + 20;
                    const viewportEndY = VIEWPORT_HEIGHT / 2 + 20;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(-w / 2, viewportStartY - 10, w, VIEWPORT_HEIGHT + 20);
                    ctx.clip();

                    const scrollY = scrollYRef.current;
                    ctx.font = '900 18px "Courier New", monospace';
                    ctx.textBaseline = 'middle';

                    SETTINGS_ROWS.forEach((row, i) => {
                        const rowY = viewportStartY + 10 + (i * ROW_HEIGHT) - scrollY;
                        if (rowY < viewportStartY - ROW_HEIGHT || rowY > viewportEndY + ROW_HEIGHT) return;

                        if (row.type === 'header') {
                            ctx.textAlign = 'center';
                            ctx.fillStyle = highlightColor;
                            ctx.font = '900 20px "Courier New", monospace';
                            ctx.fillText(row.label, 0, rowY);
                            ctx.font = '900 18px "Courier New", monospace';
                            return;
                        }

                        // Selection highlight
                        const isHovered = hoveredButton?.startsWith(row.id);
                        if (isHovered) {
                            ctx.fillStyle = (activeTheme.textColor || '#ffffff') + '15';
                            ctx.fillRect(-220, rowY - ROW_HEIGHT / 2 + 5, 440, ROW_HEIGHT - 10);
                        }

                        // Label
                        ctx.textAlign = 'left';
                        ctx.fillStyle = textColor;
                        ctx.fillText(row.label, -200, rowY);

                        // Control
                        const controlsX = 130;
                        const sliderWidth = 120;

                        if (row.id === 'theme') {
                            const val = settings.theme.toUpperCase();
                            ctx.textAlign = 'center';
                            ctx.fillText(val, controlsX, rowY);
                            ctx.fillStyle = hoveredButton === `${row.id}_dec` ? highlightColor : textColor;
                            ctx.fillText('<', controlsX - 60, rowY);
                            ctx.fillStyle = hoveredButton === `${row.id}_inc` ? highlightColor : textColor;
                            ctx.fillText('>', controlsX + 60, rowY);
                        } else if (row.id === 'barrel') {
                            const val = settings.barrelScanline ? 'ON' : 'OFF';
                            ctx.textAlign = 'center';
                            ctx.fillStyle = hoveredButton?.startsWith(row.id) ? highlightColor : textColor;
                            ctx.fillText(val, controlsX, rowY);
                        } else {
                            // Slider
                            const bounds = SETTINGS_BOUNDS[row.id];
                            if (bounds) {
                                const [min, max] = bounds;
                                let currentVal = 0;
                                if (row.id === 'curve') currentVal = settings.curveIntensity;
                                else if (row.id === 'vignette') currentVal = settings.vignetteStrength;
                                else if (row.id === 'scanline') currentVal = settings.scanlineOpacity;
                                else if (row.id === 'scanlineCount') currentVal = settings.scanlineCount;
                                else if (row.id === 'noise') currentVal = settings.noiseOpacity;
                                else if (row.id === 'blur') currentVal = settings.blurSize;
                                else if (row.id === 'aberration') currentVal = settings.aberrationOffset;
                                else if (row.id === 'musicVolume') currentVal = settings.musicVolume;
                                else if (row.id === 'bubblesVolume') currentVal = settings.bubblesVolume;
                                else if (row.id === 'ambient') currentVal = settings.ambientIntensity;
                                else if (row.id === 'gravity') currentVal = settings.gravityY;
                                else if (row.id === 'fov') currentVal = settings.cameraFOV;

                                const range = max - min;
                                const progress = (currentVal - min) / (range || 1);
                                const trackStartX = controlsX - sliderWidth / 2;
                                const thumbX = trackStartX + (progress * sliderWidth);

                                // Track
                                ctx.fillStyle = textColor + '44';
                                ctx.fillRect(trackStartX, rowY - 2, sliderWidth, 4);

                                // Thumb
                                ctx.fillStyle = hoveredButton === `${row.id}_slider` ? highlightColor : textColor;
                                ctx.fillRect(thumbX - 6, rowY - 10, 12, 20);

                                // Value display (mini)
                                ctx.font = '900 12px "Courier New", monospace';
                                ctx.textAlign = 'left';
                                let displayVal = currentVal.toFixed(row.id === 'blur' || row.id === 'aberration' ? 4 : 1);
                                if (row.id === 'musicVolume' || row.id === 'bubblesVolume') displayVal = Math.round(currentVal * 100) + '%';
                                if (row.id === 'scanlineCount' || row.id === 'fov') displayVal = Math.round(currentVal).toString();
                                ctx.fillText(displayVal, controlsX + sliderWidth / 2 + 15, rowY);
                                ctx.font = '900 18px "Courier New", monospace';
                            }
                        }
                    });
                    ctx.restore();

                    // SCROLLBAR
                    const scrollPercent = targetScrollYRef.current / (MENU_HEIGHT - VIEWPORT_HEIGHT);
                    const barHeight = VIEWPORT_HEIGHT * (VIEWPORT_HEIGHT / MENU_HEIGHT);
                    const barY = viewportStartY + scrollPercent * (VIEWPORT_HEIGHT - barHeight);
                    ctx.fillStyle = textColor + '33';
                    ctx.fillRect(235, viewportStartY, 6, VIEWPORT_HEIGHT);
                    ctx.fillStyle = highlightColor;
                    ctx.fillRect(235, barY, 6, barHeight);

                    if (showBackButton) drawBackButton(ctx, backButtonPosition.x, backButtonPosition.y, hoverProgressRefs.current.back, buttonColor);
                    if (showMenuButton) drawMenuButton(ctx, menuButtonPosition.x, menuButtonPosition.y, hoverProgressRefs.current.menu, buttonColor);

                    ctx.restore();
                }
            }
            screenTextureRef.current.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}
            onPointerOut={() => { setHoveredButton(null); document.body.style.cursor = 'auto'; }}
            onWheel={(e) => {
                if (!isFocused) return;
                e.stopPropagation();
                const maxScroll = Math.max(0, MENU_HEIGHT - VIEWPORT_HEIGHT);
                targetScrollYRef.current = Math.max(0, Math.min(maxScroll, targetScrollYRef.current + e.deltaY * 0.5));
            }}
        >
            {clonedModel && (
                <primitive
                    object={clonedModel}
                    onPointerMove={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused) return;
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            const buttonHit = checkButtonHover(e.uv);
                            if (buttonHit !== hoveredButton) setHoveredButton(buttonHit);
                            document.body.style.cursor = buttonHit ? 'pointer' : 'auto';

                            if (activeSliderRef.current) {
                                const px = e.uv.x * 512;
                                const controlsX = 256 + 130;
                                const sliderWidth = 120;
                                const trackStartX = controlsX - sliderWidth / 2;
                                const progress = Math.max(0, Math.min(1, (px - trackStartX) / sliderWidth));
                                const bounds = SETTINGS_BOUNDS[activeSliderRef.current];
                                if (bounds) {
                                    const val = bounds[0] + (bounds[1] - bounds[0]) * progress;
                                    settings.setNumericSetting(activeSliderRef.current, val);
                                }
                            }
                        }
                    }}
                    onPointerDown={(e: ThreeEvent<MouseEvent>) => {
                        if (!isFocused) return;
                        if (e.object.userData.isScreen && e.uv) {
                            const hit = checkButtonHover(e.uv);
                            if (hit && hit.endsWith('_slider')) {
                                e.stopPropagation();
                                const rowId = hit.replace('_slider', '') as SettingId;
                                activeSliderRef.current = rowId;

                                // Direct jump on click
                                const px = e.uv.x * 512;
                                const controlsX = 256 + 130;
                                const sliderWidth = 120;
                                const trackStartX = controlsX - sliderWidth / 2;
                                const progress = Math.max(0, Math.min(1, (px - trackStartX) / sliderWidth));
                                const bounds = SETTINGS_BOUNDS[rowId];
                                if (bounds) {
                                    const val = bounds[0] + (bounds[1] - bounds[0]) * progress;
                                    settings.setNumericSetting(rowId, val);
                                }
                            }
                        }
                    }}
                    onPointerUp={() => { activeSliderRef.current = null; }}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                        if (e.object.userData.isScreen && e.uv) {
                            const hit = checkButtonHover(e.uv);
                            if (!hit) return;
                            if (hit.endsWith('_slider')) { e.stopPropagation(); return; }
                            e.stopPropagation();
                            if (hit === 'back' && onBackClick) onBackClick();
                            else if (hit === 'menu' && onMenuClick) onMenuClick();
                            else if (hit === 'theme_inc') settings.nextTheme();
                            else if (hit === 'theme_dec') settings.prevTheme();
                            else if (hit === 'barrel_inc' || hit === 'barrel_dec') settings.toggleBarrel();
                        }
                    }}
                />
            )}
        </group>
    );
}
