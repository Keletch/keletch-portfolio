'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TelevisionProps {
    modelPath: string;
    screenNames?: string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    rotationX?: number;
    theme?: 'classic' | 'toxic' | 'blood' | 'void' | 'sulfur' | 'toon' | 'sonar' | 'mobile'; // 'mobile' is Nokia Blue
    invertY?: boolean; // Invertir eje Y si el modelo tiene UVs invertidas
    gazeOffset?: { x: number; y: number }; // Offset manual para calibración
    uvRotation?: number; // Rotación de la textura en radianes (ej: Math.PI/4 para 45°)
    modelYOffset?: number; // Offset vertical del modelo dentro del grupo
    focusedText?: string;
    isFocused?: boolean;
    textYOffset?: number;
    showStartButton?: boolean;
    onStartClick?: () => void;
}

const THEMES = {
    classic: {
        bgColor: '#000515',
        baseColor: 'rgba(0, 20, 100, 0.2)',
        glowCenter: 'rgba(40, 60, 255, 0.1)',
        irisColor: '#5090ff',
        lightColor: '#2040ff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 5, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    toxic: {
        bgColor: '#001a05',
        baseColor: 'rgba(0, 40, 10, 0.3)',
        glowCenter: 'rgba(0, 255, 50, 0.1)',
        irisColor: '#00bb33',
        lightColor: '#00ff44',
        lightIntensity: 8.0,
        vignetteColor: 'rgba(0, 10, 0, 0.95)',
        lookRange: 32,
        scleraColor: '#ffffff'
    },
    blood: {
        bgColor: '#200000',
        baseColor: 'rgba(60, 0, 0, 0.3)',
        glowCenter: 'rgba(255, 0, 0, 0.1)',
        irisColor: '#cc0000',
        lightColor: '#ff0000',
        lightIntensity: 8.0,
        vignetteColor: 'rgba(20, 0, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    void: {
        bgColor: '#150020',
        baseColor: 'rgba(30, 0, 40, 0.3)', // Added missing baseColor for void
        glowCenter: 'rgba(100, 0, 255, 0.1)',
        irisColor: '#9900ff',
        lightColor: '#a000ff',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(10, 0, 20, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    sulfur: {
        bgColor: '#1a1a00',
        baseColor: 'rgba(60, 60, 0, 0.3)',
        glowCenter: 'rgba(255, 255, 0, 0.08)',
        irisColor: '#d4c264',
        lightColor: '#ffee00',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(20, 20, 0, 0.95)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    toon: {
        bgColor: '#151515',
        baseColor: 'rgba(20, 20, 20, 0.3)',
        glowCenter: 'rgba(255, 255, 255, 0.05)',
        irisColor: '#dcdcdc',
        lightColor: '#ffffff',
        lightIntensity: 4.0,
        vignetteColor: 'rgba(5, 5, 5, 0.98)',
        lookRange: 26,
        scleraColor: '#ffffff'
    },
    sonar: {
        bgColor: '#001a05',
        baseColor: 'rgba(0, 60, 10, 0.3)',
        glowCenter: 'rgba(0, 255, 50, 0.15)',
        irisColor: '#00ff44',
        lightColor: '#00ff33',
        lightIntensity: 7.0,
        vignetteColor: 'rgba(0, 20, 0, 0.95)',
        lookRange: 15,
        scleraColor: 'rgba(0, 255, 50, 0.4)'
    },
    mobile: {
        bgColor: '#00051a', // Dark Blue
        baseColor: 'rgba(0, 20, 60, 0.3)', // Deep Blue Base
        glowCenter: 'rgba(0, 100, 255, 0.2)', // Nokia Blue Glow
        irisColor: '#0088ff', // Electric Blue Iris
        lightColor: '#00aaff',
        lightIntensity: 6.0,
        vignetteColor: 'rgba(0, 0, 20, 0.95)',
        lookRange: 15, // Small screen range
        scleraColor: 'rgba(0, 100, 255, 0.4)' // Digital Blue Sclera
    }
};

export default function Television({
    modelPath,
    screenNames = ['screen', 'pantalla', 'display', 'monitor', 'glass', 'vidrio', 'cristal', 'tube', 'lcdscreen', 'lcd_screen', 'redtvscreen', 'dirtytvscreen', 'tipicaltvscreen', 'toontvscreen', 'toontv_screen'],
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
    onStartClick
}: TelevisionProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene: model } = useGLTF(modelPath);
    const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const { size } = useThree();
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });   // Posición suavizada para la esclerótica
    const screenMeshRef = useRef<THREE.Mesh | null>(null); // Cache para la malla de la pantalla
    const [startButtonHovered, setStartButtonHovered] = useState(false); // Hover state for start button

    // Referencia para el canvas e id de cada instancia
    const instanceId = useRef(Math.random().toString(36).substr(2, 9));
    const screenAspect = useRef(1.0);

    // Use state instead of ref for dimensions to ensure re-render of geometry
    const [screenSize, setScreenSize] = useState<{ width: number, height: number } | null>(null);

    // Estado del parpadeo
    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0, // 1.0 = Abierto, 0.0 = Cerrado
        nextBlinkTime: 0,
        blinkDuration: 0.15, // Velocidad del parpadeo
        blinkTimer: 0
    });

    // Configuración del Tema Activo
    const activeTheme = THEMES[theme] || THEMES.classic;

    // 1. Ya NO necesitamos el listener global de mouse en useEffect
    // Eliminamos el normalizedMouse y el listener de window)

    // Configurar el modelo y encontrar la pantalla
    // 1. Clonar y configurar modelo en useMemo
    const clonedModel = useMemo(() => {
        if (!model) return null;

        const clone = model.clone();

        console.log(`🔍 ===== ANÁLISIS DEL MODELO: ${modelPath} =====`);
        let meshCount = 0;
        let screenFound = false;

        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshCount++;
                const childNameLower = child.name.toLowerCase();
                const isScreen = screenNames.some(name => childNameLower.includes(name.toLowerCase()));

                if (isScreen) {
                    screenFound = true;
                    // --- NUEVO: CALCULAR ASPECT RATIO DE LA PANTALLA ---
                    child.geometry.computeBoundingBox();
                    const box = child.geometry.boundingBox;
                    if (box) {
                        const width = box.max.x - box.min.x;
                        const height = box.max.y - box.min.y;
                        screenAspect.current = width / height;

                        // Guardar dimensiones reales
                        // Note: We can't set state in useMemo easily, but we can store it in ref or handle in useEffect
                        // However, we need state for external consumers? Or just for internal logic?
                        // For the button, we need it. But with UV interaction, we don't need physical size anymore!
                        // We only need pixel coordinates on the texture.
                        // So we can drop screenSize dependency for interaction!
                    }

                    // Crear textura desde canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.repeat.set(1, 1);
                    texture.offset.set(0, 0);
                    texture.rotation = uvRotation;
                    texture.center.set(0.5, 0.5); // Rotar desde el centro

                    screenTextureRef.current = texture;
                    // Mark this mesh as the screen for interaction checks
                    child.userData.isScreen = true;

                    // Aplicar textura a la pantalla con MeshBasicMaterial (auto-iluminado)
                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        toneMapped: false,
                        transparent: false,
                        opacity: 1,
                        side: THREE.DoubleSide,
                    });
                } else {
                    // Para el resto de la TV: LOOK PSX / CARTOON pero preservando materiales originales
                    if (child.material) {
                        const processMaterial = (mat: any) => {
                            if (mat.map) {
                                mat.map.minFilter = THREE.NearestFilter;
                                mat.map.magFilter = THREE.NearestFilter;
                                mat.map.needsUpdate = true;
                            }
                            mat.flatShading = true;
                            mat.needsUpdate = true;
                        };

                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => processMaterial(m));
                        } else {
                            processMaterial(child.material);
                        }
                    }
                }
            }
        });

        if (!screenFound) {
            console.warn(`⚠️ NO SE DETECTÓ NINGUNA PANTALLA EN ${modelPath}`);
        }

        // Aplicar transformaciones al modelo clonado
        clone.rotation.x = rotationX;
        clone.position.y = modelYOffset;

        return clone;
    }, [model, modelPath, modelYOffset, rotationX, screenNames, uvRotation]); // Dependencies

    // Effect to add the cloned model to the group
    useEffect(() => {
        if (groupRef.current && clonedModel) {
            groupRef.current.add(clonedModel);
        }
        return () => {
            if (groupRef.current && clonedModel) {
                groupRef.current.remove(clonedModel);
            }
            screenMeshRef.current = null; // Clear ref to detached mesh
        };
    }, [clonedModel]);


    // Helper: Check if UV is hitting the button
    const checkButtonHover = (uv: THREE.Vector2) => {
        if (!showStartButton) return false;

        // Canvas is 512x512
        // UV is 0..1
        // We need to match the drawing logic.
        // Drawing:
        // Center (256, 256)
        // If invertY is true, context was rotated 180 (Math.PI).
        // Button Y: 160 (relative to center).
        // Button Size: 160x50.

        // Map UV to Pixel Coordinates
        // UV (0,0) is usually Top-Left (or Bottom-Left depending on GL).
        // In ThreeJS UV (0,0) is Bottom-Left. (1,1) is Top-Right.
        // Canvas (0,0) is Top-Left.

        // Let's assume standard UV mapping for now.
        // PixelX = uv.x * 512
        // PixelY = (1 - uv.y) * 512 // Invert Y because Canvas Y is Down

        let px = uv.x * 512;
        let py = (1 - uv.y) * 512;

        // Apply transformations relative to center (256, 256)
        let dx = px - 256;
        let dy = py - 256;

        // If Inverted Y logic (from drawing):
        // Context was rotated 180.
        // Rotated 180 means: dx -> -dx, dy -> -dy.
        // Button was drawn at (0, 160) in that rotated space.
        // Or un-rotate the point.

        if (invertY) {
            dx = -dx; // Rotate 180
            dy = -dy;
        }

        // Button Shape: Pixelated Circle Play Button
        // Center(0, 160), Radius ~35px

        // Distance check from button center (0, 160)
        const dist = Math.sqrt(dx * dx + (dy - 160) * (dy - 160));
        return dist < 40; // 40px radius for comfortable hit area
    };

    // Actualizar canvas cada frame
    useFrame((state, delta) => {
        if (screenTextureRef.current && groupRef.current) {
            // --- LÓGICA DE MIRADA PRECISA ---
            // 1. Obtener el CENTRO GEOMÉTRICO de la PANTALLA
            const targetPos = new THREE.Vector3();

            if (!screenMeshRef.current) {
                groupRef.current.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const childNameLower = child.name.toLowerCase();
                        if (screenNames.some(name => childNameLower.includes(name.toLowerCase()))) {
                            screenMeshRef.current = child;
                            console.log(`📡 Pantalla vinculada a Ref: ${child.name}`);
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

            // Proyectar a NDC (-1 a 1)
            const tvScreenPos = targetPos.project(state.camera);

            // 2. Calcular vector al mouse
            const gazeX = state.mouse.x - tvScreenPos.x;
            const gazeY = state.mouse.y - tvScreenPos.y;

            // 3. Sensibilidad AGRESIVA (Revertido a 5.0 por petición del usuario)
            const sensitivity = 5.0;

            // COMPENSACIÓN DINÁMICA: 
            // Solo aplicamos compensación de velocidad a la LCD (Toxic) para que el eje Y no sea hipersensible.
            // Para las demás (CRT, Dirty, RedTV), usamos 1.0 para mantener la lógica de LowPoly.
            let aspectCompensation = 1.0;
            if (theme === 'toxic' && screenAspect.current > 1.1) {
                aspectCompensation = 1 / screenAspect.current;
            }

            // 4. Rotar el vector de mirada si existe uvRotation
            let finalX = (gazeX * sensitivity) + gazeOffset.x;
            let finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

            if (uvRotation !== 0) {
                // Para 90° (Math.PI/2), intercambiamos ejes en vez de rotar
                if (Math.abs(uvRotation - Math.PI / 2) < 0.01) {
                    // 90° horario: X_nuevo = -Y_viejo, Y_nuevo = X_viejo
                    const temp = finalX;
                    finalX = -finalY;
                    finalY = temp;
                } else if (Math.abs(uvRotation + Math.PI / 2) < 0.01) {
                    // 90° anti-horario: X_nuevo = Y_viejo, Y_nuevo = -X_viejo
                    const temp = finalX;
                    finalX = finalY;
                    finalY = -temp;
                } else {
                    // Para otros ángulos, usamos rotación estándar
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

            // --- LÓGICA DE DIBUJO EXISTENTE ---
            const canvas = screenTextureRef.current.image as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');

            // 1. Interpolación de movimiento
            const speed = 2.0 * delta;
            currentLookAt.current.x += (normalizedMouse.current.x - currentLookAt.current.x) * speed;
            currentLookAt.current.y += (normalizedMouse.current.y - currentLookAt.current.y) * speed;

            // 2. Lógica de Parpadeo
            const blink = blinkState.current;
            blink.blinkTimer += delta;

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

                // --- 1. FONDO (Configurable via THEMES) ---
                ctx.fillStyle = activeTheme.bgColor;
                ctx.fillRect(0, 0, w, h);

                // --- 1.5 BACKLIGHT GLOW ---
                const backlight = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 400);
                backlight.addColorStop(0, activeTheme.glowCenter);
                backlight.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = backlight;
                ctx.fillRect(0, 0, w, h);

                // --- 2. RUIDO / ESTÁTICA (ELIMINADO) ---
                /*
                const noiseDensity = 5000;
                const grainSize = 3;

                for (let i = 0; i < noiseDensity; i++) {
                    const x = Math.random() * w;
                    const y = Math.random() * h;
                    const brightness = Math.random();

                    if (theme === 'toxic') {
                        // Estática "Tóxica Oscura": Base azulada pero con chispas verde ácido
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(0, 150, 50, 0.3)'; // Verde vívido pero raro
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(10, 20, 40, 0.4)'; // Azul oscuro clásico
                        } else {
                            ctx.fillStyle = 'rgba(0, 10, 0, 0.5)'; // Negro verdoso
                        }
                    } else if (theme === 'blood') {
                        // Estática de Sangre (Roja)
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(60, 0, 0, 0.4)';
                        } else {
                            ctx.fillStyle = 'rgba(20, 0, 0, 0.6)';
                        }
                    } else if (theme === 'void') {
                        // Estática de Vacío (Púrpura)
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(180, 0, 255, 0.3)'; // Púrpura brillante
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(40, 0, 80, 0.4)';   // Púrpura medio
                        } else {
                            ctx.fillStyle = 'rgba(10, 0, 20, 0.6)';   // Púrpura muy oscuro
                        }
                    } else if (theme === 'sulfur') {
                        // Estática de Azufre (Amarillo deslavado)
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(212, 194, 100, 0.3)';
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(80, 80, 0, 0.4)';
                        } else {
                            ctx.fillStyle = 'rgba(30, 30, 0, 0.6)';
                        }
                    } else if (theme === 'toon') {
                        // Estática Noir (Escala de grises)
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
                        } else {
                            ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
                        }
                    } else if (theme === 'sonar') {
                        // Estática Sonar (Verde radar)
                        if (brightness > 0.8) {
                            ctx.fillStyle = 'rgba(0, 255, 50, 0.3)';
                        } else if (brightness > 0.4) {
                            ctx.fillStyle = 'rgba(0, 100, 20, 0.4)';
                        } else {
                            ctx.fillStyle = 'rgba(0, 50, 10, 0.5)';
                        }
                    } else {
                        // Estática clásica azulada
                        if (brightness > 0.5) {
                            ctx.fillStyle = 'rgba(20, 30, 60, 0.4)';
                        } else {
                            ctx.fillStyle = 'rgba(0, 5, 20, 0.5)';
                        }
                    }
                    ctx.fillRect(x, y, grainSize, grainSize);
                }
                */

                // Capa de color base para unificar (SATURACIÓN AUMENTADA)
                ctx.fillStyle = activeTheme.baseColor;
                ctx.fillRect(0, 0, w, h);


                // --- 3. EYE (Con color de tema) ---
                // Expandimos el recorrido horizontal SOLO para la LCD (Toxic)
                const isLCD = theme === 'toxic';
                const scleraMaxOffsetX = isLCD ? 150 : 100;
                const scleraMaxOffsetY = 100;

                const scleraX = currentLookAt.current.x * scleraMaxOffsetX;
                const scleraY = -currentLookAt.current.y * scleraMaxOffsetY;

                const eyeCenterX = w / 2 + scleraX;
                const eyeCenterY = h / 2 + scleraY;

                // Compensación geométrica SOLO para la LCDTV (Tema Toxic)
                // Para que el ojo no se vea "aplastado", contrarestamos el estiramiento del mesh panorámico.
                let geoCorrectionX = 1.0;
                if (theme === 'toxic' && screenAspect.current > 1.2) {
                    geoCorrectionX = 1 / (screenAspect.current * 0.85);
                }

                ctx.save();
                ctx.translate(eyeCenterX, eyeCenterY);

                // SCALE:
                // 1. Geo Correction (Toxic)
                // 2. Blink (Y axis)
                // 3. Radio/Sonar Sizing fix (User said it's too big)
                let scaleEye = 1.0;
                if (theme === 'sonar') scaleEye = 0.6; // Radio eye 40% smaller
                if (theme === 'mobile') scaleEye = 0.6; // Mobile eye small too

                ctx.scale(geoCorrectionX * scaleEye, blink.openness * scaleEye);

                let irisColor = '#5090ff';
                if (theme === 'toxic') irisColor = '#00bb33';
                if (theme === 'blood') irisColor = '#cc0000';
                if (theme === 'void') irisColor = '#9900ff';
                if (theme === 'sulfur') irisColor = '#d4c264';
                if (theme === 'toon') irisColor = '#dcdcdc';
                if (theme === 'sonar') irisColor = '#00ff44';
                if (theme === 'mobile') irisColor = '#0088ff';

                const customLookRange = (theme === 'toxic') ? 32
                    : (theme === 'sonar' || theme === 'mobile') ? 15 // Reduced range for small screens
                        : 26;
                const isHologram = theme === 'sonar' || theme === 'mobile';
                const scleraColor = (theme === 'sonar' || theme === 'mobile') ? activeTheme.scleraColor : '#ffffff';

                drawPixelEye(
                    ctx,
                    normalizedMouse.current,
                    irisColor,
                    customLookRange,
                    scleraColor,
                    isHologram
                );

                ctx.restore();

                // --- 4. SCANLINES (ELIMINADO) ---
                /*
                let scanlineColor = 'rgba(0, 0, 0, 0.4)';
                if (theme === 'blood') scanlineColor = 'rgba(40, 0, 0, 0.6)';
                if (theme === 'toxic') scanlineColor = 'rgba(0, 30, 0, 0.5)';
                if (theme === 'void') scanlineColor = 'rgba(20, 0, 40, 0.5)'; // Scanlines purpuras
                if (theme === 'sonar') scanlineColor = 'rgba(0, 50, 20, 0.5)'; // Scanlines verdes
                ctx.fillStyle = scanlineColor;

                // Variar el espaciado para "personalidad"
                let scanlineSpacing = theme === 'void' ? 5 : 4;
                let scanlineThickness = theme === 'void' ? 3 : 2;

                if (theme === 'sulfur') {
                    scanlineSpacing = 6;
                    scanlineThickness = 4;
                }
                if (theme === 'toon') {
                    scanlineSpacing = 3; // Muy densos
                    scanlineThickness = 1; // Muy finos (look film grain)
                }
                if (theme === 'sonar') {
                    scanlineSpacing = 4;
                    scanlineThickness = 2; // Estándar pero marcadas
                }

                for (let y = 0; y < h; y += scanlineSpacing) {
                    ctx.fillRect(0, y, w, scanlineThickness);
                }
                */

                // --- 5. VIGNETTE ---
                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');

                let vignetteColor = 'rgba(0,0,0,1.0)';
                if (theme === 'toxic') vignetteColor = 'rgba(0, 10, 0, 0.95)';
                if (theme === 'blood') vignetteColor = 'rgba(20, 0, 0, 0.95)';
                if (theme === 'void') vignetteColor = 'rgba(10, 0, 20, 0.95)';
                if (theme === 'sulfur') vignetteColor = 'rgba(20, 20, 0, 0.95)';
                if (theme === 'toon') vignetteColor = 'rgba(5, 5, 5, 0.98)';
                if (theme === 'sonar') vignetteColor = 'rgba(0, 20, 0, 0.95)';
                // Classic: Ensure it's not too dark
                if (theme === 'classic') vignetteColor = 'rgba(0, 5, 20, 0.95)';

                gradient.addColorStop(1, vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // --- 6. GLOW ---
                const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);

                let glowColor = 'rgba(20, 40, 100, 0.1)'; // Classic Blue (Default)
                if (theme === 'blood') glowColor = 'rgba(150, 0, 0, 0.15)';
                if (theme === 'void') glowColor = 'rgba(100, 0, 255, 0.15)';
                if (theme === 'sulfur') glowColor = 'rgba(200, 200, 50, 0.12)';
                if (theme === 'sulfur') glowColor = 'rgba(200, 200, 50, 0.12)';
                if (theme === 'sonar') glowColor = 'rgba(0, 255, 50, 0.15)'; // Glow Radioactivo suave
                if (theme === 'mobile') glowColor = 'rgba(0, 100, 255, 0.2)'; // Glow Nokia Blue

                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);

                // --- 7. RETRO FOCUSED TEXT (CRUNCHY STATIC) ---
                if (isFocused && focusedText) {
                    ctx.save();

                    // Center origin for rotation
                    ctx.translate(w / 2, h / 2);

                    // Rotate if inverted (Fix for Red TV upside down text)
                    if (invertY) {
                        ctx.rotate(Math.PI);
                        ctx.scale(-1, 1); // Fix mirror effect
                    }

                    // Jitter / Shake effect (High frequency)
                    const jitterX = (Math.random() - 0.5) * 4;
                    const jitterY = (Math.random() - 0.5) * 4;

                    ctx.font = '900 50px "Courier New", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    // Coordinates relative to center
                    // Top of screen = -h/2
                    const textY = -h / 2 + textYOffset;

                    // Glitch Shadow (Red/Cyan Split hint)
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillText(focusedText, jitterX + 4, textY + jitterY);

                    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.fillText(focusedText, jitterX - 4, textY + jitterY);

                    // Main Text (White/Crunchy)
                    ctx.fillStyle = '#ffffff';

                    // Randomly "missing" scanlines in text/opacity drop
                    if (Math.random() > 0.1) {
                        ctx.fillText(focusedText, jitterX, textY + jitterY);
                    }

                    // --- START BUTTON (Pixel Art In-Screen) ---
                    if (showStartButton) {
                        // Position relative to center
                        // User wanted "bottom center".
                        // In internal canvas coords: 0,0 is center. +Y is DOWN (Canvas standard).
                        // IF inverted: We already rotated the context 180 deg above.
                        // So +Y is indeed "visually down" relative to the text.

                        const btnY = 160; // 160px down from center
                        const btnW = 140; // Smaller button (was 160)
                        const btnH = 45; // Smaller button (was 50)
                        const btnX = 0; // Center

                        // Hover Detection
                        // normalizedMouse is -1 to 1.
                        // We need to map button area to normalized space.
                        // Note: Context is rotated/scaled if inverted. 
                        // But normalizedMouse is in SCREEN space (already compensated for UV rotation in calculation?).
                        // Let's check calculation of normalizedMouse.
                        // It uses `uvRotation` logic. It does NOT seemingly account for `invertY` of the MESH flipping UVs?
                        // Line 317 handles `invertY` for gaze calculation.
                        // So normalizedMouse should be correct relative to visual screen.

                        // BUT we are drawing inside a transformed context (translated/rotated).
                        // It's easier to transform mouse to local contact space? 
                        // Actually, normalizedMouse is simpler: 0,0 is center.
                        // Button center is (0, btnY) relative to canvas center (512x512).
                        // Normalized positions:
                        // Canvas is 512x512.
                        // BtnY = 160 -> Normalized Y = 160 / 256 = 0.625.
                        // BtnW = 220 -> Normalized Half Width = 110 / 256 = 0.43.
                        // BtnH = 70 -> Normalized Half Height = 35 / 256 = 0.13.

                        // MOUSE CHECK:
                        // normalizedMouse.y is +1 UP (GL convention) usually? 
                        // Line 343: normalizedMouse.y = Math.max(-1, Math.min(1, finalY));
                        // finalY comes from `gazeY`. `gazeY` is `mouse.y - tvScreenPos.y`.
                        // R3F `state.mouse.y` is +1 UP.
                        // Canvas Y is +Down.
                        // So Normalized Mouse Y needs inversion to match Canvas Y if we map directly.
                        // BUT logical "Down" (Visual Bottom) is -1 in R3F mouse, +1 in Canvas?
                        // Let's use a simpler heuristic: Distance check for hover to start.
                        // Or Rect check.

                        // We assume normalizedMouse matches the visual cursor.
                        // Visual Button is at Bottom. So Mouse Y should be approx -0.6 (if 0 is center).
                        // But wait, `isLCD` logic compensated gaze.

                        // Hover is now handled by invisible mesh (see return statement)
                        const isHover = startButtonHovered;

                        // ANIMATED PLAY BUTTON
                        // Transition: Small Dot (Idle) -> Full Play Button (Hover)

                        // Animation State (Lerp)
                        // Store animation value on the texture user data to persist across frames
                        let hoverProgress = 0;
                        if (screenTextureRef.current) {
                            if (!screenTextureRef.current.userData) screenTextureRef.current.userData = {};
                            if (typeof screenTextureRef.current.userData.hoverAnim === 'undefined') screenTextureRef.current.userData.hoverAnim = 0;

                            const target = isHover ? 1 : 0;
                            // Smooth Lerp (0.1)
                            screenTextureRef.current.userData.hoverAnim += (target - screenTextureRef.current.userData.hoverAnim) * 0.1;

                            // Snap almost-zero to zero to avoid drawing tiny triangles
                            if (Math.abs(screenTextureRef.current.userData.hoverAnim) < 0.001) screenTextureRef.current.userData.hoverAnim = 0;

                            hoverProgress = screenTextureRef.current.userData.hoverAnim;
                        }

                        // 1. Draw Dot (Fading Out as it expands)
                        // Radius 8 -> 15? Fade 1 -> 0
                        if (hoverProgress < 1.0) {
                            const circleAlpha = 1 - hoverProgress;
                            const circleRadius = 8 + (10 * hoverProgress); // Expand to assist morph illusion

                            ctx.globalAlpha = circleAlpha;
                            ctx.fillStyle = '#ffffff';
                            ctx.globalCompositeOperation = 'source-over';

                            ctx.beginPath();
                            ctx.arc(btnX, btnY, circleRadius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1.0; // Reset
                        }

                        // 2. Draw White Triangle (Fading In / Growing)
                        if (hoverProgress > 0.01) {
                            const triAlpha = hoverProgress;
                            const triScale = hoverProgress;

                            ctx.globalAlpha = triAlpha;
                            ctx.fillStyle = '#ffffff'; // White Triangle
                            ctx.globalCompositeOperation = 'source-over';

                            let btnJitterX = 0;
                            let btnJitterY = 0;

                            // Apply Jitter to triangle
                            if (isHover || hoverProgress > 0.1) {
                                btnJitterX = (Math.random() - 0.5) * 4 * hoverProgress;
                                btnJitterY = (Math.random() - 0.5) * 4 * hoverProgress;
                            }

                            const drawTriangle = (offsetX: number, offsetY: number) => {
                                const cx = btnX + offsetX;
                                const cy = btnY + offsetY;
                                const triSize = 25 * triScale; // Max size 25

                                ctx.beginPath();
                                ctx.moveTo(cx + triSize, cy);
                                ctx.lineTo(cx - triSize / 1.2, cy + triSize);
                                ctx.lineTo(cx - triSize / 1.2, cy - triSize);
                                ctx.closePath();
                                ctx.fill();
                            }

                            // Jittery Passes
                            drawTriangle(btnJitterX, btnJitterY);
                            drawTriangle(btnJitterX - 2, btnJitterY);
                            drawTriangle(btnJitterX + 2, btnJitterY);

                            ctx.globalAlpha = 1.0; // Reset
                        }

                        // Reset
                        ctx.globalCompositeOperation = 'source-over';
                    }

                    ctx.restore();
                }
            }

            screenTextureRef.current.needsUpdate = true;
        }
    });

    // --- LIGHTING REMOVED ON USER REQUEST ---

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
            {clonedModel && (
                <primitive
                    object={clonedModel}
                    onPointerMove={(e: any) => {
                        // UV Raycasting Interaction
                        if (e.object.userData.isScreen && e.uv) {
                            e.stopPropagation();
                            const isHit = checkButtonHover(e.uv);

                            if (isHit) {
                                if (!startButtonHovered) {
                                    setStartButtonHovered(true);
                                    document.body.style.cursor = 'pointer';
                                }
                            } else {
                                if (startButtonHovered) {
                                    setStartButtonHovered(false);
                                    document.body.style.cursor = 'auto';
                                }
                            }
                        }
                    }}
                    onPointerLeave={() => {
                        if (startButtonHovered) {
                            setStartButtonHovered(false);
                            document.body.style.cursor = 'auto';
                        }
                    }}
                    onClick={(e: any) => {
                        if (e.object.userData.isScreen && e.uv) {
                            if (checkButtonHover(e.uv)) {
                                e.stopPropagation();
                                if (onStartClick) onStartClick();
                            }
                        }
                    }}
                />
            )}
        </group>
    );
}

