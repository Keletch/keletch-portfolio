'use client';

import React, { useState, useRef } from 'react';
import { RetroTextPlane } from '@/components/UI/RetroTextPlane';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BackButton3DProps {
    onClick: () => void;
    visible: boolean;
    scale?: number;
}

export function BackButton3D({ onClick, visible, scale = 0.15 }: BackButton3DProps) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    const handleClick = (e: any) => {
        if (!visible) return;
        e.stopPropagation();
        onClick();
    };

    React.useEffect(() => {
        if (!visible) {
            setHovered(false);
            document.body.style.cursor = 'auto';
        }
    }, [visible]);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const baseScale = scale;
            const targetScale = hovered ? baseScale * 1.1 : baseScale;
            const current = meshRef.current.scale.x;
            const next = THREE.MathUtils.lerp(current, targetScale, delta * 10);
            meshRef.current.scale.setScalar(next);
        }
    });

    return (
        <RetroTextPlane
            ref={meshRef}
            text="← BACK TO ROOM"
            position={[-1.39, -0.47, 0.88]}
            rotation={[0, 0.34, 0]}
            scale={scale}
            opacity={visible ? 1 : 0}
            enableJitter={hovered}
            isHorizontal={true}
            fontSize={50}

            onClick={handleClick}
            onPointerEnter={() => {
                if (!visible) return;
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={() => {
                if (!visible) return;
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        />
    );
}
