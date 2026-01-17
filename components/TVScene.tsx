'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import Television from '@/components/Television';
import { CRTOverlay } from '@/components/CRTOverlay';
// @ts-ignore
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

// Inicializar luces de área
RectAreaLightUniformsLib.init();

import { AdjustableModel } from '@/components/AdjustableModel';


export default function TVScene() {
    const [cameraZ, setCameraZ] = useState(5);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            setCameraZ(isMobile ? 20 : 14);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- CONFIGURACIÓN DE COLLIDERS (HARDCODED) ---
    const colliders = {
        lowPoly: { size: [0.85, 0.79, 0.75] as [number, number, number], offset: [-0.03, 0.05, -0.05] as [number, number, number] },
        void: { size: [1.08, 0.80, 0.85] as [number, number, number], offset: [0.03, 0.22, -0.38] as [number, number, number] },
        sulfur: { size: [0.92, 0.69, 0.67] as [number, number, number], offset: [0.00, 0.30, -0.08] as [number, number, number] },
        toon: { size: [0.74, 0.49, 0.45] as [number, number, number], offset: [0.19, 0.21, 0.00] as [number, number, number] },
        toxic: { size: [1.05, 0.60, 0.24] as [number, number, number], offset: [0.00, 0.26, -0.04] as [number, number, number] },
        blood: { size: [1.16, 0.83, 0.72] as [number, number, number], offset: [0.00, 0.17, 0.05] as [number, number, number] }
    };

    // --- CONFIGURACIÓN DE COLLIDERS DEL TV STAND (4 COLLIDERS) ---
    // Valores calibrados finales
    const standCollider1 = { size: [3.25, 0.03, 0.58] as [number, number, number], offset: [-0.85, 1.80, 0.00] as [number, number, number] };
    const standCollider2 = { size: [0.70, 0.04, 0.58] as [number, number, number], offset: [-1.21, 0.41, 0.00] as [number, number, number] };
    const standCollider3 = { size: [2.15, 0.03, 0.56] as [number, number, number], offset: [1.65, 1.23, 0.00] as [number, number, number] };
    const standCollider4 = { size: [3.90, 0.05, 0.55] as [number, number, number], offset: [-0.10, 0.02, 0.00] as [number, number, number] };
    const standCollider5 = { size: [0.02, 0.68, 0.50] as [number, number, number], offset: [-1.94, 1.10, 0.00] as [number, number, number] };

    const standPosition = { x: 0, y: -2.0, z: 0 };

    // --- POSICIONES FINALES DE LAS TVs ---
    const tv1Position = { x: 2.95, y: 1.1, z: 0.30 };  // Toon
    const tv2Position = { x: -2.8, y: 1.1, z: 0.45 }; // Red
    const tv3Position = { x: -1.9, y: 2.5, z: 0.40 }; // Toxic
    const tv4Position = { x: -0.5, y: 1.5, z: 0 };    // Blood
    const tv5Position = { x: 1.6, y: 1.1, z: 0 };     // LowPoly
    const tv6Position = { x: 0.75, y: 2.1, z: 0 };    // Sulfur

    // --- CONTROLES DE ACCESORIOS (Valores finales calibrados) ---
    const dvdCtrl = {
        pos: [0, -0.45, 0.30] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        size: [0.43, 0.08, 0.29] as [number, number, number],
        offset: [0, 0.08, -0.19] as [number, number, number]
    };

    const radioCtrl = {
        pos: [1.50, -0.45, 0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        size: [0.51, 0.14, 0.35] as [number, number, number],
        offset: [-0.03, 0.15, 0] as [number, number, number]
    };

    const leftSpkCtrl = {
        pos: [-4.9, 0, 0] as [number, number, number],
        rot: [0, 0.2, 0] as [number, number, number], // Ajusta rotación aquí [X, Y, Z]
        size: [0.45, 1.6, 0.68] as [number, number, number],
        offset: [-0.05, 1.55, -0.08] as [number, number, number]
    };

    const rightSpkCtrl = {
        pos: [5.0, 0, 0] as [number, number, number],
        rot: [0, -0.4, 0] as [number, number, number], // Ajusta rotación aquí [X, Y, Z]
        size: [0.45, 1.55, 0.68] as [number, number, number],
        offset: [0.02, 1.60, 0.08] as [number, number, number]
    };

    // --- BOOKS CONFIG (HARDCODED) ---
    // User can update these values from Leva debug later
    const book1Ctrl = {
        pos: [0.4, -1.3, -0.15] as [number, number, number],
        rot: [0, 0, 0.2] as [number, number, number],
        scale: 1.3,
        size: [0.04, 0.42, 0.30] as [number, number, number],
        offset: [-1.95, 0.89, 0.11] as [number, number, number]
    };
    const book2Ctrl = {
        pos: [0.35, -1.8, -0.15] as [number, number, number],
        rot: [0, 0, 0.0] as [number, number, number],
        scale: 1.3,
        size: [0.06, 0.52, 0.34] as [number, number, number],
        offset: [-1.84, 1.0, 0.08] as [number, number, number]
    };
    const mobileCtrl = {
        pos: [-5.0, 5.0, 0.10] as [number, number, number],
        rot: [0, 0, .05] as [number, number, number],
        scale: 1.0,
        size: [0.09, 0.20, 0.03] as [number, number, number],
        offset: [0.01, 0.23, 0.00] as [number, number, number]
    };
    const book3Ctrl = {
        pos: [0.3, -1.9, -0.15] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        scale: 1.3,
        size: [0.07, 0.40, 0.28] as [number, number, number],
        offset: [-1.69, 0.88, 0.15] as [number, number, number]
    };
    const book4Ctrl = {
        pos: [0.32, -1.9, -0.15] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        scale: 1.3,
        size: [0.09, 0.44, 0.30] as [number, number, number],
        offset: [-1.54, 0.91, 0.13] as [number, number, number]
    };
    const book5Ctrl = {
        pos: [0.33, -1.9, -0.15] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        scale: 1.3,
        size: [0.05, 0.35, 0.27] as [number, number, number],
        offset: [-1.39, 0.82, 0.14] as [number, number, number]
    };
    const luckyCatCtrl = {
        pos: [-0.75, -1.0, 0.0] as [number, number, number],
        rot: [0, 0, 0] as [number, number, number],
        scale: 1.0,
        size: [0.18, 0.20, 0.14] as [number, number, number],
        offset: [0.01, 0.18, 0.00] as [number, number, number]
    };
    const rubiksGoldCtrl = {
        pos: [5.00, 6.00, 0.40] as [number, number, number],
        rot: [0, 0.5, 0] as [number, number, number],
        scale: 2.45,
        size: [0.20, 0.20, 0.20] as [number, number, number],
        offset: [-0.01, 0.20, -0.01] as [number, number, number]
    };

    // Cargar modelos
    const { scene: tvStandModel } = useGLTF('/models/tvStand.glb');
    const { scene: dvdModel } = useGLTF('/models/dvd.glb');
    const { scene: radioModel } = useGLTF('/models/radio.glb');
    const { scene: leftSpeakerModel } = useGLTF('/models/leftSpeaker.glb');
    const { scene: rightSpeakerModel } = useGLTF('/models/rightSpeaker.glb');


    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
            <Canvas
                shadows
                camera={{ position: [-3.5, 2.5, cameraZ], fov: 35 }}
                key={cameraZ}
                dpr={[0.3, 0.8]}
                gl={{
                    antialias: false,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    preserveDrawingBuffer: true
                }}
            >
                <color attach="background" args={['#000000']} />
                <ambientLight intensity={0.7} />

                {/* Iluminación Principal - WARM STUDIO SETUP (BRIGHTER) */}
                <directionalLight position={[0, 10, 5]} intensity={2.0} color="#fff0dd" castShadow />

                {/* Main Overhead Warm Light (Stronger) */}
                <spotLight position={[0, 8, 6]} angle={1.2} penumbra={0.4} intensity={80} color="#ffc485" />

                {/* Side Fill Lights (Brighter, ensuring no dark spots) */}
                <pointLight position={[-6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />
                <pointLight position={[6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />

                {/* Back Light (Cool Rim) - SLIGHTLY REDUCED */}
                <pointLight position={[0, 2.0, -4]} intensity={50} distance={20} decay={2} color="#3050ff" />

                {/* Speaker Front Lights (Dedicated Fill) */}
                <pointLight position={[-4.9, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />
                <pointLight position={[5.0, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />

                {/* RUBIKS GOLD LIGHTS (BAKED) */}
                {/* Specular Highlight */}
                <pointLight
                    position={[5.3, 1.9, 0.9]}
                    intensity={10}
                    distance={6.5}
                    decay={2.75}
                    color="#ffaa00"
                />
                {/* Metallic Reflection (Softbox) */}
                <rectAreaLight
                    position={[5.7, 1.4, 1.0]}
                    width={1.0}
                    height={1.2}
                    color="#ffcc00"
                    intensity={5}
                    onUpdate={self => self.lookAt(0.1, 6.0, 0.40)}
                />



                <Suspense fallback={null}>
                    <Physics gravity={[0, -9.81, 0]} numSolverIterations={12}>

                        {/* TV STAND (MUEBLE) - DEBAJO DE LAS TVs */}
                        <RigidBody
                            colliders={false}
                            enabledRotations={[true, false, true]}
                            ccd={true}
                            linearDamping={0.5}
                            angularDamping={0.5}
                            position={[standPosition.x, standPosition.y, standPosition.z]}
                        >
                            {/* Collider 1 */}
                            <CuboidCollider args={standCollider1.size} position={standCollider1.offset} friction={0.8} restitution={0.1} />

                            {/* Collider 2 */}
                            <CuboidCollider args={standCollider2.size} position={standCollider2.offset} friction={0.8} restitution={0.1} />

                            {/* Collider 3 */}
                            <CuboidCollider args={standCollider3.size} position={standCollider3.offset} friction={0.8} restitution={0.1} />

                            {/* Collider 4 */}
                            <CuboidCollider args={standCollider4.size} position={standCollider4.offset} friction={0.8} restitution={0.1} />

                            {/* Collider 5 (Extra) */}
                            <CuboidCollider args={standCollider5.size} position={standCollider5.offset} friction={0.8} restitution={0.1} />

                            <primitive object={tvStandModel.clone()} scale={1.2} />
                        </RigidBody>

                        {/* PISO FÍSICO Y VISUAL */}
                        <RoomFloor />

                        {/* COLUMNA 1 (IZQUIERDA) */}
                        {/* toonTV Arriba */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv1Position.x, tv1Position.y, tv1Position.z]}>
                            <CuboidCollider args={colliders.toon.size} position={colliders.toon.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/toonTV.glb" screenNames={['toonTVScreen', 'screen', 'toontvscreen']} theme="toon" invertY={true} />
                        </RigidBody>
                        {/* redTV Abajo */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv2Position.x, tv2Position.y, tv2Position.z]}>
                            <CuboidCollider args={colliders.void.size} position={colliders.void.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/redTV.glb" screenNames={['redTVScreen', 'screen']} theme="void" invertY={true} />
                        </RigidBody>

                        {/* COLUMNA 2 (CENTRO) */}
                        {/* lcdtv (Toxic) Arriba */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv3Position.x, tv3Position.y, tv3Position.z]}>
                            <CuboidCollider args={colliders.toxic.size} position={colliders.toxic.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/LCDTVFixed.glb" screenNames={['LCDScreen', 'screen', 'LCD_Screen']} theme="toxic" scale={1.1} invertY={true} />
                        </RigidBody>
                        {/* dirtytv (Blood) Abajo */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv4Position.x, tv4Position.y, tv4Position.z]}>
                            <CuboidCollider args={colliders.blood.size} position={colliders.blood.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/dirtyTV.glb" screenNames={['dirtyTVScreen', 'screen']} theme="blood" gazeOffset={{ x: 0, y: -0.1 }} invertY={true} />
                        </RigidBody>

                        {/* COLUMNA 3 (DERECHA) */}
                        {/* lowpolytv Arriba */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv5Position.x, tv5Position.y, tv5Position.z]}>
                            <CuboidCollider args={colliders.lowPoly.size} position={colliders.lowPoly.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/LowPolyTV.glb" invertY={true} />
                        </RigidBody>
                        {/* typicaltv (Sulfur) Abajo */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv6Position.x, tv6Position.y, tv6Position.z]}>
                            <CuboidCollider args={colliders.sulfur.size} position={colliders.sulfur.offset} friction={0.3} restitution={0.1} />
                            <Television modelPath="/models/typicalTV.glb" screenNames={['typicaltvscreen', 'screen', 'typical_tv_screen', 'tipicaltvscreen']} theme="sulfur" invertY={true} />
                        </RigidBody>

                        {/* --- ACCESORIOS --- */}

                        {/* DVD PLAYER */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={dvdCtrl.pos} rotation={dvdCtrl.rot}>
                            <CuboidCollider args={dvdCtrl.size} position={dvdCtrl.offset} friction={0.5} restitution={0.1} />
                            <primitive object={dvdModel.clone()} />
                        </RigidBody>

                        {/* RADIO */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={radioCtrl.pos} rotation={radioCtrl.rot}>
                            <CuboidCollider args={radioCtrl.size} position={radioCtrl.offset} friction={0.5} restitution={0.1} />
                            <Television modelPath="/models/radio.glb" screenNames={['radioScreen']} theme="sonar" modelYOffset={0} invertY={true} />
                        </RigidBody>

                        {/* LEFT SPEAKER */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={leftSpkCtrl.pos} rotation={leftSpkCtrl.rot}>
                            <CuboidCollider args={leftSpkCtrl.size} position={leftSpkCtrl.offset} friction={0.5} restitution={0.1} />
                            <primitive object={leftSpeakerModel.clone()} />
                        </RigidBody>

                        {/* RIGHT SPEAKER */}
                        <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={rightSpkCtrl.pos} rotation={rightSpkCtrl.rot}>
                            <CuboidCollider args={rightSpkCtrl.size} position={rightSpkCtrl.offset} friction={0.5} restitution={0.1} />
                            <primitive object={rightSpeakerModel.clone()} />
                        </RigidBody>

                        {/* --- NEW BOOKS (Adjustable with Hardcoded Config) --- */}
                        <AdjustableModel
                            modelPath="/models/b1.glb"
                            initialPos={book1Ctrl.pos}
                            initialRot={book1Ctrl.rot}
                            initialScale={book1Ctrl.scale}
                            initialColliderSize={book1Ctrl.size}
                            initialColliderOffset={book1Ctrl.offset}
                        />
                        <AdjustableModel
                            modelPath="/models/b2.glb"
                            initialPos={book2Ctrl.pos}
                            initialRot={book2Ctrl.rot}
                            initialScale={book2Ctrl.scale}
                            initialColliderSize={book2Ctrl.size}
                            initialColliderOffset={book2Ctrl.offset}
                        />
                        <AdjustableModel
                            modelPath="/models/b3.glb"
                            initialPos={book3Ctrl.pos}
                            initialRot={book3Ctrl.rot}
                            initialScale={book3Ctrl.scale}
                            initialColliderSize={book3Ctrl.size}
                            initialColliderOffset={book3Ctrl.offset}
                        />
                        <AdjustableModel
                            modelPath="/models/b4.glb"
                            initialPos={book4Ctrl.pos}
                            initialRot={book4Ctrl.rot}
                            initialScale={book4Ctrl.scale}
                            initialColliderSize={book4Ctrl.size}
                            initialColliderOffset={book4Ctrl.offset}
                        />
                        <AdjustableModel
                            modelPath="/models/b5.glb"
                            initialPos={book5Ctrl.pos}
                            initialRot={book5Ctrl.rot}
                            initialScale={book5Ctrl.scale}
                            initialColliderSize={book5Ctrl.size}
                            initialColliderOffset={book5Ctrl.offset}
                        />

                        {/* --- MOBILE (Baked Physics + Active Screen) --- */}
                        <RigidBody
                            colliders={false}
                            position={mobileCtrl.pos}
                            rotation={mobileCtrl.rot}
                            enabledRotations={[true, true, true]}
                        >
                            <CuboidCollider
                                args={mobileCtrl.size}
                                position={mobileCtrl.offset}
                                friction={0.5}
                                restitution={0.1}
                            />
                            <Television
                                modelPath="/models/mobile.glb"
                                screenNames={['mobileScreen']}
                                scale={mobileCtrl.scale}
                                theme="mobile"
                                invertY={true} // Fixed inverted Y axis
                                gazeOffset={{ x: 0, y: 0 }}
                            />
                        </RigidBody>

                        {/* --- LUCKY CAT (Baked) --- */}
                        <AdjustableModel
                            modelPath="/models/luckyCat.glb"
                            initialPos={luckyCatCtrl.pos}
                            initialRot={luckyCatCtrl.rot}
                            initialScale={luckyCatCtrl.scale}
                            initialColliderSize={luckyCatCtrl.size}
                            initialColliderOffset={luckyCatCtrl.offset}
                        />

                        {/* --- RUBIKS GOLD (Baked) --- */}
                        <AdjustableModel
                            modelPath="/models/rubiksGold.glb"
                            initialPos={rubiksGoldCtrl.pos}
                            initialRot={rubiksGoldCtrl.rot}
                            initialScale={rubiksGoldCtrl.scale}
                            initialColliderSize={rubiksGoldCtrl.size}
                            initialColliderOffset={rubiksGoldCtrl.offset}
                        />

                    </Physics>
                </Suspense>

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={1.5}
                    maxDistance={20}
                    target={[-0.2, 1.2, 0]} // [X, Y, Z] -> Cambia el primer valor (0.5) para mover la cámara izquierda/derecha
                />

                <CRTOverlay />
            </Canvas>
        </div>
    );
}

function RoomFloor() {
    // Cargar textura del suelo
    const floorTexture = useTexture('/textures/weirdPattern3.avif');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);
    floorTexture.anisotropy = 16;

    return (
        // AJUSTA LA 'Y' (segundo valor) AQUÍ PARA SUBIR O BAJAR EL SUELO
        // Actualmente está en -1.8. Prueba con -2.0 o -2.2 si se ve muy abajo.
        <RigidBody type="fixed" colliders={false} position={[0, -2.1, 0]}>
            <CuboidCollider args={[10, 0.05, 10]} friction={0.8} />

            {/* SUELO BASE */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={floorTexture}
                    bumpMap={floorTexture}
                    bumpScale={0.08}
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>

            {/* FANTASMA ROJO */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={floorTexture}
                    color="#ff0000"
                    transparent
                    opacity={0.5}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    roughness={1}
                />
            </mesh>

            {/* FANTASMA AZUL */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={floorTexture}
                    color="#0000ff"
                    transparent
                    opacity={0.5}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    roughness={1}
                />
            </mesh>
        </RigidBody>
    );
}
