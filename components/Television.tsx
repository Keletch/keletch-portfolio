'use client';

import { useRef, useEffect } from 'react';
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
    theme?: 'classic' | 'toxic' | 'blood' | 'void' | 'sulfur' | 'toon'; // 'toon' es Noir (Blanco y Negro)
    invertY?: boolean; // Invertir eje Y si el modelo tiene UVs invertidas
    gazeOffset?: { x: number; y: number }; // Offset manual para calibración
}

export default function Television({
    modelPath,
    screenNames = ['screen', 'pantalla', 'display', 'monitor', 'glass', 'vidrio', 'cristal', 'tube', 'lcdscreen', 'lcd_screen', 'redtvscreen', 'dirtytvscreen', 'tipicaltvscreen', 'toontvscreen', 'toontv_screen'],
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    rotationX = Math.PI * 0.06,
    theme = 'classic',
    invertY = false,
    gazeOffset = { x: 0, y: 0 }
}: TelevisionProps) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene: model } = useGLTF(modelPath);
    const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const { size } = useThree();
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });   // Posición suavizada para la esclerótica
    const screenMeshRef = useRef<THREE.Mesh | null>(null); // Cache para la malla de la pantalla

    // Referencia para el canvas e id de cada instancia
    const instanceId = useRef(Math.random().toString(36).substr(2, 9));
    const screenAspect = useRef(1.0); // 1. Preparamos el ref para el aspect ratio

    // Estado del parpadeo
    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0, // 1.0 = Abierto, 0.0 = Cerrado
        nextBlinkTime: 0,
        blinkDuration: 0.15, // Velocidad del parpadeo
        blinkTimer: 0
    });

    // 1. Ya NO necesitamos el listener global de mouse en useEffect
    // Eliminamos el normalizedMouse y el listener de window)

    // Configurar el modelo y encontrar la pantalla
    useEffect(() => {
        if (!model) return;

        const clonedModel = model.clone();

        console.log(`🔍 ===== ANÁLISIS DEL MODELO: ${modelPath} =====`);
        let meshCount = 0;
        let screenFound = false;

        clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshCount++;

                console.log(`📦 Model: ${modelPath} | Mesh #${meshCount}: ${child.name}`);

                // Asegurarse de que el material no sea transparente
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat instanceof THREE.Material) {
                            mat.transparent = false;
                            mat.opacity = 1;
                        }
                    });
                } else if (child.material instanceof THREE.Material) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }

                const childNameLower = child.name.toLowerCase();
                const isScreen = screenNames.some(name => childNameLower.includes(name.toLowerCase()));

                if (isScreen) {
                    screenFound = true;
                    console.log(`✅ ¡PANTALLA DETECTADA en ${modelPath}!`, child.name);

                    // --- NUEVO: CALCULAR ASPECT RATIO DE LA PANTALLA ---
                    child.geometry.computeBoundingBox();
                    const box = child.geometry.boundingBox;
                    if (box) {
                        const width = box.max.x - box.min.x;
                        const height = box.max.y - box.min.y;
                        screenAspect.current = width / height;
                        console.log(`📏 Aspect Ratio detectado para ${child.name}: ${screenAspect.current}`);
                    }

                    // Crear textura desde canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(1, 1);
                    texture.offset.set(0, 0);

                    screenTextureRef.current = texture;

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
        clonedModel.rotation.x = rotationX;
        clonedModel.position.y = -0.3;

        if (groupRef.current) {
            groupRef.current.add(clonedModel);
        }

        return () => {
            if (groupRef.current) {
                groupRef.current.clear();
            }
        };
    }, [model, modelPath, screenNames, rotationX]);

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

            // Aplicamos sensibilidad y offset manual si existe
            normalizedMouse.current.x = Math.max(-1, Math.min(1, (gazeX * sensitivity) + gazeOffset.x));

            const finalGazeY = invertY ? -gazeY : gazeY;
            normalizedMouse.current.y = Math.max(-1, Math.min(1, (finalGazeY * sensitivity * aspectCompensation) + gazeOffset.y));

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

                // --- 1. FONDO (Oscuro y Profundo) ---
                let bgColor = '#000000';
                if (theme === 'blood') bgColor = '#1a0000';
                if (theme === 'void') bgColor = '#0a001a'; // Fondo púrpura profundo
                if (theme === 'sulfur') bgColor = '#1a1a00'; // Fondo azufre oscuro
                if (theme === 'toon') bgColor = '#080808'; // Fondo Negro "Noir"
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, w, h);

                // --- 2. RUIDO / ESTÁTICA ---
                // Volvemos a la densidad clásica que gustaba más
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

                // Capa de color base para unificar
                let baseColor = 'rgba(0, 0, 50, 0.1)';
                if (theme === 'toxic') baseColor = 'rgba(0, 20, 5, 0.2)';
                if (theme === 'blood') baseColor = 'rgba(40, 0, 0, 0.2)';
                if (theme === 'sulfur') baseColor = 'rgba(50, 50, 0, 0.2)'; // Base amarilla deslavada
                if (theme === 'toon') baseColor = 'rgba(10, 10, 10, 0.3)'; // Base gris oscura
                ctx.fillStyle = baseColor;
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
                ctx.scale(geoCorrectionX, blink.openness);

                let irisColor = '#5090ff';
                if (theme === 'toxic') irisColor = '#00bb33';
                if (theme === 'blood') irisColor = '#cc0000';
                if (theme === 'void') irisColor = '#9900ff'; // Iris Púrpura
                if (theme === 'sulfur') irisColor = '#d4c264'; // Amarillo azufre deslavado
                if (theme === 'toon') irisColor = '#dcdcdc'; // Iris Gris claro (Noir)

                const customLookRange = isLCD ? 32 : 26;

                drawPixelEye(
                    ctx,
                    normalizedMouse.current,
                    irisColor,
                    customLookRange
                );

                ctx.restore();

                // --- 4. SCANLINES ---
                let scanlineColor = 'rgba(0, 0, 0, 0.4)';
                if (theme === 'blood') scanlineColor = 'rgba(40, 0, 0, 0.6)';
                if (theme === 'toxic') scanlineColor = 'rgba(0, 30, 0, 0.5)';
                if (theme === 'void') scanlineColor = 'rgba(20, 0, 40, 0.5)'; // Scanlines purpuras
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

                for (let y = 0; y < h; y += scanlineSpacing) {
                    ctx.fillRect(0, y, w, scanlineThickness);
                }

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

                gradient.addColorStop(1, vignetteColor);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // --- 6. GLOW ---
                const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);

                let glowColor = 'rgba(20, 40, 100, 0.1)';
                if (theme === 'blood') glowColor = 'rgba(150, 0, 0, 0.15)';
                if (theme === 'void') glowColor = 'rgba(100, 0, 255, 0.15)';
                if (theme === 'sulfur') glowColor = 'rgba(200, 200, 50, 0.12)';

                glow.addColorStop(0, glowColor);
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);
            }

            screenTextureRef.current.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation} scale={scale} />
    );
}

// (He dejado drawPixelEye y los helpers igual al final)


// Función para dibujar ojo pixel art (ahora dibuja relativo a 0,0 para que el parpadeo sea perfecto)
function drawPixelEye(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    irisColor: string = '#5090ff',
    lookRange: number = 26
) {
    const pixelSize = 8;

    // 1. Pupila e Iris: Solo se mueven RELATIVOS al centro del ojo
    const pupilX = mousePos.x * lookRange;
    const pupilY = -mousePos.y * lookRange;

    // --- Dibujo ---

    // 1. Blanco del ojo (Esclerótica)
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(255,255,255,0.5)";
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
    ctx.fillStyle = '#000000';
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
