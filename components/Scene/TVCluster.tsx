import React from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { ResettableRigidBody } from '@/components/Scene/ResettableRigidBody';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import Television from '@/components/Television';
import Vision from '@/components/Television/Vision/Vision';
import LifestyleTV from '@/components/Television/Lifestyle/Lifestyle';
import SettingsTV from '@/components/Television/Settings/Settings';
import { InteractiveTVWrapper } from './InteractiveTVWrapper';
import { BackButton3D } from '@/components/Props/BackButton3D';

interface TVClusterProps {
    viewState: string;
    onNavigate: (state: string) => void;
    clusterThemes?: { toon: string; dirty: string; lowpoly: string; typical: string };
    visionColors?: { irisColor: string; textColor?: string; highlightColor?: string;[key: string]: unknown };
    onShelfZoom?: (e: ThreeEvent<MouseEvent>) => void;
    onBackToRoom?: () => void;
}

const TOON_SCREENS = ['toonTVScreen', 'screen', 'toontvscreen'];
const DIRTY_SCREENS = ['dirtyTVScreen', 'screen'];
const TYPICAL_SCREENS = ['typicaltvscreen', 'screen', 'typical_tv_screen', 'tipicaltvscreen'];
const LOWPOLY_SCREENS = ['screen'];

export function TVCluster({ viewState, onNavigate, clusterThemes, visionColors, onShelfZoom, onBackToRoom }: TVClusterProps) {
    const themes = clusterThemes || { toon: 'toon', dirty: 'blood', lowpoly: 'classic', typical: 'sulfur' };
    const { scene: tvStandModel } = useGLTF('/models/tvStand.glb');
    const clonedStand = React.useMemo(() => tvStandModel.clone(), [tvStandModel]);

    const colliders = {
        lowPoly: { size: [0.85, 0.79, 0.75] as [number, number, number], offset: [-0.03, 0.05, -0.05] as [number, number, number] },
        sulfur: { size: [0.92, 0.69, 0.67] as [number, number, number], offset: [0.00, 0.30, -0.08] as [number, number, number] },
        toon: { size: [0.74, 0.49, 0.45] as [number, number, number], offset: [0.19, 0.21, 0.00] as [number, number, number] },
        toxic: { size: [1.05, 0.60, 0.24] as [number, number, number], offset: [0.00, 0.26, -0.04] as [number, number, number] },
        blood: { size: [1.16, 0.83, 0.72] as [number, number, number], offset: [0.00, 0.17, 0.05] as [number, number, number] }
    };

    const standCollider1 = { size: [3.25, 0.03, 0.58] as [number, number, number], offset: [-0.85, 1.80, 0.00] as [number, number, number] };
    const standCollider2 = { size: [0.70, 0.04, 0.58] as [number, number, number], offset: [-1.21, 0.41, 0.00] as [number, number, number] };
    const standCollider3 = { size: [0.30, 0.25, 0.04] as [number, number, number], offset: [0.65, 1.51, -0.54] as [number, number, number] };
    const standCollider4 = { size: [3.90, 0.05, 0.55] as [number, number, number], offset: [-0.10, 0.02, 0.00] as [number, number, number] };
    const standCollider6 = { size: [1.01, 0.42, 0.58] as [number, number, number], offset: [0.50, 0.84, -0.00] as [number, number, number] };
    const standCollider7 = { size: [0.04, 0.26, 0.54] as [number, number, number], offset: [0.66, 1.51, -0.03] as [number, number, number] };
    const standCollider8 = { size: [1.09, 0.72, 0.58] as [number, number, number], offset: [-3.00, 1.10, 0.00] as [number, number, number] };
    const standCollider9 = { size: [1.13, 0.41, 0.58] as [number, number, number], offset: [2.65, 0.85, 0.00] as [number, number, number] };

    const standPosition = { x: 0, y: -2.0, z: 0 };

    const tv1Position = { x: 2.95, y: 1.1, z: 0.30 };
    const tv4Position = { x: -0.5, y: 1.5, z: 0 };
    const tv5Position = { x: 1.6, y: 1.1, z: 0 };
    const tv6Position = { x: 0.75, y: 2.1, z: 0 };

    return (
        <group>
            <ResettableRigidBody
                colliders={false}
                enabledRotations={[true, false, true]}
                ccd={true}
                linearDamping={0.5}
                angularDamping={0.5}
                position={[standPosition.x, standPosition.y, standPosition.z]}
                resetDelay={0.0}
            >
                <CuboidCollider args={standCollider1.size} position={standCollider1.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider2.size} position={standCollider2.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider3.size} position={standCollider3.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider4.size} position={standCollider4.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider6.size} position={standCollider6.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider7.size} position={standCollider7.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider8.size} position={standCollider8.offset} friction={0.8} restitution={0.1} />
                <CuboidCollider args={standCollider9.size} position={standCollider9.offset} friction={0.8} restitution={0.1} />
                <primitive object={clonedStand} scale={1.2} />

                {/* Camera anchor groups */}
                <group name="shelf_focus_cam_pos" position={[-0.15, 1.34, 3.05]} />
                <group name="shelf_focus_cam_lookat" position={[-2.4, 0.24, -5.0]} />

                {/* Shelf zoom trigger */}
                {viewState === 'default' && onShelfZoom && (
                    <mesh
                        position={[-1.3, 1.2, 0.95]}
                        onClick={onShelfZoom}
                        onPointerEnter={() => document.body.style.cursor = 'pointer'}
                        onPointerLeave={() => document.body.style.cursor = 'auto'}
                    >
                        <boxGeometry args={[1.20, 1.30, 0.15]} />
                        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
                    </mesh>
                )}

                {/* Scene navigation Prop */}
                {onBackToRoom && (
                    <group position={[0, 2.0, 0]}>
                        <BackButton3D onClick={onBackToRoom} visible={viewState === 'shelf_focus'} />
                    </group>
                )}
            </ResettableRigidBody>

            <InteractiveTVWrapper
                tvPosition={tv1Position}
                colliderSize={colliders.toon.size}
                colliderOffset={colliders.toon.offset}
                viewState={viewState}
                focusStateName="tv_settings_focus"
                resetDelay={0.60}
            >
                <SettingsTV
                    modelPath="/models/toonTV.glb"
                    screenNames={TOON_SCREENS}
                    theme={themes.toon as "classic"}
                    invertY={true}
                    focusedText="Settings"
                    isFocused={viewState === 'tv_settings_focus'}
                    textYOffset={40}
                    showBackButton={true}
                    backButtonPosition={{ x: 200, y: -190 }}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    menuButtonPosition={{ x: -200, y: -190 }}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </InteractiveTVWrapper>

            <InteractiveTVWrapper
                tvPosition={tv4Position}
                colliderSize={colliders.blood.size}
                colliderOffset={colliders.blood.offset}
                viewState={viewState}
                focusStateName="tv_dirty_focus"
                camPosOffset={[0, 0.35, 3.2]}
                camLookAtOffset={[0, 0.15, 0]}
                resetDelay={0.15}
            >
                <Vision
                    modelPath="/models/dirtyTV.glb"
                    screenNames={DIRTY_SCREENS}
                    theme={themes.dirty as "blood"}
                    gazeOffset={{ x: 0, y: -0.1 }}
                    invertY={true}
                    focusedText="Vision"
                    isFocused={viewState === 'tv_dirty_focus'}
                    textYOffset={40}
                    showBackButton={true}
                    backButtonPosition={{ x: 200, y: -190 }}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    menuButtonPosition={{ x: -200, y: -190 }}
                    onMenuClick={() => onNavigate('shelf_focus')}
                    visionColors={visionColors}
                />
            </InteractiveTVWrapper>

            <InteractiveTVWrapper
                tvPosition={tv5Position}
                colliderSize={colliders.lowPoly.size}
                colliderOffset={colliders.lowPoly.offset}
                viewState={viewState}
                focusStateName="tv_lowpoly_focus"
                camPosOffset={[0, 0.25, 3.2]}
                camLookAtOffset={[0, 0.0, 0]}
                resetDelay={0.45}
            >
                <Television
                    modelPath="/models/LowPolyTV.glb"
                    invertY={true}
                    screenNames={LOWPOLY_SCREENS}
                    theme={themes.lowpoly as "classic"}
                    focusedText="Extras"
                    isFocused={viewState === 'tv_lowpoly_focus'}
                    textYOffset={40}
                />
            </InteractiveTVWrapper>

            <InteractiveTVWrapper
                tvPosition={tv6Position}
                colliderSize={colliders.sulfur.size}
                colliderOffset={colliders.sulfur.offset}
                viewState={viewState}
                focusStateName="tv_typical_focus"
                resetDelay={1.80}
            >
                <LifestyleTV
                    modelPath="/models/typicalTV.glb"
                    screenNames={TYPICAL_SCREENS}
                    theme={themes.typical as "sulfur"}
                    invertY={true}
                    focusedText="Lifestyle"
                    isFocused={viewState === 'tv_typical_focus' || viewState === 'tv_typical_gallery'}
                    textYOffset={40}
                    showBackButton={true}
                    backButtonPosition={{ x: 200, y: -190 }}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    menuButtonPosition={{ x: -200, y: -190 }}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </InteractiveTVWrapper>
        </group>
    );
}
