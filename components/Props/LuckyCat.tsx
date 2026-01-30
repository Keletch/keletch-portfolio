'use client';

import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LuckyCatProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

export function LuckyCat({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1.0
}: LuckyCatProps) {
    const groupRef = useRef<THREE.Group>(null);
    const armRef = useRef<THREE.Object3D | null>(null);
    const { scene } = useGLTF('/models/luckyCat.glb');

    useEffect(() => {
        if (!scene) return;

        const clonedScene = scene.clone();

        clonedScene.traverse((child) => {
            if (child.name === '4-RightArm_RightArm_0') {
                armRef.current = child;
            }
        });

        if (!armRef.current) {
            console.warn('⚠️ Lucky Cat arm mesh not found');
        }

        if (groupRef.current) {
            groupRef.current.add(clonedScene);
        }

        return () => {
            if (groupRef.current) {
                groupRef.current.clear();
            }
        };
    }, [scene]);

    useFrame((state) => {
        if (armRef.current) {
            const time = state.clock.elapsedTime;
            const wave = Math.sin(time * 2) * 0.4;
            armRef.current.rotation.x = wave;
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
        />
    );
}
