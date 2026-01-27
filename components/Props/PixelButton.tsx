'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { drawBackButton, drawPlayStopButton, drawMenuButton } from '@/components/Television/Helpers';

interface PixelButtonProps {
    onClick: () => void;
    visible: boolean;
    type: 'play' | 'back' | 'menu'; // Generic type prop
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

    // Animation state
    const targetHover = useRef(0);
    const currentHover = useRef(0);
    const morphProgress = useRef(0); // For play/stop toggle if we add it later, currently static 'play'

    // Initial setup of the canvas texture
    useEffect(() => {
        if (!meshRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        textureRef.current = texture;

        // Apply material
        meshRef.current.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        // Cleanup
        return () => {
            texture.dispose();
        };
    }, []);

    // Render loop
    useFrame((state, delta) => {
        if (!visible || !textureRef.current || !meshRef.current) return;

        // Animate hover state
        targetHover.current = hovered ? 1 : 0;
        currentHover.current += (targetHover.current - currentHover.current) * 10 * delta;

        const canvas = textureRef.current.image;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(64, 64);
        ctx.scale(4, 4); // Scale up pixel art (buttons are usually drawn small)

        // Draw based on type
        // Helpers usually draw centered at (x, y) = (0,0) if we passed offsets. 
        // But let's check Helpers.ts... yes, they take x, y. 
        // So passing 0,0 draws at the current origin (which is 64,64 due to translate).

        if (type === 'back') {
            drawBackButton(ctx, 0, 0, currentHover.current);
        } else if (type === 'play') {
            // drawPlayStopButton(ctx, x, y, hoverProgress, morphProgress)
            drawPlayStopButton(ctx, 0, 0, currentHover.current, 0); // Always 'play' icon (morph 0) for now
        } else if (type === 'menu') {
            drawMenuButton(ctx, 0, 0, currentHover.current);
        }

        ctx.restore();

        textureRef.current.needsUpdate = true;
    });

    const handleClick = (e: any) => {
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
