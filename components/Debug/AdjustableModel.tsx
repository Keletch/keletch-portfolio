'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import { RetroTextPlane } from '@/components/UI/RetroTextPlane';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

export interface LabelConfig {
    position: [number, number, number];
    rotation: [number, number, number];
    fontSize: number;
    lineHeight?: number;
    color?: string;
}

interface AdjustableModelProps {
    modelPath: string;
    // name prop removed as it was for GUI
    initialPos?: [number, number, number];
    initialRot?: [number, number, number];
    initialScale?: number;
    initialColliderSize?: [number, number, number];
    initialColliderOffset?: [number, number, number];
    onClick?: (e: any) => void;
    onPointerEnter?: (e: any) => void;
    onPointerLeave?: (e: any) => void;
    label?: string;
    isInteractive?: boolean;
    labelConfig?: LabelConfig;
}

export function AdjustableModel({
    modelPath,
    initialPos = [0, 5, 0],
    initialRot = [0, 0, 0],
    initialScale = 1.0,
    initialColliderSize = [0.5, 0.5, 0.5],
    initialColliderOffset = [0, 0, 0],
    onClick,
    onPointerEnter,
    onPointerLeave,
    label,
    isInteractive = true,
    labelConfig
}: AdjustableModelProps) {
    const { scene } = useGLTF(modelPath);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const [hovered, setHovered] = useState(false);

    // Reset hover state if interactivity is disabled
    if (!isInteractive && hovered) {
        setHovered(false);
        document.body.style.cursor = 'auto';
    }

    const handlePointerEnter = (e: any) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
        if (onPointerEnter) onPointerEnter(e);
    };

    const handlePointerLeave = (e: any) => {
        setHovered(false);
        if (onPointerLeave) onPointerLeave(e);
    };

    const groupRef = useRef<THREE.Group>(null);
    const textRef = useRef<any>(null);

    // Verticalize text (Japan-style cascade)
    const verticalText = label ? label.split('').join('\n') : '';

    // Unified useFrame for all animations
    useFrame((state, delta) => {
        // 1. Group Position Animation (Pop-out)
        if (groupRef.current) {
            // Target Z: 0.2 when hovered, 0 when not.
            const targetZ = (hovered && isInteractive) ? 0.2 : 0;
            groupRef.current.position.z = THREE.MathUtils.lerp(
                groupRef.current.position.z,
                targetZ,
                delta * 10
            );
        }

        // 2. Holographic Text Animation
        if (textRef.current) {
            // 1. Text Scale: STATIC (No animation/pop-up)
            // Use exact font size from user calibration (0.04 - 0.08 range)
            if (labelConfig) {
                // No boost, direct mapping
                const finalScale = labelConfig.fontSize;
                textRef.current.scale.set(finalScale, finalScale, finalScale);
            }

            // Holographic "Stable Hover" Effect
            // 1. Color: Handled inside RetroTextPlane (White)

            // 2. Opacity: Stable Fade-In (No breathing/flicker)
            // high opacity (0.85) for clear visibility, semi-transparent for "ghost" feel
            const targetOpacity = hovered ? 0.85 : 0;

            // Smoothly transition opacity
            // We need to access the material of the mesh
            if (textRef.current.material) {
                textRef.current.material.opacity = THREE.MathUtils.lerp(
                    textRef.current.material.opacity || 0,
                    targetOpacity,
                    delta * 8
                );

                // Keep transparent flag true just in case
                textRef.current.material.transparent = true;
            }

            // 3. Floating Effect REMOVED
            // Text stays at fixed config position
            if (labelConfig) {
                textRef.current.position.y = labelConfig.position[1];
            }

            // Force visibility if opacity is effectively non-zero
            if (textRef.current.material) {
                textRef.current.visible = textRef.current.material.opacity > 0.01;
            }
        }
    });

    return (
        <RigidBody
            colliders={false} // Custom collider
            position={initialPos}
            rotation={initialRot}
            enabledRotations={[true, true, true]}
        >
            {/* Animated Group */}
            <group ref={groupRef}>
                {/* Visual Model (Non-Interactive) */}
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

                {/* INTERACTION PROXY (Only render if interactive) */}
                {isInteractive && (
                    <mesh
                        position={initialColliderOffset}
                        onClick={(e) => {
                            if (!isInteractive) return;
                            if (onClick) onClick(e);
                        }}
                        onPointerEnter={handlePointerEnter}
                        onPointerLeave={handlePointerLeave}
                    >
                        {/* Divide args by 2? No, boxGeometry uses full width/height/depth. CuboidCollider uses half-extents? */}
                        {/* Rapier CuboidCollider args are HALF-EXTENTS. Three.js BoxGeometry args are FULL EXTENTS. */}
                        {/* We must multiply collider size by 2 to match visual box. */}
                        <boxGeometry args={[
                            initialColliderSize[0] * 2,
                            initialColliderSize[1] * 2,
                            initialColliderSize[2] * 2
                        ]} />
                        <meshBasicMaterial transparent opacity={0} />
                    </mesh>
                )}

                {/* HOVER LABEL */}
                {label && labelConfig && (
                    <RetroTextPlane
                        ref={textRef}
                        text={verticalText}
                        position={labelConfig.position}
                        rotation={labelConfig.rotation}
                        // Scale adjustment: Book labels were font size ~0.06. 
                        // Our plane is height 4 units. To match 0.06 world height... no wait.
                        // Drei Text fontSize is world units. 0.06 means specific height.
                        // Our canvas is 128x512.
                        // We need to scale the plane so it fits nicely.
                        // Let's start with a scale of 0.2 to test. User said "deja el tamaño igual".
                        // We might need to tweak this scale to match the previous visual size.
                        scale={0.25 * labelConfig.fontSize * 10} // Rough heuristic to match previous size
                    />
                )}

                {/* Fallback removed as hardcoding is verified */}
            </group>
        </RigidBody>
    );
}
