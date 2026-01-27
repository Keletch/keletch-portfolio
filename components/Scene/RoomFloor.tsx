import React from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export function RoomFloor() {
    // Cargar textura del suelo
    const floorTexture = useTexture('/textures/weirdPattern3.avif');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);
    floorTexture.anisotropy = 16;

    return (
        // AJUSTA LA 'Y' (segundo valor) AQUÍ PARA SUBIR O BAJAR EL SUELO
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
