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
            setCameraZ(isMobile ? 8 : 10);
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

                {/* Luz de Contra Azul (Ampliada) */}
                <pointLight position={[0, 2.2, -4]} intensity={50} distance={18} decay={2} color="#4060ff" />
                <pointLight position={[3, 1.2, -3]} intensity={25} distance={10} decay={2} color="#4060ff" />
                <pointLight position={[-3, 1.2, -3]} intensity={25} distance={10} decay={2} color="#4060ff" />

                {/* Luz Púrpura para la TV de abajo-izquierda (Purple/Void) */}
                <pointLight position={[-0.3, -1.8, 3]} intensity={20.0} distance={12} decay={2} color="#9900ff" />

                {/* Luz de Azufre para la tipicalTV (Amarillo) */}
                <pointLight position={[-3.5, -1.5, 3]} intensity={15.0} distance={10} decay={2} color="#d4c264" />

                {/* Luz Noir para la toonTV (Blanco/Gris) */}
                <pointLight position={[-3.5, 1.0, 3]} intensity={12.0} distance={10} decay={2} color="#ffffff" />

                {/* Luz Roja para la TV de abajo-derecha (Dirty/Blood) */}
                <pointLight position={[2.7, -1.5, 3]} intensity={20.0} distance={12} decay={2} color="#ff0000" />

                {/* Luz Verde para la LCD (Toxic) */}
                <pointLight position={[3.2, 1.2, 3]} intensity={10.0} distance={10} decay={2} color="#00ff44" />

                {/* STACK IZQUIERDO (CENTRO) */}
                {/* 1. TV Original (CRT) */}
                <Television
                    modelPath="/models/LowPolyTV.glb"
                    position={[0, 1.11, -0.3]}
                    rotation={[0, 0.1, 0]}
                />

                {/* 3. TV Púrpura (redTV - Theme Void) */}
                <Television
                    modelPath="/models/redTV.glb"
                    screenNames={['redTVScreen', 'screen']}
                    position={[0, -0.8, 0]}
                    rotation={[0, 0.1, 0]}
                    rotationX={-Math.PI * 0.04}
                    scale={1.0}
                    theme="void"
                    invertY={true}
                />

                {/* 5. TV Amarilla (typicalTV - Theme Sulfur) - Simétrica a dirtyTV */}
                <Television
                    modelPath="/models/typicalTV.glb"
                    screenNames={['typicaltvscreen', 'screen', 'typical_tv_screen', 'tipicaltvscreen']}
                    position={[-2.2, -0.8, 0]}
                    rotation={[0, 0.4, 0]}
                    theme="sulfur"
                />

                {/* 6. TV Toon (toonTV - Theme Toon Noir) - Arriba de la Amarilla */}
                <Television
                    modelPath="/models/toonTV.glb"
                    screenNames={['toonTVScreen', 'screen', 'toontvscreen']}
                    position={[-2.1, 0.45, .5]}
                    rotation={[0, 0.4, 0]}
                    theme="toon"
                />

                {/* STACK DERECHO */}
                {/* 2. TV LCD (Theme Toxic) */}
                <Television
                    modelPath="/models/LCDTVFixed.glb"
                    screenNames={['LCDScreen', 'screen', 'LCD_Screen']}
                    position={[2.4, 0.6, 0]}
                    rotation={[0, -0.4, 0]}
                    rotationX={0}
                    scale={1.1}
                    theme="toxic"
                />

                {/* 4. TV Sucia (dirtyTV - Theme Blood) */}
                <Television
                    modelPath="/models/dirtyTV.glb"
                    screenNames={['dirtyTVScreen', 'screen']}
                    position={[2.4, -0.8, 0]}
                    rotation={[0, -0.4, 0]}
                    rotationX={-Math.PI * 0.04}
                    scale={1.0}
                    theme="blood"
                    gazeOffset={{ x: 0, y: -0.1 }}
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
