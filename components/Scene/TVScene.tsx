import { useState, useEffect, Suspense, useRef, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

import Television from '@/components/Television';
import RadioSection from '@/components/Television/Radio/RadioSection';
import AboutMeSection from '@/components/Television/AboutMe/AboutMeSection';
import { CRTOverlay } from '@/components/Effects/CRTOverlay';
import { CameraRig } from '@/components/Scene/CameraRig';
// @ts-ignore
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

import { AdjustableModel } from '@/components/Debug/AdjustableModel';
import { BackButton3D } from '@/components/Props/BackButton3D';
import { LuckyCat } from '@/components/Props/LuckyCat';
import { RoomFloor } from '@/components/Scene/RoomFloor';
import { TVCluster } from '@/components/Scene/TVCluster';

// Inicializar luces de área
RectAreaLightUniformsLib.init();

export type ViewState = 'default' | 'shelf_focus' | 'radio_focus' | 'tv_red_focus' | 'tv_lcd_focus' | 'tv_dirty_focus' | 'tv_typical_focus' | 'tv_lowpoly_focus';

const MOBILE_SCREENS = ['mobileScreen'];

export default function TVScene() {
    const [cameraZ, setCameraZ] = useState(14);
    const [viewState, setViewState] = useState<ViewState>('default');
    const [isCameraSettled, setCameraSettled] = useState(true);
    const [dpr, setDpr] = useState(1.0);

    const rectLightRef = useRef<THREE.RectAreaLight>(null);

    useLayoutEffect(() => {
        if (rectLightRef.current) {
            rectLightRef.current.lookAt(0.1, 6.0, 0.40);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            setCameraZ(isMobile ? 20 : 14);
            if (isMobile) setDpr(0.8);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleZoom = (e: any, targetState: ViewState) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setViewState(targetState);
        setCameraSettled(false);
        setTimeout(() => setCameraSettled(true), 1500);
    };

    // Props Config
    const dvdCtrl = { pos: [0, -0.45, 0.30] as [number, number, number], size: [0.43, 0.08, 0.29] as [number, number, number], offset: [0, 0.08, -0.19] as [number, number, number] };
    const mobileCtrl = { pos: [3.0, 3.0, 0.30] as [number, number, number], rot: [-2.0, 0, -0.30] as [number, number, number], size: [0.09, 0.20, 0.03] as [number, number, number], offset: [0.01, 0.23, 0.00] as [number, number, number] };
    const rubiksGoldCtrl = { pos: [2.00, 6.00, 0.40] as [number, number, number], rot: [0, 0.5, 0] as [number, number, number], scale: 2.45, size: [0.20, 0.20, 0.20] as [number, number, number], offset: [-0.01, 0.20, -0.01] as [number, number, number] };
    const luckyCatCtrl = { pos: [-0.75, -1.0, 0.0] as [number, number, number], scale: 1.0, size: [0.18, 0.20, 0.14] as [number, number, number], offset: [0.01, 0.18, 0.00] as [number, number, number] };

    // Books Config
    const book1Ctrl = { pos: [0.4, -1.3, -0.15] as [number, number, number], rot: [0, 0, 0.2] as [number, number, number], scale: 1.3, size: [0.04, 0.42, 0.30] as [number, number, number], offset: [-1.95, 0.89, 0.11] as [number, number, number] };
    const book2Ctrl = { pos: [0.35, -1.8, -0.15] as [number, number, number], rot: [0, 0, 0.0] as [number, number, number], scale: 1.3, size: [0.06, 0.52, 0.34] as [number, number, number], offset: [-1.84, 1.0, 0.08] as [number, number, number] };
    const book3Ctrl = { pos: [0.3, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.07, 0.40, 0.28] as [number, number, number], offset: [-1.69, 0.88, 0.15] as [number, number, number] };
    const book4Ctrl = { pos: [0.32, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.09, 0.44, 0.30] as [number, number, number], offset: [-1.54, 0.91, 0.13] as [number, number, number] };
    const book5Ctrl = { pos: [0.33, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.05, 0.35, 0.27] as [number, number, number], offset: [-1.39, 0.82, 0.14] as [number, number, number] };

    const { scene: dvdModel } = useGLTF('/models/dvd.glb');

    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000' }}>
            <Canvas
                shadows
                camera={{ position: [-3.5, 2.5, cameraZ], fov: 35 }}
                key={cameraZ}
                dpr={dpr}
                gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
            >
                <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(0.7)} >
                    <color attach="background" args={['#000000']} />
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[0, 10, 5]} intensity={2.0} color="#fff0dd" castShadow />
                    <spotLight position={[0, 8, 6]} angle={1.2} penumbra={0.4} intensity={80} color="#ffc485" />
                    <pointLight position={[-6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />
                    <pointLight position={[6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />
                    <pointLight position={[0, 2.0, -4]} intensity={50} distance={20} decay={2} color="#3050ff" />
                    <pointLight position={[-4.9, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />
                    <pointLight position={[5.0, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />
                    <pointLight position={[5.3, 1.9, 0.9]} intensity={10} distance={6.5} decay={2.75} color="#ffaa00" />
                    <rectAreaLight ref={rectLightRef} position={[5.7, 1.4, 1.0]} width={1.0} height={1.2} color="#ffcc00" intensity={5} />

                    <Suspense fallback={null}>
                        <Physics gravity={[0, -9.81, 0]} numSolverIterations={12}>
                            <RoomFloor />
                            <TVCluster viewState={viewState} onNavigate={(st: ViewState) => setViewState(st)} />
                            <RadioSection viewState={viewState} onNavigate={(st: string) => setViewState(st as ViewState)} />
                            <AboutMeSection viewState={viewState} onNavigate={(st: string) => setViewState(st as ViewState)} />

                            {/* OTHER PROPS */}
                            <RigidBody colliders={false} position={dvdCtrl.pos}>
                                <CuboidCollider args={dvdCtrl.size} position={dvdCtrl.offset} friction={0.5} restitution={0.1} />
                                <primitive object={dvdModel.clone()} />
                            </RigidBody>

                            <RigidBody colliders={false} position={mobileCtrl.pos} rotation={mobileCtrl.rot}>
                                <CuboidCollider args={mobileCtrl.size} position={mobileCtrl.offset} friction={0.5} restitution={0.1} />
                                <Television modelPath="/models/mobile.glb" screenNames={MOBILE_SCREENS} theme="mobile" invertY={true} />
                            </RigidBody>

                            <RigidBody colliders={false} position={luckyCatCtrl.pos}>
                                <CuboidCollider args={luckyCatCtrl.size} position={luckyCatCtrl.offset} friction={0.5} restitution={0.1} />
                                <LuckyCat scale={luckyCatCtrl.scale} />
                            </RigidBody>

                            <AdjustableModel modelPath="/models/rubiksGold.glb" initialPos={rubiksGoldCtrl.pos} initialRot={rubiksGoldCtrl.rot} initialScale={rubiksGoldCtrl.scale} initialColliderSize={rubiksGoldCtrl.size} initialColliderOffset={rubiksGoldCtrl.offset} isInteractive={false} />

                            {/* BOOKS */}
                            <AdjustableModel
                                modelPath="/models/b1.glb" initialPos={book1Ctrl.pos} initialRot={book1Ctrl.rot} initialScale={book1Ctrl.scale} initialColliderSize={book1Ctrl.size} initialColliderOffset={book1Ctrl.offset}
                                onClick={(e) => handleZoom(e, 'tv_red_focus')} label="About me"
                                labelConfig={{ position: [-1.882, 0.96, 0.51], rotation: [0, -0.2, 0], fontSize: 0.1, color: '#ffffff' }}
                                isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            />
                            <AdjustableModel
                                modelPath="/models/b2.glb" initialPos={book2Ctrl.pos} initialScale={book2Ctrl.scale} initialColliderSize={book2Ctrl.size} initialColliderOffset={book2Ctrl.offset}
                                onClick={(e) => handleZoom(e, 'tv_lcd_focus')} label="My Works"
                                labelConfig={{ position: [-1.80, 1.05, 0.52], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                                isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            />
                            <AdjustableModel
                                modelPath="/models/b3.glb" initialPos={book3Ctrl.pos} initialScale={book3Ctrl.scale} initialColliderSize={book3Ctrl.size} initialColliderOffset={book3Ctrl.offset}
                                onClick={(e) => handleZoom(e, 'tv_dirty_focus')} label="Vision"
                                labelConfig={{ position: [-1.65, 0.90, 0.53], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                                isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            />
                            <AdjustableModel
                                modelPath="/models/b4.glb" initialPos={book4Ctrl.pos} initialScale={book4Ctrl.scale} initialColliderSize={book4Ctrl.size} initialColliderOffset={book4Ctrl.offset}
                                onClick={(e) => handleZoom(e, 'tv_typical_focus')} label="Lifestyle"
                                labelConfig={{ position: [-1.49, 0.92, 0.53], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                                isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            />
                            <AdjustableModel
                                modelPath="/models/b5.glb" initialPos={book5Ctrl.pos} initialScale={book5Ctrl.scale} initialColliderSize={book5Ctrl.size} initialColliderOffset={book5Ctrl.offset}
                                onClick={(e) => handleZoom(e, 'tv_lowpoly_focus')} label="Extras"
                                labelConfig={{ position: [-1.35, 0.85, 0.51], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                                isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            />
                        </Physics>
                    </Suspense>

                    <CameraRig viewState={viewState} />

                    {/* INTERACTION ZONES */}
                    {viewState === 'default' && (
                        <>
                            <mesh position={[-1.3, -0.8, 0.95]} onClick={(e) => handleZoom(e, 'shelf_focus')} onPointerEnter={() => document.body.style.cursor = 'pointer'} onPointerLeave={() => document.body.style.cursor = 'auto'}>
                                <boxGeometry args={[1.20, 1.30, 0.15]} />
                                <meshBasicMaterial transparent opacity={0} />
                            </mesh>
                            <mesh position={[1.50, -0.60, 0.25]} onClick={(e) => handleZoom(e, 'radio_focus')} onPointerEnter={() => document.body.style.cursor = 'pointer'} onPointerLeave={() => document.body.style.cursor = 'auto'}>
                                <boxGeometry args={[1.2, 0.3, 0.6]} />
                                <meshBasicMaterial transparent opacity={0} />
                            </mesh>
                        </>
                    )}

                    <BackButton3D onClick={() => setViewState('default')} visible={viewState === 'shelf_focus'} />
                    <CRTOverlay />
                </PerformanceMonitor>
            </Canvas>
        </div>
    );
}
