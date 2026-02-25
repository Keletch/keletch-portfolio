'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { drawBackButton, drawPlayStopButton, drawMenuButton } from '@/components/Television/Helpers';

interface PixelButtonProps {
    onClick: () => void;
    visible: boolean;
    type: 'play' | 'back' | 'menu';
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}

export function PixelButton({
    onClick,
    visible,
    type = 'back',
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1
}: PixelButtonProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);
    const [hovered, setHovered] = useState(false);

    const targetHover = useRef(0);
    const currentHover = useRef(0);

    useEffect(() => {
        if (!meshRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        textureRef.current = texture;

        meshRef.current.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        return () => {
            texture.dispose();
        };
    }, []);

    useFrame((state, delta) => {
        if (!visible || !textureRef.current || !meshRef.current) return;

        targetHover.current = hovered ? 1 : 0;
        currentHover.current += (targetHover.current - currentHover.current) * 10 * delta;

        const canvas = textureRef.current.image;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(64, 64);
        ctx.scale(4, 4);

        if (type === 'back') {
            drawBackButton(ctx, 0, 0, currentHover.current);
        } else if (type === 'play') {
            drawPlayStopButton(ctx, 0, 0, currentHover.current, 0);
        } else if (type === 'menu') {
            drawMenuButton(ctx, 0, 0, currentHover.current);
        }

        ctx.restore();
        textureRef.current.needsUpdate = true;
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        if (!visible) return;
        e.stopPropagation();
        onClick();
    };

    return (
        <group position={position} rotation={rotation} scale={scale} visible={visible}>
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerEnter={() => {
                    if (visible) {
                        setHovered(true);
                        document.body.style.cursor = 'pointer';
                    }
                }}
                onPointerLeave={() => {
                    setHovered(false);
                    document.body.style.cursor = 'auto';
                }}
            >
                <planeGeometry args={[0.3, 0.3]} />
            </mesh>
        </group>
    );
}
