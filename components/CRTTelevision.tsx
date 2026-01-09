'use client';

import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CRTTelevision() {
    const groupRef = useRef<THREE.Group>(null);
    const { scene: model } = useGLTF('/models/LowPolyTV.glb');
    const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const { camera, size } = useThree();
    const normalizedMouse = useRef({ x: 0, y: 0 }); // Mouse normalizado (-1 a 1)
    const currentLookAt = useRef({ x: 0, y: 0 });   // Posición suavizada para la esclerótica

    // Estado del parpadeo
    const blinkState = useRef({
        isBlinking: false,
        openness: 1.0, // 1.0 = Abierto, 0.0 = Cerrado
        nextBlinkTime: 0,
        blinkDuration: 0.15, // Velocidad del parpadeo
        blinkTimer: 0
    });

    // Rastrear posición del mouse
    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Normalizar coordenadas del mouse a -1 a 1
            normalizedMouse.current.x = (event.clientX / size.width) * 2 - 1;
            normalizedMouse.current.y = -(event.clientY / size.height) * 2 + 1; // Y invertido aquí para consistencia
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [size]);

    // Configurar el modelo y encontrar la pantalla
    useEffect(() => {
        if (!model) return;

        const clonedModel = model.clone();

        console.log('🔍 ===== ANÁLISIS DEL MODELO GLB =====');
        let meshCount = 0;
        let screenFound = false;

        // Buscar la mesh que representa la pantalla
        clonedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshCount++;
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
                console.log(`📦 Mesh #${meshCount}:`, {
                    name: child.name || '(sin nombre)',
                    type: child.type,
                    geometry: child.geometry.type,
                    material: child.material instanceof THREE.Material ? child.material.type : 'múltiples materiales'
                });

                // Intenta detectar la pantalla por nombre común
                const screenNames = ['screen', 'pantalla', 'display', 'monitor', 'glass', 'vidrio', 'cristal', 'tube'];
                const childNameLower = child.name.toLowerCase();
                const isScreen = screenNames.some(name => childNameLower.includes(name));

                if (isScreen) {
                    screenFound = true;
                    console.log('✅ ¡PANTALLA DETECTADA!', child.name);

                    // Crear textura desde canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;

                    // Al haber arreglado el UV map en Blender, ya no necesitamos hacks
                    texture.repeat.set(1, 1);
                    texture.offset.set(0, 0);

                    screenTextureRef.current = texture;

                    console.log('🎨 Canvas texture creada (Zoom ajustado 3x):', {
                        width: canvas.width,
                        height: canvas.height,
                        textureExists: !!texture
                    });

                    console.log('🎨 Canvas texture creada:', {
                        width: canvas.width,
                        height: canvas.height,
                        textureExists: !!texture
                    });

                    // Aplicar textura a la pantalla con MeshBasicMaterial (auto-iluminado)
                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        toneMapped: false,
                        transparent: false,
                        opacity: 1,
                        side: THREE.DoubleSide,
                    });
                } else {
                    // Para el resto de la TV: LOOK PSX / CRUNCHY con iluminación real
                    if (child.material) {
                        const convertToPSX = (originalMat: any) => {
                            // 1. Textura Crunchy
                            if (originalMat.map) {
                                originalMat.map.minFilter = THREE.NearestFilter;
                                originalMat.map.magFilter = THREE.NearestFilter;
                                originalMat.map.needsUpdate = true;
                            }

                            // 2. Material que sí reacciona bien a la luz pero se ve Low Poly
                            const psxMat = new THREE.MeshStandardMaterial({
                                color: originalMat.color,
                                map: originalMat.map,
                                roughness: originalMat.roughness || 0.8,
                                metalness: originalMat.metalness || 0.2,
                                flatShading: true, // <--- CLAVE PARA EL LOOK LOWPOLY
                                transparent: false,
                                side: THREE.DoubleSide,
                            });

                            // --- BOOSTER DE SATURACIÓN ---
                            // Multiplicamos por 1.4 para que los colores "popeen"
                            psxMat.color.multiplyScalar(1.4);

                            return psxMat;
                        };

                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(m => convertToPSX(m));
                        } else {
                            child.material = convertToPSX(child.material);
                        }
                    }
                }
            }
        });

        console.log(`📊 Total de meshes encontradas: ${meshCount}`);
        if (!screenFound) {
            console.warn('⚠️ NO SE DETECTÓ NINGUNA PANTALLA');
            console.log('💡 Revisa los nombres arriba y agrega el nombre correcto al array screenNames');
        }
        console.log('🔍 ===== FIN DEL ANÁLISIS =====');

        // Rotar el modelo para que esté de frente
        clonedModel.rotation.x = Math.PI * 0.06; // Pequeña inclinación hacia arriba
        clonedModel.rotation.y = 0;
        clonedModel.position.y = -0.3; // Ajustar altura

        if (groupRef.current) {
            groupRef.current.add(clonedModel);
        }

        return () => {
            if (groupRef.current) {
                groupRef.current.clear();
            }
        };
    }, [model]);

    // Actualizar canvas cada frame
    useFrame((state, delta) => {
        if (screenTextureRef.current) {
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
                // Si no está parpadeando, checar si toca parpadear
                if (state.clock.elapsedTime > blink.nextBlinkTime) {
                    blink.isBlinking = true;
                    blink.blinkTimer = 0;
                    // Programar siguiente parpadeo aleatorio (entre 2 y 6 segundos)
                    blink.nextBlinkTime = state.clock.elapsedTime + Math.random() * 4 + 2;
                }
                blink.openness = 1.0;
            } else {
                // Animación de parpadeo (Cerrar -> Abrir)
                const progress = blink.blinkTimer / blink.blinkDuration;
                if (progress >= 1) {
                    blink.isBlinking = false;
                    blink.openness = 1.0;
                } else {
                    // Curva de parpadeo: Cierra rápido, abre un poco más lento
                    // Usamos sinusoide para simular 1 -> 0 -> 1
                    blink.openness = Math.abs(Math.cos(progress * Math.PI));
                }
            }

            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;

                // --- 1. FONDO CRT (Oscuro Total) ---
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, w, h);

                // --- 2. RUIDO / ESTÁTICA GRUESA (Coarser Grain) ---
                // El usuario dice que el grano es "muy fino".
                // putImageData edita pixeles individuales (1x1), eso es demasiado HD.
                // Volvemos a rectángulos pero optimizados y MÁS GRANDES.
                const noiseDensity = 5000; // Muchos granos
                const grainSize = 3;       // Grano GORDO (3x3 pixeles)

                // Usamos un solo color con transparencia para velocidad
                // Azul muy oscuro/negroso

                for (let i = 0; i < noiseDensity; i++) {
                    const x = Math.random() * w;
                    const y = Math.random() * h;

                    // Variación de color entre azul oscuro y negro
                    const brightness = Math.random();
                    if (brightness > 0.5) {
                        ctx.fillStyle = 'rgba(20, 30, 60, 0.4)'; // Azul oscuro
                    } else {
                        ctx.fillStyle = 'rgba(0, 5, 20, 0.5)'; // Casi negro
                    }

                    ctx.fillRect(x, y, grainSize, grainSize);
                }

                // Capa extra de ruido de color "Video 1"
                ctx.fillStyle = 'rgba(0, 0, 50, 0.1)';
                ctx.fillRect(0, 0, w, h);


                // --- 3. EYE (Ojo) ---
                // ... (parpadeo igual) ...
                ctx.save();
                const centerX = w / 2;
                const centerY = h / 2;
                ctx.translate(centerX, centerY);
                ctx.scale(1, blink.openness);
                ctx.translate(-centerX, -centerY);

                drawPixelEye(
                    ctx, w, h, normalizedMouse.current, currentLookAt.current
                );

                ctx.restore();

                // --- 4. SCANLINES (Sutiles pero presentes) ---
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                const scanlineSpacing = 4;
                for (let y = 0; y < h; y += scanlineSpacing) {
                    ctx.fillRect(0, y, w, 2);
                }

                // --- 5. VIGNETTE (EXTREMA) ---
                // El gradiente anterior era muy suave. Vamos a ser agresivos.
                // Viñeta dura para que las esquinas sean NEGRAS.
                const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h / 1.1);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');       // Centro transparente
                gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');  // Transición
                gradient.addColorStop(1, 'rgba(0,0,0,1.0)');    // ESQUINAS NEGRAS TOTALES

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // --- 6. GLOW SUTIL ---
                // Solo en el centro
                const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, 300);
                glow.addColorStop(0, 'rgba(20, 40, 100, 0.1)');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);
            }

            // Marcar textura para actualización
            screenTextureRef.current.needsUpdate = true;
        }
    });

    return <group ref={groupRef} />;
}

