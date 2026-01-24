'use client';

import React, { useState, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

interface InteractiveBookProps {
    modelPath: string;
    label: string;
    description?: string;
    isActive: boolean; // Only interactive if camera is focused on shelf
    onNavigate?: () => void;

    // Physics/Position Props (Passed through)
    pos: [number, number, number];
    rot: [number, number, number];
    scale: number;
    size: [number, number, number];
    offset: [number, number, number];
}

export function InteractiveBook({
    modelPath,
    label,
    isActive,
    onNavigate,
    pos,
    rot,
    scale,
    size,
    offset
}: InteractiveBookProps) {
    const { scene } = useGLTF(modelPath);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const [hovered, setHovered] = useState(false);

    const handlePointerEnter = (e: any) => {
        if (!isActive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerLeave = () => {
        setHovered(false);
        document.body.style.cursor = 'auto';
    };

    const handleClick = (e: any) => {
        if (!isActive) return;
        e.stopPropagation();
        if (onNavigate) onNavigate();
    };

    return (
        <RigidBody
            colliders={false}
            position={pos}
            rotation={rot}
            enabledRotations={[true, true, true]}
        >
            <primitive
                object={clonedScene}
                scale={hovered ? scale * 1.05 : scale}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onClick={handleClick}
            />

            <CuboidCollider args={size} position={offset} />

            {/* Floating Tooltip */}
            {hovered && isActive && (
                <Html position={[0, size[1] + 0.2, 0]} center distanceFactor={10}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        border: '1px solid #ffffffaa',
                        pointerEvents: 'none' // Let clicks pass through if needed
                    }}>
                        {label}
                    </div>
                </Html>
            )}
        </RigidBody>
    );
}
