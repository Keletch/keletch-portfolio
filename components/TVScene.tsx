'use client';

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import CRTTelevision from '@/components/CRTTelevision';

export default function TVScene() {
    const [cameraZ, setCameraZ] = useState(5);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            setCameraZ(isMobile ? 8 : 5);
        };

        // Ejecutar al inicio
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
            <Canvas
                shadows
                camera={{ position: [0, 0, cameraZ], fov: 35 }}
                key={cameraZ} // Forzar re-render de la cámara al cambiar Z
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

                {/* 1. Luz Ambiental Base (Más fuerte para que no sea negro total) */}
                <ambientLight intensity={0.8} />

                {/* 2. Luz Principal (Key Light) - Fuerte y desde arriba/derecha */}
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
                    angle={0.6}
                    penumbra={0.5}
                    intensity={80}
                    color="#ffffff"
                />

                {/* 4. Luz de Recorte (Rim Light) - CRUCIAL para separar del fondo negro */}
                {/* Luz azulada desde atrás para dibujar la silueta */}
                <spotLight
                    position={[0, 5, -5]}
                    angle={0.8}
                    penumbra={1}
                    intensity={50}
                    color="#4060ff"
                    lookAt={() => new THREE.Vector3(0, 0, 0)}
                />

                {/* 5. Luz Frontal Cálida - REFORZADA para ver textura y botones */}
                <pointLight
                    position={[0, -2, 4]}  // Bajé la altura (2 -> 1) para dar más directo al frente
                    intensity={10.0}       // Tripliqué la intensidad (10 -> 30)
                    distance={15}
                    decay={2}
                    color="#fff0cc"      // Un poco menos naranja, más "luz de sala"
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
                    maxDistance={20} // Aumentado para permitir el alejamiento en mobile
                />
            </Canvas>
        </div>
    );
}
