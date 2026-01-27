import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { TelevisionProps, THEMES } from './Types';
import { drawPixelEye, drawPlayStopButton, drawBackButton, drawMenuButton, drawButtonShockwave } from './Helpers';

const BUTTON_CONFIG = {
    PLAY: { x: -200, y: 190, radius: 40, width: 140, height: 45 },
    BACK: { x: 200, y: 190, radius: 40 },
    MENU: { x: 0, y: 190, radius: 40 }
};

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
    textYOffset = 60,
    showStartButton = false,
    startButtonPosition,
    onStartClick,
    showBackButton = false,
    onBackClick,
    backButtonPosition,
    showMenuButton = false,
    menuButtonPosition,
    onMenuClick
}: TelevisionProps) {
    const groupRef = useRef<THREE.Group>(null);
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

    // Generic Figure Transition (Always null for generic TV essentially, unless updated later)
    // We keep it to support basic transitions if we add generic figures back, or for eyes if we wanted to transition eyes (but eyes are currently background)
    // But currently currentFigureProp is effectively null.
    // For now, we can remove useFigureTransition if we only draw Eyes directly.
    // But let's keep it minimal if we decide to add "Channel Changing" static later.
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

    const checkButtonHover = (uv: THREE.Vector2): 'play' | 'back' | 'menu' | null => {
        if (!isFocused) return null;

        let px = uv.x * 512;
        let py = (1 - uv.y) * 512;

        let dx = px - 256;
        let dy = py - 256;

        if (invertY) {
            dy = -dy;
        }

        if (showStartButton) {
            const btnX = startButtonPosition ? startButtonPosition.x : BUTTON_CONFIG.PLAY.x;
            const btnY = startButtonPosition ? startButtonPosition.y : BUTTON_CONFIG.PLAY.y;
            const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distPlay < BUTTON_CONFIG.PLAY.radius) return 'play';
        }

        if (showBackButton) {
            const btnX = backButtonPosition ? backButtonPosition.x : BUTTON_CONFIG.BACK.x;
            const btnY = backButtonPosition ? backButtonPosition.y : BUTTON_CONFIG.BACK.y;
            const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distBack < BUTTON_CONFIG.BACK.radius) return 'back';
        }

        if (showMenuButton) {
            const btnX = menuButtonPosition ? menuButtonPosition.x : BUTTON_CONFIG.MENU.x;
            const btnY = menuButtonPosition ? menuButtonPosition.y : BUTTON_CONFIG.MENU.y;
            const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
            if (distMenu < BUTTON_CONFIG.MENU.radius) return 'menu';
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
        if (renderAccumulator.current < FRAME_DURATION) {
            return;
        }

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

                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);

                const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                backlight.addColorStop(0, activeTheme.glowCenter);
                backlight.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = backlight;
                ctx.fillRect(0, 0, w, h);

                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);


                const drawContent = () => {
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

                    let irisColor = '#5090ff';
                    if (theme === 'toxic') irisColor = '#00bb33';
                    if (theme === 'blood') irisColor = '#cc0000';
                    if (theme === 'sulfur') irisColor = '#d4c264';
                    if (theme === 'toon') irisColor = '#dcdcdc';
                    if (theme === 'mobile') irisColor = '#0088ff';

                    // Generic lookup range
                    const customLookRange = (theme === 'toxic') ? 32
                        : (theme === 'mobile') ? 15
                            : 26;
                    const isHologram = theme === 'mobile';
                    const scleraColor = (theme === 'mobile') ? activeTheme.scleraColor : '#ffffff';

                    drawPixelEye(
                        ctx,
                        normalizedMouse.current,
                        irisColor,
                        customLookRange,
                        scleraColor,
                        isHologram
                    );

                    ctx.restore();
                };

                drawContent();

                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');

                let vignetteColor = 'rgba(0,0,0,1.0)';
                if (theme === 'toxic') vignetteColor = 'rgba(0, 10, 0, 0.95)';
                if (theme === 'blood') vignetteColor = 'rgba(20, 0, 0, 0.95)';
                if (theme === 'sulfur') vignetteColor = 'rgba(20, 20, 0, 0.95)';
                if (theme === 'toon') vignetteColor = 'rgba(5, 5, 5, 0.98)';
                if (theme === 'classic') vignetteColor = 'rgba(0, 5, 20, 0.95)';

                gradient.addColorStop(1, vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);

                let glowColor = 'rgba(20, 40, 100, 0.1)';
                if (theme === 'blood') glowColor = 'rgba(150, 0, 0, 0.15)';
                if (theme === 'sulfur') glowColor = 'rgba(200, 200, 50, 0.12)';
                if (theme === 'mobile') glowColor = 'rgba(0, 100, 255, 0.2)';

                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);

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

                if (isFocused) {
                    ctx.save();
                    ctx.translate(w / 2, h / 2);
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1);
                    }

                    if (showStartButton) {
                        const btnX = startButtonPosition ? startButtonPosition.x : BUTTON_CONFIG.PLAY.x;
                        const btnY = startButtonPosition ? startButtonPosition.y : BUTTON_CONFIG.PLAY.y;
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

                        // Always playing/stopped (no morphed square)
                        drawButtonShockwave(ctx, btnX, btnY, hoverProgress, state.clock.elapsedTime, '#ffffff');
                        drawPlayStopButton(ctx, btnX, btnY, hoverProgress, 0, '#ffffff');
                    }

                    if (showBackButton) {
                        const btnBackX = backButtonPosition ? backButtonPosition.x : BUTTON_CONFIG.BACK.x;
                        const btnBackY = backButtonPosition ? backButtonPosition.y : BUTTON_CONFIG.BACK.y;
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

                        drawBackButton(ctx, btnBackX, btnBackY, hoverProgressBack, '#ffffff');
                    }

                    if (showMenuButton) {
                        const btnMenuX = menuButtonPosition ? menuButtonPosition.x : BUTTON_CONFIG.MENU.x;
                        const btnMenuY = menuButtonPosition ? menuButtonPosition.y : BUTTON_CONFIG.MENU.y;
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

                        drawMenuButton(ctx, btnMenuX, btnMenuY, hoverProgressMenu, '#ffffff');
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

                            if (newPlayHover !== startButtonHovered) {
                                setStartButtonHovered(newPlayHover);
                            }
                            if (newBackHover !== backButtonHovered) {
                                setBackButtonHovered(newBackHover);
                            }
                            if (newMenuHover !== menuButtonHovered) {
                                setMenuButtonHovered(newMenuHover);
                            }

                            document.body.style.cursor = (newPlayHover || newBackHover || newMenuHover) ? 'pointer' : 'auto';
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
                                if (onStartClick) {
                                    onStartClick();
                                }
                            } else if (buttonHit === 'back' && onBackClick) {
                                e.stopPropagation();
                                onBackClick();
                            } else if (buttonHit === 'menu' && onMenuClick) {
                                e.stopPropagation();
                                onMenuClick();
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}


