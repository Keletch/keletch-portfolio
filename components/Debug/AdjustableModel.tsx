'use client';

import React, { useMemo, useState, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RetroTextPlane } from '@/components/UI/RetroTextPlane';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useSettingsStore } from '@/components/store/useSettingsStore';

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
    resetDelay?: number;
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
    labelConfig,
    resetDelay = 0
}: AdjustableModelProps) {
    const { scene } = useGLTF(modelPath);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const [hovered, setHovered] = useState(false);

    const rbRef = useRef<RapierRigidBody>(null);
    const vanishGroupRef = useRef<THREE.Group>(null);
    const globalResetTrigger = useSettingsStore(state => state.globalResetTrigger);
    const registerResettingItem = useSettingsStore(state => state.registerResettingItem);
    const unregisterResettingItem = useSettingsStore(state => state.unregisterResettingItem);
    const reportItemReady = useSettingsStore(state => state.reportItemReady);

    const [remountKey, setRemountKey] = useState(0);
    const isVanishing = useRef(false);
    const scaleTarget = useRef(1);
    const currentScale = useRef(1);
    const delayTimer = useRef(0);
    const isWaitingToAppear = useRef(false);
    const vanishDelay = useRef(0);
    const isWaitingToVanish = useRef(false);
    const mountedTrigger = useRef(globalResetTrigger);

    React.useEffect(() => {
        registerResettingItem();
        return () => unregisterResettingItem();
    }, [registerResettingItem, unregisterResettingItem]);

    // Reset trigger: freeze and start vanish with random delay
    React.useEffect(() => {
        if (globalResetTrigger > 0 && globalResetTrigger !== mountedTrigger.current) {
            mountedTrigger.current = globalResetTrigger;
            vanishDelay.current = Math.random() * 0.3;
            isWaitingToVanish.current = true;
            delayTimer.current = 0;

            if (rbRef.current) {
                rbRef.current.setBodyType(2, true);
                rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }
        }
    }, [globalResetTrigger]);

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

    useFrame((state, delta) => {
        // Scale animation for vanishing/appearing
        if (vanishGroupRef.current) {
            // Wait for random vanish delay
            if (isWaitingToVanish.current) {
                delayTimer.current += delta;
                if (delayTimer.current >= vanishDelay.current) {
                    isWaitingToVanish.current = false;
                    isVanishing.current = true;
                    scaleTarget.current = 0;
                    rbRef.current?.setEnabled(false);
                }
                return;
            }

            // If waiting to appear after vanish, count the delay
            if (isWaitingToAppear.current) {
                delayTimer.current += delta;
                if (delayTimer.current >= resetDelay) {
                    isWaitingToAppear.current = false;
                    scaleTarget.current = 1;
                    setRemountKey(k => k + 1);
                    reportItemReady();
                }
                return;
            }

            // Fast shrink (10.0), slow elegant grow (4.0)
            const speed = scaleTarget.current === 0 ? 10.0 : 4.0;
            currentScale.current = THREE.MathUtils.lerp(currentScale.current, scaleTarget.current, speed * delta);

            if (Math.abs(currentScale.current - scaleTarget.current) < 0.01) {
                currentScale.current = scaleTarget.current;
            }

            vanishGroupRef.current.scale.setScalar(currentScale.current);

            // Once fully vanished, start the delay timer
            if (isVanishing.current && currentScale.current === 0) {
                isVanishing.current = false;
                delayTimer.current = 0;
                isWaitingToAppear.current = true;
                return;
            }
        }

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
        <React.Fragment key={remountKey}>
            <RigidBody
                ref={rbRef}
                colliders={false}
                position={initialPos}
                rotation={initialRot}
                enabledRotations={[true, true, true]}
            >
                {/* Vanish/Appear scale group */}
                <group ref={vanishGroupRef}>
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
                </group>
            </RigidBody>
        </React.Fragment>
    );
}
