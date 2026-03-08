import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Physics, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

// Section components
import RadioSection from '@/components/Television/Radio/RadioSection';
import MyWorksSection from '@/components/Television/MyWorks/MyWorksSection';
import AboutMeSection from '@/components/Television/AboutMe/AboutMeSection';
import MobileSection from '@/components/Television/MobileSection';
import { TVCluster } from '@/components/Scene/TVCluster';

import { CRTOverlay } from '@/components/Effects/CRTOverlay';
import { CameraRig } from '@/components/Scene/CameraRig';
// @ts-expect-error - No type definitions available for RectAreaLightUniformsLib
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';

import { AdjustableModel } from '@/components/Debug/AdjustableModel';
import { LuckyCat } from '@/components/Props/LuckyCat';
import { RoomFloor } from '@/components/Scene/RoomFloor';
import { PaletteSelector } from '@/components/UI/PaletteSelector';
import { TopLeftHUD } from '@/components/UI/TopLeftHUD';
import { useSettingsStore } from '@/components/store/useSettingsStore';
import { ResettableRigidBody } from '@/components/Scene/ResettableRigidBody';

RectAreaLightUniformsLib.init();

export type ViewState = 'default' | 'shelf_focus' | 'radio_focus' | 'tv_red_focus' | 'tv_lcd_focus' | 'tv_dirty_focus' | 'tv_typical_focus' | 'tv_lowpoly_focus' | 'tv_settings_focus' | 'tv_mobile_focus' | 'tv_typical_gallery';



type PaletteId = 'current' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

type ThemeColors = { bgColor: string; baseColor: string; glowCenter: string; vignetteColor: string; irisColor: string; scleraColor: string; isHologram?: boolean; textColor?: string; highlightColor?: string; textShadow1?: string; textShadow2?: string; };

const AMBER_COLORS: ThemeColors = {
    bgColor: '#0a0500', baseColor: 'rgba(40, 25, 0, 0.3)', glowCenter: 'rgba(255, 170, 68, 0.1)',
    vignetteColor: 'rgba(15, 8, 0, 0.95)', irisColor: '#ffbb33', scleraColor: '#ffffff',
    textColor: '#ffcc00', highlightColor: '#ffaa44'
};
const CYAN_COLORS: ThemeColors = {
    bgColor: '#000a0f', baseColor: 'rgba(0, 30, 50, 0.3)', glowCenter: 'rgba(0, 238, 255, 0.1)',
    vignetteColor: 'rgba(0, 8, 15, 0.95)', irisColor: '#00eeff', scleraColor: '#ffffff',
    textColor: '#00aaff', highlightColor: '#00ffff'
};
const MAGENTA_COLORS: ThemeColors = {
    bgColor: '#0f0005', baseColor: 'rgba(50, 0, 20, 0.3)', glowCenter: 'rgba(255, 0, 119, 0.1)',
    vignetteColor: 'rgba(15, 0, 8, 0.95)', irisColor: '#ff0077', scleraColor: '#ffffff',
    textColor: '#ff3399', highlightColor: '#ff00cc'
};
const TERMINAL_COLORS: ThemeColors = {
    bgColor: '#000a02', baseColor: 'rgba(0, 30, 5, 0.3)', glowCenter: 'rgba(0, 255, 68, 0.12)',
    vignetteColor: 'rgba(0, 8, 0, 0.95)', irisColor: '#00ff44', scleraColor: '#ffffff',
    textColor: '#33ff33', highlightColor: '#00ff00'
};
const GLITCH_COLORS: ThemeColors = {
    bgColor: '#050000', baseColor: 'rgba(30, 0, 0, 0.3)', glowCenter: 'rgba(255, 0, 0, 0.15)',
    vignetteColor: 'rgba(25, 0, 0, 0.95)', irisColor: '#ff0000', scleraColor: '#ffffff',
    textColor: '#ff3333', highlightColor: '#ff0000'
};

