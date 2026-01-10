'use client';

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Television from '@/components/Television';

export default function TVScene() {
    const [cameraZ, setCameraZ] = useState(5);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            setCameraZ(isMobile ? 8 : 5);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
            <Canvas
                shadows
                camera={{ position: [0, 0, cameraZ], fov: 35 }}
                key={cameraZ}
                dpr={[0.3, 0.5]}
                gl={{
                    antialias: false,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    preserveDrawingBuffer: true
                }}
            >
                <color attach="background" args={['#000000']} />

                <ambientLight intensity={0.3} />

                {/* Luz Principal (Top-Center) */}
                <directionalLight position={[0, 10, 5]} intensity={2.2} castShadow />

                {/* Luz Blanca Frontal (Más abierta para cubrir ambas) */}
                <spotLight
                    position={[0, 5, 8]}
                    angle={0.7}
                    penumbra={0.5}
                    intensity={35}
                    color="#ffffff"
                />

                {/* Luz de Contra Azul (Sigue centrada) */}
                {/* Luz de Contra Azul (Ampliada para que pegue en las orillas de ambas) */}
                <pointLight
                    position={[0, 3, -4]}
                    intensity={40}
                    distance={15}
                    decay={2}
                    color="#4060ff"
                />
                <pointLight
                    position={[2, 2, -3]}
                    intensity={20}
                    distance={10}
                    decay={2}
                    color="#4060ff"
                />
                <pointLight
                    position={[-2, 2, -3]}
                    intensity={20}
                    distance={10}
                    decay={2}
                    color="#4060ff"
                />

                {/* Luz Cálida Inferior (Sigue centrada y más fuerte) */}
                <pointLight
                    position={[0, -2, 5]}
                    intensity={10.0}
                    distance={20}
                    decay={2}
                    color="#fff0cc"
                />

                {/* 1. TV Original (CRT) */}
                <Television
                    modelPath="/models/LowPolyTV.glb"
                    position={[-1.2, 0, 0]}
                    rotation={[0, 0.4, 0]}
                />

                {/* 2. TV Nueva (LCD) - Ajustada con nombre exacto y TEMA TÓXICO */}
                <Television
                    modelPath="/models/LCDTVFixed.glb"
                    screenNames={['LCDScreen', 'screen', 'LCD_Screen']}
                    position={[1.2, 0, 0]}
                    rotation={[0, -0.4, 0]}
                    rotationX={0}
                    scale={1.2}
                    theme="toxic"
                />

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={1.5}
                    maxDistance={20}
                />
            </Canvas>
        </div>
    );
}
