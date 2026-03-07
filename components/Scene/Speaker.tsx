import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import { ResettableRigidBody } from '@/components/Scene/ResettableRigidBody';
import * as THREE from 'three';

interface SpeakerProps {
    model: THREE.Group;
    position: [number, number, number];
    rotation: [number, number, number];
    colliderSize: [number, number, number];
    colliderOffset: [number, number, number];
    analyser?: AnalyserNode;
    isPlaying: boolean;
    resetDelay?: number;
}

export default function Speaker({
    model,
    position,
    rotation,
    colliderSize,
    colliderOffset,
    analyser,
    isPlaying,
    resetDelay = 0
}: SpeakerProps) {
    const groupRef = useRef<THREE.Group>(null);
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser]);
    const clonedModel = useMemo(() => model.clone(), [model]);

    useFrame(() => {
        if (!groupRef.current) return;

        // Audio pulsing logic
        let pulse = 1.0;
        if (isPlaying && analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            let bassSum = 0;
            const bassEnd = 10;
            for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
            const bassAvg = (bassSum / bassEnd) / 255;
            pulse = 1.0 + Math.pow(bassAvg, 2.2) * 0.15;
        }

        groupRef.current.scale.set(pulse, pulse, pulse);
    });

    return (
        <ResettableRigidBody
            colliders={false}
            enabledRotations={[true, false, true]}
            ccd={true}
            linearDamping={0.5}
            angularDamping={0.5}
            position={position}
            rotation={rotation}
            resetDelay={resetDelay}
        >
            <group ref={groupRef}>
                <CuboidCollider args={colliderSize} position={colliderOffset} friction={0.5} restitution={0.1} />
                <primitive object={clonedModel} />
            </group>
        </ResettableRigidBody>
    );
}
