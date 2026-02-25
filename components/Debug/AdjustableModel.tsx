'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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
    initialPos?: [number, number, number];
    initialRot?: [number, number, number];
    initialScale?: number;
    initialColliderSize?: [number, number, number];
    initialColliderOffset?: [number, number, number];
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
    onPointerEnter?: (e: ThreeEvent<MouseEvent>) => void;
    onPointerLeave?: (e: ThreeEvent<MouseEvent>) => void;
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

    const handlePointerEnter = (e: ThreeEvent<MouseEvent>) => {
        if (!isInteractive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
        if (onPointerEnter) onPointerEnter(e);
    };

    const handlePointerLeave = (e: ThreeEvent<MouseEvent>) => {
        setHovered(false);
        document.body.style.cursor = 'auto';
        if (onPointerLeave) onPointerLeave(e);
    };

    const groupRef = useRef<THREE.Group>(null);
    const textRef = useRef<THREE.Mesh>(null);

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
            if (labelConfig) {
                const finalScale = labelConfig.fontSize;
                textRef.current.scale.set(finalScale, finalScale, finalScale);
            }

            const targetOpacity = hovered ? 0.85 : 0;

            // Smoothly transition opacity
            // We need to access the material of the mesh
            if (textRef.current.material) {
                const material = textRef.current.material as THREE.MeshBasicMaterial;
                material.opacity = THREE.MathUtils.lerp(
                    material.opacity || 0,
                    targetOpacity,
                    delta * 8
                );
                material.transparent = true;
            }

            if (labelConfig) {
                textRef.current.position.y = labelConfig.position[1];
            }

            // Force visibility if opacity is effectively non-zero
            if (textRef.current.material) {
                const material = textRef.current.material as THREE.MeshBasicMaterial;
                textRef.current.visible = material.opacity > 0.01;
            }
        }
    });

    return (
        <RigidBody
            colliders={false}
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
                        {/* CuboidCollider uses half-extents, BoxGeometry uses full extents */}
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
                        scale={0.25 * labelConfig.fontSize * 10}
                    />
                )}
            </group>
        </RigidBody>
    );
}