// (He dejado drawPixelEye y los helpers igual al final)


// Función para dibujar ojo pixel art (ahora dibuja relativo a 0,0 para que el parpadeo sea perfecto)
function drawPixelEye(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    irisColor: string = '#5090ff',
    lookRange: number = 26,
    scleraColor: string = '#ffffff',
    isHologram: boolean = false
) {
    const pixelSize = 8;

    // 1. Pupila e Iris: Solo se mueven RELATIVOS al centro del ojo
    const pupilX = mousePos.x * lookRange;
    const pupilY = -mousePos.y * lookRange;

    // --- Dibujo ---

    // 1. Blanco del ojo (Esclerótica)
    ctx.fillStyle = scleraColor;
    if (isHologram) {
        // En modo holograma, añadimos un borde o efecto extra si se desea
        ctx.strokeStyle = irisColor;
        ctx.lineWidth = 2; // Pixel size virtual
        // drawPixelEllipseStroke... (simplifiquemos: solo color sólido translúcido)
    }

    ctx.shadowBlur = 8;
    ctx.shadowColor = isHologram ? irisColor : "rgba(255,255,255,0.5)";
    drawPixelEllipse(
        ctx,
        0, // Centro X es 0 (ajustado por translate fuera)
        0, // Centro Y es 0
        80,
        60,
        pixelSize
    );
    ctx.shadowBlur = 0;

    // 2. Iris
    ctx.fillStyle = irisColor;
    drawPixelCircle(
        ctx,
        pupilX,
        pupilY,
        28,
        pixelSize
    );

    // 3. Pupila
    ctx.fillStyle = isHologram ? 'rgba(0, 50, 0, 0.8)' : '#000000'; // Pupila verde muy oscura en holograma
    drawPixelCircle(
        ctx,
        pupilX,
        pupilY,
        12,
        pixelSize
    );

    // 4. Brillo (Reflejo)
    ctx.fillStyle = '#ffffff';
    drawPixelCircle(
        ctx,
        pupilX + 6,
        pupilY - 6,
        6,
        pixelSize
    );
}

// Helpers de pixel art para estilo "blocky" sin anti-aliasing
function drawPixelCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pixelSize: number
) {
    // Math.ceil para asegurar que cubrimos todo el radio
    const steps = Math.ceil(radius / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -steps; y <= steps; y += pixelSize) {
        for (let x = -steps; x <= steps; x += pixelSize) {
            // Ecuación de círculo: x^2 + y^2 <= r^2
            // Usamos un radio ligeramente menor para "suavizar" la forma del bloque
            if (x * x + y * y <= radius * radius) {
                // Dibujar rectángulos exactos para evitar huecos "contornos"
                // Agregamos un pequeño overlap (0.5) por si el navegador hace anti-aliasing en el canvas
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill(); // Llenamos todo de una vez para mejor performance y solidez
}

function drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    pixelSize: number
) {
    const stepX = Math.ceil(rx / pixelSize) * pixelSize;
    const stepY = Math.ceil(ry / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -stepY; y <= stepY; y += pixelSize) {
        for (let x = -stepX; x <= stepX; x += pixelSize) {
            if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill();
}

useGLTF.preload('/models/LowPolyTV.glb');
useGLTF.preload('/models/LCDTVFixed.glb');

function drawPixelRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}
