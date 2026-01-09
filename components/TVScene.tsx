'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CRTTelevision from '@/components/CRTTelevision';

export default function TVScene() {
    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
            <Canvas
                shadows
                camera={{ position: [0, 0, 7], fov: 35 }}
                // --- TRUCO LOWPOLY / CRUNCHY SUPREMO ---
                // Bajamos la densidad de pixeles a la mitad o menos (0.5 o 0.4)
                // Esto hace que TODO el canvas se renderice a baja resolución y el navegador lo escale (pixelado)
                dpr={[0.3, 0.5]}
                gl={{
                    antialias: false, // Sin suavizado de bordes para serruchos (aliasing)
                    toneMapping: THREE.ACESFilmicToneMapping, // Mejor rango dinámico de color
                    toneMappingExposure: 1.2, // Un poco más de exposición para resaltar colores
                    preserveDrawingBuffer: true
                }}
            >
                {/* Fondo Negro Absoluto */}
                <color attach="background" args={['#000000']} />

                {/* 1. Iluminación Ambiental (Base) */}
                <ambientLight intensity={0.8} />

                {/* 2. Luz Direccional (Key Light) */}
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={4.0}
                    castShadow
                />

                {/* --- POST PROCESADO REMOVIDO POR ERROR --- */}
                {/* Look PSX se mantiene por material y texturas en CRTTelevision.tsx */}

                {/* 3. Luz de Resalte (Spotlight) - Enfocada en el frente para textura */}
                <spotLight
                    position={[-5, 5, 5]}
                    angle={0.15}
                    penumbra={1}
                    intensity={80}
                    color="#ffffff"
                    castShadow
                />

                {/* 4. Luz de Contorno (Rim Light) - Toque azul para atmósfera CRT */}
                <spotLight
                    position={[0, 5, -5]}
                    angle={0.3}
                    penumbra={1}
                    intensity={50}
                    color="#4060ff"
                />

                {/* 5. Luz Frontal Cálida (Fill Light) - Para que se vea la cara de la TV */}
                <pointLight
                    position={[0, 0, 4]}
                    intensity={20.0}
                    color="#ffffff"
                />

                {/* Luces de relleno laterales (Ajustadas) */}
                <pointLight position={[3, 0, 2]} intensity={1.0} color="#ffaa80" />
                <pointLight position={[-3, -1, 2]} intensity={0.5} color="#80a0ff" />

                {/* La TV CRT */}
                <CRTTelevision />

                {/* Controles de cámara */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={1.5}
                    maxDistance={10}
                />
            </Canvas>
        </div>
    );
}
