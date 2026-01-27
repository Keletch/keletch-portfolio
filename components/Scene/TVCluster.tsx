import React from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import Television from '@/components/Television';
interface TVClusterProps {
    viewState: string;
    onNavigate: (state: any) => void;
}

const TOON_SCREENS = ['toonTVScreen', 'screen', 'toontvscreen'];
const LCD_SCREENS = ['LCDScreen', 'screen', 'LCD_Screen'];
const DIRTY_SCREENS = ['dirtyTVScreen', 'screen'];
const TYPICAL_SCREENS = ['typicaltvscreen', 'screen', 'typical_tv_screen', 'tipicaltvscreen'];
const LOWPOLY_SCREENS = ['screen'];

export function TVCluster({ viewState, onNavigate }: TVClusterProps) {
    const { scene: tvStandModel } = useGLTF('/models/tvStand.glb');
    const clonedStand = React.useMemo(() => tvStandModel.clone(), [tvStandModel]);

    // --- CONFIGURACIÓN DE COLLIDERS (HARDCODED) ---
    const colliders = {
        lowPoly: { size: [0.85, 0.79, 0.75] as [number, number, number], offset: [-0.03, 0.05, -0.05] as [number, number, number] },
        sulfur: { size: [0.92, 0.69, 0.67] as [number, number, number], offset: [0.00, 0.30, -0.08] as [number, number, number] },
        toon: { size: [0.74, 0.49, 0.45] as [number, number, number], offset: [0.19, 0.21, 0.00] as [number, number, number] },
        toxic: { size: [1.05, 0.60, 0.24] as [number, number, number], offset: [0.00, 0.26, -0.04] as [number, number, number] },
        blood: { size: [1.16, 0.83, 0.72] as [number, number, number], offset: [0.00, 0.17, 0.05] as [number, number, number] }
    };

    // --- CONFIGURACIÓN DE COLLIDERS DEL TV STAND (4 COLLIDERS) ---
    // ... rest of stand logic ...
    const standCollider1 = { size: [3.25, 0.03, 0.58] as [number, number, number], offset: [-0.85, 1.80, 0.00] as [number, number, number] };
    const standCollider2 = { size: [0.70, 0.04, 0.58] as [number, number, number], offset: [-1.21, 0.41, 0.00] as [number, number, number] };
    const standCollider3 = { size: [2.15, 0.03, 0.56] as [number, number, number], offset: [1.65, 1.23, 0.00] as [number, number, number] };
    const standCollider4 = { size: [3.90, 0.05, 0.55] as [number, number, number], offset: [-0.10, 0.02, 0.00] as [number, number, number] };
    const standCollider5 = { size: [0.02, 0.68, 0.50] as [number, number, number], offset: [-1.94, 1.10, 0.00] as [number, number, number] };

    const standPosition = { x: 0, y: -2.0, z: 0 };

    // --- POSICIONES FINALES DE LAS TVs ---
    const tv1Position = { x: 2.95, y: 1.1, z: 0.30 };  // Toon
    const tv3Position = { x: -1.9, y: 2.5, z: 0.40 }; // Toxic
    const tv4Position = { x: -0.5, y: 1.5, z: 0 };    // Blood
    const tv5Position = { x: 1.6, y: 1.1, z: 0 };     // LowPoly
    const tv6Position = { x: 0.75, y: 2.1, z: 0 };    // Sulfur

    return (
        <group>
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
                <primitive object={clonedStand} scale={1.2} />
            </RigidBody>

            {/* COLUMNA 1 (IZQUIERDA) */}
            {/* toonTV Arriba */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv1Position.x, tv1Position.y, tv1Position.z]}>
                <CuboidCollider args={colliders.toon.size} position={colliders.toon.offset} friction={0.3} restitution={0.1} />
                <Television modelPath="/models/toonTV.glb" screenNames={TOON_SCREENS} theme="toon" invertY={true} />
            </RigidBody>

            {/* COLUMNA 2 (CENTRO) */}
            {/* lcdtv (Toxic) Arriba */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv3Position.x, tv3Position.y, tv3Position.z]}>
                <CuboidCollider args={colliders.toxic.size} position={colliders.toxic.offset} friction={0.3} restitution={0.1} />
                <Television
                    modelPath="/models/LCDTVFixed.glb"
                    screenNames={LCD_SCREENS}
                    theme="toxic"
                    scale={1.1}
                    invertY={true}
                    focusedText="My Works"
                    isFocused={viewState === 'tv_lcd_focus'}
                    textYOffset={40}
                    showStartButton={true}
                    onStartClick={() => console.log("Start Clicked: My Works")}
                    showBackButton={true}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </RigidBody>
            {/* dirtytv (Blood) Abajo */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv4Position.x, tv4Position.y, tv4Position.z]}>
                <CuboidCollider args={colliders.blood.size} position={colliders.blood.offset} friction={0.3} restitution={0.1} />
                <Television
                    modelPath="/models/dirtyTV.glb"
                    screenNames={DIRTY_SCREENS}
                    theme="blood"
                    gazeOffset={{ x: 0, y: -0.1 }}
                    invertY={true}
                    focusedText="Vision"
                    isFocused={viewState === 'tv_dirty_focus'}
                    textYOffset={40}
                    showStartButton={true}
                    onStartClick={() => console.log("Start Clicked: Vision")}
                    showBackButton={true}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </RigidBody>

            {/* COLUMNA 3 (DERECHA) */}
            {/* lowpolytv Arriba */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv5Position.x, tv5Position.y, tv5Position.z]}>
                <CuboidCollider args={colliders.lowPoly.size} position={colliders.lowPoly.offset} friction={0.3} restitution={0.1} />
                <Television
                    modelPath="/models/LowPolyTV.glb"
                    invertY={true}
                    screenNames={LOWPOLY_SCREENS}
                    focusedText="Extras"
                    isFocused={viewState === 'tv_lowpoly_focus'}
                    textYOffset={40}
                    showStartButton={true}
                    onStartClick={() => console.log("Start Clicked: Extras")}
                    showBackButton={true}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </RigidBody>
            {/* typicaltv (Sulfur) Abajo */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={[tv6Position.x, tv6Position.y, tv6Position.z]}>
                <CuboidCollider args={colliders.sulfur.size} position={colliders.sulfur.offset} friction={0.3} restitution={0.1} />
                <Television
                    modelPath="/models/typicalTV.glb"
                    screenNames={TYPICAL_SCREENS}
                    theme="sulfur"
                    invertY={true}
                    focusedText="Lifestyle"
                    isFocused={viewState === 'tv_typical_focus'}
                    textYOffset={40}
                    showStartButton={true}
                    onStartClick={() => console.log("Start Clicked: Lifestyle")}
                    showBackButton={true}
                    onBackClick={() => onNavigate('default')}
                    showMenuButton={true}
                    onMenuClick={() => onNavigate('shelf_focus')}
                />
            </RigidBody>
        </group>
    );
}
