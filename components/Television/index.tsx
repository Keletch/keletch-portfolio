import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { TelevisionProps, THEMES } from './Types';
import { drawPixelEye } from './Helpers';
import { useFigureTransition } from '@/hooks/useFigureTransition';
import { useTVModel } from '@/hooks/useTVModel';

const DEFAULT_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'monitor', 'glass', 'vidrio', 'cristal', 'tube', 'lcdscreen', 'lcd_screen', 'redtvscreen', 'dirtytvscreen', 'tipicaltvscreen', 'toontvscreen', 'toontv_screen'];

export default function Television({
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
    textYOffset = 60
}: TelevisionProps) {
    const groupRef = useRef<THREE.Group>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

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

    const activeTheme = THEMES[theme] || THEMES.classic;



    useFrame((state, delta) => {
        if (groupRef.current) {
            const dist = state.camera.position.distanceTo(groupRef.current.position);
            if (dist > 25) return; // Only cull if very far away
        }

        const dt = delta;

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

            if (uvRotation !== 0) {
                if (Math.abs(uvRotation - Math.PI / 2) < 0.01) {
                    const temp = finalX; finalX = -finalY; finalY = temp;
                } else if (Math.abs(uvRotation + Math.PI / 2) < 0.01) {
                    const temp = finalX; finalX = finalY; finalY = -temp;
                } else {
                    const cosR = Math.cos(-uvRotation);
                    const sinR = Math.sin(-uvRotation);
                    const rotatedX = finalX * cosR - finalY * sinR;
                    const rotatedY = finalX * sinR + finalY * cosR;
                    finalX = rotatedX;
                    finalY = rotatedY;
                }
            }

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

                // Optimization: Cache gradients
                if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                const cache = screenTextureRef.current.userData;
                const needsUpdate = cache.w !== w || cache.h !== h || cache.theme !== theme;

                if (needsUpdate) {
                    cache.w = w;
                    cache.h = h;
                    cache.theme = theme;

                    // 1. Backlight
                    const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                    backlight.addColorStop(0, activeTheme.glowCenter);
                    backlight.addColorStop(1, 'rgba(0,0,0,0)');
                    cache.backlight = backlight;

                    // 2. Vignette
                    const vignette = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                    vignette.addColorStop(0, 'rgba(0,0,0,0)');
                    vignette.addColorStop(0.5, 'rgba(0,0,0,0.1)');

                    const vignetteColor = activeTheme.vignetteColor;
                    vignette.addColorStop(1, vignetteColor);
                    cache.vignette = vignette;

                }

                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);

                if (cache.backlight) {
                    ctx.fillStyle = cache.backlight;
                    ctx.fillRect(0, 0, w, h);
                }

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
                if (theme === 'mobile') scaleEye = 0.6;

                let geoCorrectionX = 1.0;
                if (theme === 'toxic' && screenAspect.current > 1.2) {
                    geoCorrectionX = 1 / (screenAspect.current * 0.85);
                }

                ctx.scale(geoCorrectionX * scaleEye, blink.openness * scaleEye);

                const irisColor = activeTheme.irisColor;

                // Generic lookup range
                const customLookRange = (theme === 'toxic') ? 32
                    : (theme === 'mobile') ? 15
                        : 26;
                const isHologram = theme === 'mobile' || theme === 'hacker' || theme === 'holo';
                const scleraColor = activeTheme.scleraColor || '#ffffff';

                drawPixelEye(
                    ctx,
                    normalizedMouse.current,
                    irisColor,
                    customLookRange,
                    scleraColor,
                    isHologram
                );

                ctx.restore();
                // Optimization: Use cached Vignette and Glow
                if (cache.vignette) {
                    ctx.fillStyle = cache.vignette;
                    ctx.fillRect(0, 0, w, h);
                }


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


            }

            screenTextureRef.current.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            {clonedModel && (
                <primitive object={clonedModel} />
            )}
        </group>
    );
}