const HOLO_COLORS: ThemeColors = {
    bgColor: '#100020', baseColor: 'rgba(40, 0, 60, 0.3)', glowCenter: 'rgba(200, 0, 255, 0.15)',
    vignetteColor: 'rgba(20, 0, 40, 0.90)', irisColor: '#ff00ff', scleraColor: '#ffffff',
    isHologram: true,
    textColor: '#ff88ff', highlightColor: '#ff00ff'
};
const HACKER_COLORS: ThemeColors = {
    bgColor: '#000000', baseColor: '#000000', glowCenter: 'rgba(0, 255, 50, 0.1)',
    vignetteColor: '#000000', irisColor: '#4af626', scleraColor: 'rgba(74, 246, 38, 0.15)',
    isHologram: true,
    textColor: '#4af626', highlightColor: '#4af626'
};
const NOIR_COLORS: ThemeColors = {
    bgColor: '#050505', baseColor: 'rgba(10, 10, 10, 0.3)', glowCenter: 'rgba(255, 255, 255, 0.05)',
    vignetteColor: 'rgba(0, 0, 0, 0.95)', irisColor: '#ffffff', scleraColor: '#ffffff',
    textColor: '#aaaaaa', highlightColor: '#ffffff'
};
const VELVET_COLORS: ThemeColors = {
    bgColor: '#1a001a', baseColor: 'rgba(40, 0, 40, 0.3)', glowCenter: 'rgba(255, 200, 50, 0.1)',
    vignetteColor: 'rgba(20, 0, 20, 0.95)', irisColor: '#ffcc00', scleraColor: '#ffffff',
    textColor: '#ffd700', highlightColor: '#ffcc00'
};
const GOLD_COLORS: ThemeColors = {
    bgColor: '#101010', baseColor: 'rgba(20, 20, 20, 0.3)', glowCenter: 'rgba(255, 215, 0, 0.1)',
    vignetteColor: 'rgba(5, 5, 5, 0.95)', irisColor: '#ffd700', scleraColor: '#ffffff',
    textColor: '#ffd700', highlightColor: '#ffaa00'
};

// Vision TV unique palette
const VISION_ORIGINAL_COLORS: ThemeColors = {
    bgColor: '#200000', baseColor: 'rgba(60, 0, 0, 0.3)', glowCenter: 'rgba(255, 0, 0, 0.1)',
    vignetteColor: 'rgba(20, 0, 0, 0.95)', irisColor: '#ffffff', scleraColor: '#ffffff',
    textColor: '#ffffff', highlightColor: '#ffffff'
};


const PALETTE_CONFIGS: Record<PaletteId, {
    floor: { texture: string; overlay1: string; overlay2: string };
    cluster: { toon: string; dirty: string; lowpoly: string; typical: string };
    mobile: string;
    radio: { accent: string; theme: ThemeColors } | undefined;
    aboutMe: ThemeColors | undefined;
    myWorks: string | undefined;
    vision: ThemeColors | undefined;
}> = {
    current: {
        floor: { texture: '/textures/weirdPattern3.avif', overlay1: '#ff0000', overlay2: '#0000ff' },
        cluster: { toon: 'toon', dirty: 'blood', lowpoly: 'classic', typical: 'sulfur' },
        mobile: 'mobile',
        radio: undefined,
        aboutMe: undefined,
        myWorks: undefined,
        vision: VISION_ORIGINAL_COLORS
    },
    A: {
        floor: { texture: '/textures/blackConcrete.avif', overlay1: '#ff8800', overlay2: '#ff6600' },
        cluster: { toon: 'amber', dirty: 'amber', lowpoly: 'amber', typical: 'amber' },
        mobile: 'amber',
        radio: { accent: '#ffaa44', theme: AMBER_COLORS },
        aboutMe: AMBER_COLORS,
        myWorks: 'amber',
        vision: undefined
    },
    B: {
        floor: { texture: '/textures/concreteTexture.avif', overlay1: '#00eeff', overlay2: '#00bbcc' },
        cluster: { toon: 'cyan', dirty: 'magenta', lowpoly: 'cyan', typical: 'magenta' },
        mobile: 'cyan',
        radio: { accent: '#00eeff', theme: CYAN_COLORS },
        aboutMe: MAGENTA_COLORS,
        myWorks: 'cyan',
        vision: undefined
    },
    C: {
        floor: { texture: '/textures/otherConcrete.avif', overlay1: '#00ff44', overlay2: '#00cc33' },
        cluster: { toon: 'terminal', dirty: 'terminal', lowpoly: 'terminal', typical: 'terminal' },
        mobile: 'terminal',
        radio: { accent: '#00ff44', theme: TERMINAL_COLORS },
        aboutMe: TERMINAL_COLORS,
        myWorks: 'terminal',
        vision: undefined
    },
    D: {
        floor: { texture: '/textures/glitchy.avif', overlay1: '#ff0000', overlay2: '#550000' },
        cluster: { toon: 'glitch', dirty: 'blood', lowpoly: 'glitch', typical: 'blood' },
        mobile: 'glitch',
        radio: { accent: '#ff0000', theme: GLITCH_COLORS },
        aboutMe: GLITCH_COLORS,
        myWorks: 'glitch',
        vision: undefined
    },

    E: {
        floor: { texture: '/textures/thisOned.avif', overlay1: '#ffcc00', overlay2: '#ffaa00' },
        cluster: { toon: 'gold', dirty: 'gold', lowpoly: 'gold', typical: 'gold' },
        mobile: 'gold',
        radio: { accent: '#ffcc00', theme: GOLD_COLORS },
        aboutMe: GOLD_COLORS,
        myWorks: 'gold',
        vision: undefined
    },

    F: {
        floor: { texture: '/textures/metalicHoloUVFloor.avif', overlay1: '#ff00ff', overlay2: '#00ffff' },
        cluster: { toon: 'holo', dirty: 'holo', lowpoly: 'holo', typical: 'holo' },
        mobile: 'holo',
        radio: { accent: '#ff00ff', theme: HOLO_COLORS },
        aboutMe: HOLO_COLORS,
        myWorks: 'holo',
        vision: undefined
    },
    G: {
        floor: { texture: '/textures/weirdPattern2.avif', overlay1: '#00ff00', overlay2: '#003300' },
        cluster: { toon: 'hacker', dirty: 'hacker', lowpoly: 'hacker', typical: 'hacker' },
        mobile: 'hacker',
        radio: { accent: '#00ff00', theme: HACKER_COLORS },
        aboutMe: HACKER_COLORS,
        myWorks: 'hacker',
        vision: undefined
    },
    H: {
        floor: { texture: '/textures/another.avif', overlay1: '#ffffff', overlay2: '#888888' },
        cluster: { toon: 'noir', dirty: 'noir', lowpoly: 'noir', typical: 'noir' },
        mobile: 'noir',
        radio: { accent: '#ffffff', theme: NOIR_COLORS },
        aboutMe: NOIR_COLORS,
        myWorks: 'noir',
        vision: undefined
    },
    I: {
        floor: { texture: '/textures/thisOne.avif', overlay1: '#ffcc00', overlay2: '#ff00ff' },
        cluster: { toon: 'velvet', dirty: 'velvet', lowpoly: 'velvet', typical: 'velvet' },
        mobile: 'velvet',
        radio: { accent: '#ffcc00', theme: VELVET_COLORS },
        aboutMe: VELVET_COLORS,
        myWorks: 'velvet',
        vision: undefined
    },

};


