import React, { useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useGLTF, useCursor } from '@react-three/drei';
import { InteractiveTVWrapper } from '@/components/Scene/InteractiveTVWrapper';
import { useSettingsStore, SettingsState } from '@/components/store/useSettingsStore';

export function NESProps({ viewState }: { viewState: string }) {
    const { scene: nesScene } = useGLTF('/models/nes.glb');
    const { scene: controllerScene } = useGLTF('/models/nes_controller.glb');
    const { scene: cartridgeScene } = useGLTF('/models/cartridge_QwertyShoot.glb');

    const clonedNes = React.useMemo(() => nesScene.clone(), [nesScene]);
    const clonedController = React.useMemo(() => controllerScene.clone(), [controllerScene]);
    const clonedCartridge = React.useMemo(() => cartridgeScene.clone(), [cartridgeScene]);

    const setActiveGamePrompt = useSettingsStore((state: SettingsState) => state.setActiveGamePrompt);
    const activeGamePrompt = useSettingsStore((state: SettingsState) => state.activeGamePrompt);
    const isGamePromptFading = useSettingsStore((state: SettingsState) => state.isGamePromptFading);
    const availableGames = useSettingsStore((state: SettingsState) => state.availableGames);
    const selectedGameIndex = useSettingsStore((state: SettingsState) => state.selectedGameIndex);

    const [cartHovered, setCartHovered] = useState(false);
    useCursor(cartHovered && viewState === 'nes_focus' && !activeGamePrompt && !isGamePromptFading && selectedGameIndex > 0, 'pointer', 'auto');

    return (
        <group>
            {/* NES Console */}
            <InteractiveTVWrapper
                tvPosition={{ x: 2.950, y: -1.829, z: 1.150 }}
                rotation={[0.000, -0.400, 0.000]}
                colliderSize={[0.277, 0.091, 0.203]}
                colliderOffset={[0, 0.091, -0.008]}
                viewState={viewState}
                focusStateName="nes_focus"
                mass={10}
                linearDamping={1.5}
                angularDamping={1.5}
                camPosOffset={[-0.2, 0.4, 0.9]} // Tight camera zoom in front
                camLookAtOffset={[0, 0.0, 0]}
                resetDelay={2.70}
                density={10}
            >
                <primitive 
                    object={clonedNes} 
                    scale={0.040} 
                    onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
                        if (viewState === 'nes_focus') {
                            e.stopPropagation();
                            document.body.style.cursor = 'auto';
                        }
                    }} 
                />
            </InteractiveTVWrapper>

            {/* NES Controller */}
            <InteractiveTVWrapper
                tvPosition={{ x: 3.090, y: -1.606, z: 1.152 }}
                rotation={[0.000, -1.100, 0.000]}
                colliderSize={[0.125, 0.021, 0.055]}
                colliderOffset={[0, 0.021, -0.0052]}
                inertiaBoostSize={[0.15, 0.15, 0.15]}
                inertiaBoostOffset={[0, 0.021, -0.0052]}
                density={15}
                viewState={viewState}
                focusStateName="nes_controller_prop"
                mass={1}
                linearDamping={1.5}
                angularDamping={1.5}
                resetDelay={2.85}
            >
                <primitive object={clonedController} scale={0.020} />
            </InteractiveTVWrapper>

            {/* NES Cartridge */}
            <InteractiveTVWrapper
                tvPosition={{ x: 2.603, y: -1.608, z: 1.316 }}
                rotation={[0.000, 0.000, 0.000]}
                colliderSize={[0.106, 0.120, 0.011]}
                colliderOffset={[0.005, 0.123, 0]}
                inertiaBoostSize={[0.15, 0.15, 0.15]}
                inertiaBoostOffset={[0.005, 0.123, 0]}
                density={10}
                viewState={viewState}
                focusStateName="cartridge_QWERTYSHOOT"
                camPosOffset={[0.0, 0.12, 0.55]}
                camLookAtOffset={[0.0, 0.12, 0.0]}
                mass={1}
                linearDamping={1.5}
                angularDamping={1.5}
                resetDelay={3.00}
            >
                <group>
                    <primitive
                        object={clonedCartridge}
                        scale={0.301}
                        onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
                            if (isGamePromptFading) return;
                            e.stopPropagation();
                            setCartHovered(true);
                        }}
                        onPointerLeave={() => {
                            setCartHovered(false);
                        }}
                        onClick={(e: ThreeEvent<MouseEvent>) => {
                            e.stopPropagation();
                            if (isGamePromptFading) return;
                            if (viewState === 'nes_focus' && !activeGamePrompt && selectedGameIndex > 0) {
                                setActiveGamePrompt(availableGames[selectedGameIndex]);
                                setCartHovered(false);
                            }
                        }}
                    />
                </group>
            </InteractiveTVWrapper>
        </group>
    );
}

useGLTF.preload('/models/nes.glb');
useGLTF.preload('/models/nes_controller.glb');
useGLTF.preload('/models/cartridge_QwertyShoot.glb');
