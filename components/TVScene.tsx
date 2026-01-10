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
                // --- ULTRA-CRUNCHY PSX LOOK ---
                // Bajamos aún más el DPR para que los pixeles sean gigantes
                dpr={[0.3, 0.5]}
                gl={{
                    antialias: false,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    preserveDrawingBuffer: true
                }}
            >
                {/* Fondo Negro Absoluto */}
                <color attach="background" args={['#000000']} />

                {/* 1. Luz Ambiental (Un poco más de relleno) */}
                <ambientLight intensity={0.3} />

                {/* 2. Luz Principal (Key Light) */}
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={2.0}
                    castShadow
                />

                {/* 3. Luz de Resalte Frontal (Spotlight) */}
                <spotLight
                    position={[-5, 5, 5]}
                    angle={0.6}
                    penumbra={0.5}
                    intensity={25}
                    color="#ffffff"
                />

                {/* 4. Luz de Recorte (Rim Light) */}
                <spotLight
                    position={[0, 5, -5]}
                    angle={0.8}
                    penumbra={1}
                    intensity={15}
                    color="#4060ff"
                />

                {/* 5. Luz de Relleno Cálida (Más fuerte para ver mejor la tele) */}
                <pointLight
                    position={[0, -2, 4]}
                    intensity={5.0} // De 2.0 a 5.0
                    distance={15}
                    decay={2}
                    color="#fff0cc"
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