// Función para dibujar ojo pixel art
function drawPixelEye(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mousePos: { x: number; y: number },
    smoothPos: { x: number; y: number }
) {
    const pixelSize = 8;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- Configuraciones de Movimiento ---

    // 1. Esclerótica (Globo Ocular): Se mueve suavemente (con delay)
    // El usuario pidió "más libertad", así que aumentamos el rango.
    // Rango Aumentado: de 40 a 60 (más libertad sin tocar bordes)
    const scleraMaxOffset = 60;
    const scleraX = smoothPos.x * scleraMaxOffset;
    const scleraY = -smoothPos.y * scleraMaxOffset;

    // 2. Pupila y Iris: Se mueven RELATIVOS a la esclerótica
    // lookOffset es cuánto gira el ojo dentro de su propia órbita
    const lookRange = 20;
    const pupilX = scleraX + (mousePos.x * lookRange);
    const pupilY = scleraY + (-mousePos.y * lookRange);

    // --- Dibujo ---

    // 1. Blanco del ojo (Esclerótica)
    ctx.fillStyle = '#ffffff';
    // Sombra interna para volumen (Simulado)
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(255,255,255,0.5)";
    drawPixelEllipse(
        ctx,
        centerX + scleraX,
        centerY + scleraY,
        80,
        60,
        pixelSize
    );
    ctx.shadowBlur = 0; // Reset shadow

    // 2. Iris - Sigue a la pupila
    ctx.fillStyle = '#5090ff';
    drawPixelCircle(
        ctx,
        centerX + pupilX,
        centerY + pupilY,
        28,
        pixelSize
    );

    // 3. Pupila
    ctx.fillStyle = '#000000';
    drawPixelCircle(
        ctx,
        centerX + pupilX,
        centerY + pupilY,
        12,
        pixelSize
    );

    // 4. Brillo (Reflejo) - Sigue a la pupila
    ctx.fillStyle = '#ffffff';
    drawPixelCircle(
        ctx,
        centerX + pupilX + 6,
        centerY + pupilY - 6,
        6,
        pixelSize
    );

    // (YA NO DIBUJAMOS PÁRPADOS AQUÍ)
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
