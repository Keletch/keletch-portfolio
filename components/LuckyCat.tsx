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

        // Find the right arm mesh
        clonedScene.traverse((child) => {
            if (child.name === '4-RightArm_RightArm_0') {
                armRef.current = child;
                console.log('✅ Lucky Cat arm found:', child.name);
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

    // Animate the arm waving
    useFrame((state) => {
        if (armRef.current) {
            // Typical Lucky Cat waving motion
            // Frequency: 2 (speed of wave)
            // Amplitude: 0.4 radians (~23 degrees)
            const time = state.clock.elapsedTime;
            const wave = Math.sin(time * 2) * 0.4;

            // Rotate on X axis (forward and back motion)
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
