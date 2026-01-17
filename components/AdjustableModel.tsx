'use client';

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface AdjustableModelProps {
    modelPath: string;
    // name prop removed as it was for GUI
    initialPos?: [number, number, number];
    initialRot?: [number, number, number];
    initialScale?: number;
    initialColliderSize?: [number, number, number];
    initialColliderOffset?: [number, number, number];
}

export function AdjustableModel({
    modelPath,
    initialPos = [0, 5, 0],
    initialRot = [0, 0, 0],
    initialScale = 1.0,
    initialColliderSize = [0.5, 0.5, 0.5],
    initialColliderOffset = [0, 0, 0]
}: AdjustableModelProps) {
    const { scene } = useGLTF(modelPath);
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return (
        <RigidBody
            colliders={false} // Custom collider
            position={initialPos}
            rotation={initialRot}
            enabledRotations={[true, true, true]}
        >
            {/* Visual Model */}
            <primitive
                object={clonedScene}
                scale={initialScale}
            />

            {/* Physics Collider */}
            <CuboidCollider
                args={initialColliderSize}
                position={initialColliderOffset}
                friction={0.5}
                restitution={0.1}
            />
        </RigidBody>
    );
}
