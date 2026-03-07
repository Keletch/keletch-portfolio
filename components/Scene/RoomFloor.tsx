import React from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

interface RoomFloorProps {
    texturePath?: string;
    overlayColor1?: string;
    overlayColor2?: string;
}

export function RoomFloor({
    texturePath = '/textures/weirdPattern3.avif',
    overlayColor1 = '#ff0000',
    overlayColor2 = '#0000ff'
}: RoomFloorProps) {
    const floorTexture = useTexture(texturePath);

    React.useLayoutEffect(() => {
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(12, 12);
        floorTexture.anisotropy = 16;
        floorTexture.needsUpdate = true;
    }, [floorTexture]);

    return (
        <RigidBody type="fixed" colliders={false} position={[0, -2.1, 0]}>
            <CuboidCollider args={[25, 10, 25]} position={[0, -9.95, 0]} friction={0.8} />

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

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={floorTexture}
                    color={overlayColor1}
                    transparent
                    opacity={0.5}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    roughness={1}
                />
            </mesh>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial
                    map={floorTexture}
                    color={overlayColor2}
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

useTexture.preload('/textures/concreteTexture.avif');