interface TVSceneProps {
    isLoaded: boolean;
}

export default function TVScene({ isLoaded }: TVSceneProps) {
    const [viewState, setViewState] = useState<ViewState>('default');
    const [isCameraSettled, setCameraSettled] = useState(true);
    const [dpr, setDpr] = useState(1.0);
    const [isPhysicsActive, setPhysicsActive] = useState(false);
    const [palette, setPalette] = useState<PaletteId>('current');

    const setGlobalResetTrigger = useSettingsStore(state => state.setGlobalResetTrigger);

    const paletteConfig = PALETTE_CONFIGS[palette];

    const rectLightRef = useRef<THREE.RectAreaLight>(null);
    const settings = useSettingsStore();

    // View navigation
    const handleZoom = (e: ThreeEvent<MouseEvent>, targetState: ViewState) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        setViewState(targetState);
        setCameraSettled(false);
        setTimeout(() => setCameraSettled(true), 1500);
    };

    const handleResetScene = () => {
        setViewState('default');
        setCameraSettled(true);
        setGlobalResetTrigger(Date.now());
    };

    // Sync theme with palette selection
    useEffect(() => {
        const themeToPalette: Record<string, PaletteId> = {
            'amber': 'A', 'glitch': 'D',
            'gold': 'E', 'holo': 'F', 'hacker': 'G', 'noir': 'H', 'velvet': 'I',
            'classic': 'current', 'toxic': 'C', 'blood': 'D'
        };
        const targetPalette = themeToPalette[settings.theme];
        if (targetPalette && targetPalette !== palette) {
            setPalette(targetPalette);
        }
    }, [settings.theme, palette]);

    // Physics props and books configuration
    const dvdCtrl = { pos: [0, -0.45, 0.30] as [number, number, number], size: [0.43, 0.08, 0.29] as [number, number, number], offset: [0, 0.08, -0.19] as [number, number, number] };
    const rubiksGoldCtrl = { pos: [2.00, 6.00, 0.40] as [number, number, number], rot: [0, 0.5, 0] as [number, number, number], scale: 2.45, size: [0.20, 0.20, 0.20] as [number, number, number], offset: [-0.01, 0.20, -0.01] as [number, number, number] };
    const luckyCatCtrl = { pos: [-0.75, -1.0, 0.0] as [number, number, number], scale: 1.0, size: [0.18, 0.20, 0.14] as [number, number, number], offset: [0.01, 0.18, 0.00] as [number, number, number] };

    const book1Ctrl = { pos: [0.4, -1.3, -0.15] as [number, number, number], rot: [0, 0, 0.2] as [number, number, number], scale: 1.3, size: [0.04, 0.42, 0.30] as [number, number, number], offset: [-1.95, 0.89, 0.11] as [number, number, number] };
    const book2Ctrl = { pos: [0.35, -1.8, -0.15] as [number, number, number], rot: [0, 0, 0.0] as [number, number, number], scale: 1.3, size: [0.06, 0.52, 0.34] as [number, number, number], offset: [-1.84, 1.0, 0.08] as [number, number, number] };
    const book3Ctrl = { pos: [0.3, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.07, 0.40, 0.28] as [number, number, number], offset: [-1.69, 0.88, 0.15] as [number, number, number] };
    const book4Ctrl = { pos: [0.32, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.09, 0.44, 0.30] as [number, number, number], offset: [-1.54, 0.91, 0.13] as [number, number, number] };
    const book5Ctrl = { pos: [0.33, -1.9, -0.15] as [number, number, number], scale: 1.3, size: [0.05, 0.35, 0.27] as [number, number, number], offset: [-1.39, 0.82, 0.14] as [number, number, number] };

    const { scene: dvdModel } = useGLTF('/models/dvd.glb');
    const clonedDvd = useMemo(() => dvdModel.clone(), [dvdModel]);

    // Activate physics after load
    useEffect(() => {
        if (isLoaded) {
            setTimeout(() => {
                setPhysicsActive(true);
            }, 5);
        }
    }, [isLoaded]);

    return (
        <div style={{ width: '100%', height: '100vh', background: '#000000', position: 'relative' }}>

            <Canvas
                shadows={false}
                camera={{ position: [-3.5, 2.5, 14], fov: 35 }}
                dpr={dpr}
                gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
            >
                <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(0.7)} >
                    <color attach="background" args={['#000000']} />
                    <ambientLight intensity={settings.ambientIntensity} />
                    <directionalLight position={[0, 10, 5]} intensity={2.0} color="#fff0dd" />
                    <spotLight position={[0, 8, 6]} angle={1.2} penumbra={0.4} intensity={80} color="#ffc485" />
                    <pointLight position={[-6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />
                    <pointLight position={[6, 4, 4]} intensity={40} distance={25} decay={2} color="#ffc485" />
                    <pointLight position={[0, 2.0, -4]} intensity={50} distance={20} decay={2} color="#3050ff" />
                    <pointLight position={[-4.9, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />
                    <pointLight position={[5.0, 2.0, 2.0]} intensity={30} distance={8} decay={2} color="#ffc485" />
                    <pointLight position={[5.3, 1.9, 0.9]} intensity={10} distance={6.5} decay={2.75} color="#ffaa00" />
                    <rectAreaLight ref={rectLightRef} position={[5.7, 1.4, 1.0]} width={1.0} height={1.2} color="#ffcc00" intensity={5} />

                    <Physics gravity={[0, settings.gravityY, 0]} numSolverIterations={12} paused={!isPhysicsActive}>
                        <RoomFloor
                            texturePath={paletteConfig.floor.texture}
                            overlayColor1={paletteConfig.floor.overlay1}
                            overlayColor2={paletteConfig.floor.overlay2}
                        />

                        <TVCluster viewState={viewState} onNavigate={(st: string) => setViewState(st as ViewState)} clusterThemes={paletteConfig.cluster} visionColors={paletteConfig.vision} onShelfZoom={(e) => handleZoom(e, 'shelf_focus')} onBackToRoom={() => setViewState('default')} />

                        <RadioSection
                            viewState={viewState}
                            onNavigate={(st: string) => setViewState(st as ViewState)}
                            accentColor={paletteConfig.radio?.accent}
                            themeOverride={paletteConfig.radio?.theme}
                        />

                        <AboutMeSection
                            viewState={viewState}
                            onNavigate={(st: string) => setViewState(st as ViewState)}
                            themeOverride={paletteConfig.aboutMe}
                        />

                        <MyWorksSection
                            viewState={viewState}
                            onNavigate={(st: string) => setViewState(st as ViewState)}
                            themeOverride={paletteConfig.myWorks}
                        />

                        <ResettableRigidBody colliders={false} position={dvdCtrl.pos} resetDelay={2.00}>
                            <CuboidCollider args={dvdCtrl.size} position={dvdCtrl.offset} friction={0.5} restitution={0.1} />
                            <primitive object={clonedDvd} />
                        </ResettableRigidBody>

                        <MobileSection
                            viewState={viewState}
                            onNavigate={(st: string) => setViewState(st as ViewState)}
                            theme={paletteConfig.mobile}
                        />

                        <ResettableRigidBody colliders={false} position={luckyCatCtrl.pos} resetDelay={1.50}>
                            <CuboidCollider args={luckyCatCtrl.size} position={luckyCatCtrl.offset} friction={0.5} restitution={0.1} />
                            <LuckyCat scale={luckyCatCtrl.scale} />
                        </ResettableRigidBody>

                        <AdjustableModel modelPath="/models/rubiksGold.glb" initialPos={rubiksGoldCtrl.pos} initialRot={rubiksGoldCtrl.rot} initialScale={rubiksGoldCtrl.scale} initialColliderSize={rubiksGoldCtrl.size} initialColliderOffset={rubiksGoldCtrl.offset} isInteractive={false} resetDelay={2.55} />

                        <AdjustableModel
                            modelPath="/models/b1.glb" initialPos={book1Ctrl.pos} initialRot={book1Ctrl.rot} initialScale={book1Ctrl.scale} initialColliderSize={book1Ctrl.size} initialColliderOffset={book1Ctrl.offset}
                            onClick={(e) => handleZoom(e, 'tv_red_focus')} label="About me"
                            labelConfig={{ position: [-1.882, 0.96, 0.51], rotation: [0, -0.2, 0], fontSize: 0.1, color: '#ffffff' }}
                            isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            resetDelay={0.75}
                        />
                        <AdjustableModel
                            modelPath="/models/b2.glb" initialPos={book2Ctrl.pos} initialScale={book2Ctrl.scale} initialColliderSize={book2Ctrl.size} initialColliderOffset={book2Ctrl.offset}
                            onClick={(e) => handleZoom(e, 'tv_lcd_focus')} label="My Works"
                            labelConfig={{ position: [-1.80, 1.05, 0.52], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                            isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            resetDelay={0.90}
                        />
                        <AdjustableModel
                            modelPath="/models/b3.glb" initialPos={book3Ctrl.pos} initialScale={book3Ctrl.scale} initialColliderSize={book3Ctrl.size} initialColliderOffset={book3Ctrl.offset}
                            onClick={(e) => handleZoom(e, 'tv_dirty_focus')} label="Vision"
                            labelConfig={{ position: [-1.65, 0.90, 0.53], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                            isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            resetDelay={1.05}
                        />
                        <AdjustableModel
                            modelPath="/models/b4.glb" initialPos={book4Ctrl.pos} initialScale={book4Ctrl.scale} initialColliderSize={book4Ctrl.size} initialColliderOffset={book4Ctrl.offset}
                            onClick={(e) => handleZoom(e, 'tv_typical_focus')} label="Lifestyle"
                            labelConfig={{ position: [-1.49, 0.92, 0.53], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                            isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            resetDelay={1.20}
                        />
                        <AdjustableModel
                            modelPath="/models/b5.glb" initialPos={book5Ctrl.pos} initialScale={book5Ctrl.scale} initialColliderSize={book5Ctrl.size} initialColliderOffset={book5Ctrl.offset}
                            onClick={(e) => handleZoom(e, 'tv_lowpoly_focus')} label="Extras"
                            labelConfig={{ position: [-1.35, 0.85, 0.51], rotation: [0, -0.2, 0], fontSize: 0.12, color: '#ffffff' }}
                            isInteractive={viewState === 'shelf_focus' && isCameraSettled}
                            resetDelay={1.35}
                        />
                    </Physics>

                    <CameraRig viewState={viewState} />


                    <TopLeftHUD onNavigate={(s) => setViewState(s as ViewState)} />
                    <PaletteSelector
                        current={palette}
                        onChange={(p) => {
                            setPalette(p as PaletteId);
                            const paletteToTheme: Record<string, import('@/components/store/useSettingsStore').ThemeName> = {
                                'A': 'amber', 'D': 'glitch',
                                'E': 'gold', 'F': 'holo', 'G': 'hacker', 'H': 'noir', 'I': 'velvet',
                                'current': 'classic'
                            };
                            const t = paletteToTheme[p];
                            if (t) settings.setTheme(t);
                        }}
                        onMenuSelect={() => setViewState('shelf_focus')}
                        onSettingsSelect={() => handleZoom({ stopPropagation: () => { } } as unknown as ThreeEvent<MouseEvent>, 'tv_settings_focus')}
                        onResetSelect={handleResetScene}
                        onContactSelect={() => setViewState('tv_mobile_focus')}
                    />
                    <CRTOverlay />
                </PerformanceMonitor>
            </Canvas>
        </div>
    );
}
