import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

interface SpeakerProps {
    model: THREE.Group;
    position: [number, number, number];
    rotation: [number, number, number];
    colliderSize: [number, number, number];
    colliderOffset: [number, number, number];
    analyser?: AnalyserNode;
    isPlaying: boolean;
}

export default function Speaker({
    model,
    position,
    rotation,
    colliderSize,
    colliderOffset,
    analyser,
    isPlaying
}: SpeakerProps) {
    const groupRef = useRef<THREE.Group>(null);
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser]);
    const clonedModel = useMemo(() => model.clone(), [model]);

    useFrame(() => {
        if (!groupRef.current) return;

        let pulse = 1.0;

        if (isPlaying && analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);

            // Calculate Bass Average (Indices 0-10)
            let bassSum = 0;
            const bassEnd = 10;
            for (let i = 0; i < bassEnd; i++) {
                bassSum += dataArray[i];
            }
            const bassAvg = (bassSum / bassEnd) / 255;

            // Clean Kick Pulse (Subtle for speakers)
            // Using same power curve as Radio for sync, but lower intensity
            pulse = 1.0 + Math.pow(bassAvg, 2.2) * 0.15;
        }

        // Apply scale to the whole group (Model + Collider)
        groupRef.current.scale.set(pulse, pulse, pulse);
    });

    return (
        <RigidBody
            colliders={false}
            enabledRotations={[true, false, true]}
            ccd={true}
            linearDamping={0.5}
            angularDamping={0.5}
            position={position}
            rotation={rotation}
        >
            <group ref={groupRef}>
                <CuboidCollider args={colliderSize} position={colliderOffset} friction={0.5} restitution={0.1} />
                <primitive object={clonedModel} />
            </group>
        </RigidBody>
    );
}
