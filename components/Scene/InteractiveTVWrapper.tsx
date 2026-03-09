import React, { useRef, useState, ReactNode } from 'react';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useCursor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore } from '@/components/store/useSettingsStore';

interface InteractiveTVWrapperProps {
    children: ReactNode;
    tvPosition: { x: number; y: number; z: number };
    colliderSize: [number, number, number];
    colliderOffset: [number, number, number];
    viewState: string;
    focusStateName: string;
    mass?: number;
    linearDamping?: number;
    angularDamping?: number;
    camPosOffset?: [number, number, number];
    camLookAtOffset?: [number, number, number];
    resetDelay?: number;
    springStiffness?: number;
    density?: number;
    rotation?: [number, number, number];
    inertiaBoostSize?: [number, number, number];
    inertiaBoostOffset?: [number, number, number];
    flattenDragZ?: boolean;
}



export function InteractiveTVWrapper({
    children,
    tvPosition,
    colliderSize,
    colliderOffset,
    viewState,
    focusStateName,
    mass = 5,
    linearDamping = 0.5,
    angularDamping = 0.5,
    camPosOffset = [0, 0.45, 3.2],
    camLookAtOffset = [0, 0.25, 0],
    resetDelay = 0,
    springStiffness = 150,
    density = 1.0,
    rotation = [0, 0, 0] as [number, number, number],
    inertiaBoostSize,
    inertiaBoostOffset = [0, 0, 0] as [number, number, number],
    flattenDragZ = false
}: InteractiveTVWrapperProps) {
    const tvRef = useRef<RapierRigidBody>(null);
    const groupRef = useRef<THREE.Group>(null);
    const childGroupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [remountKey, setRemountKey] = useState(0);

    const dragPlaneConstant = useRef(0);
    const initialDamping = useRef({ linear: linearDamping, angular: angularDamping });

    const { camera, raycaster, pointer } = useThree();

    const isTopDownView = useSettingsStore(state => state.isTopDownView);
    const setGlobalDragging = useSettingsStore(state => state.setDragging);

    const globalResetTrigger = useSettingsStore(state => state.globalResetTrigger);
    const registerResettingItem = useSettingsStore(state => state.registerResettingItem);
    const unregisterResettingItem = useSettingsStore(state => state.unregisterResettingItem);
    const reportItemReady = useSettingsStore(state => state.reportItemReady);

    const isVanishing = useRef(false);
    const scaleTarget = useRef(1);
    const currentScale = useRef(1);
    const delayTimer = useRef(0);
    const isWaitingToAppear = useRef(false);
    const vanishDelay = useRef(0);
    const isWaitingToVanish = useRef(false);
    const mountedTrigger = useRef(globalResetTrigger);

    // Physics item registration
    React.useEffect(() => {
        registerResettingItem();
        return () => unregisterResettingItem();
    }, [registerResettingItem, unregisterResettingItem]);

    // Global reset sync
    React.useEffect(() => {
        if (globalResetTrigger > 0 && globalResetTrigger !== mountedTrigger.current) {
            mountedTrigger.current = globalResetTrigger;
            vanishDelay.current = Math.random() * 0.3;
            isWaitingToVanish.current = true;
            delayTimer.current = 0;

            if (tvRef.current) {
                tvRef.current.setBodyType(2, true);
                tvRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                tvRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }
        }
    }, [globalResetTrigger]);

    // Global drag release
    React.useEffect(() => {
        const handleGlobalUp = () => {
            if (dragging && tvRef.current) {
                tvRef.current.setLinearDamping(initialDamping.current.linear);
                tvRef.current.setAngularDamping(initialDamping.current.angular);
            }
            setDragging(false);
            setGlobalDragging(false);
        };

        window.addEventListener('pointerup', handleGlobalUp);
        return () => window.removeEventListener('pointerup', handleGlobalUp);
    }, [dragging, setGlobalDragging]);

    const isFocused = viewState === focusStateName || (focusStateName === 'tv_typical_focus' && viewState === 'tv_typical_gallery');
    // If ANY object is focused (incl. this one or another), ALL wrappers should be non-interactive
    const isAnyFocusActive = viewState !== 'default' && viewState !== 'shelf_focus';
    useCursor(hovered && !isAnyFocusActive, dragging ? 'grabbing' : 'pointer', 'auto');

    // Block raycasting on non-focused TVs
    const isBlockedByOtherFocus = isAnyFocusActive && !isFocused;
    React.useEffect(() => {
        if (!childGroupRef.current) return;
        childGroupRef.current.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                if (isBlockedByOtherFocus) {
                    obj.raycast = () => null; // passthrough — another wrapper is focused
                } else {
                    obj.raycast = THREE.Mesh.prototype.raycast.bind(obj); // restore
                }
            }
        });
    }, [isBlockedByOtherFocus]);

    const intersectionPoint = React.useMemo(() => new THREE.Vector3(), []);
    const dragOffset = React.useMemo(() => new THREE.Vector3(), []);
    const localDragPoint = React.useMemo(() => new THREE.Vector3(), []);

    const k = springStiffness; // Spring stiffness

    useFrame((state, delta) => {
        // Vanish/Appear transitions
        if (groupRef.current) {
            // Wait for random vanish delay
            if (isWaitingToVanish.current) {
                delayTimer.current += delta;
                if (delayTimer.current >= vanishDelay.current) {
                    isWaitingToVanish.current = false;
                    isVanishing.current = true;
                    scaleTarget.current = 0;
                    tvRef.current?.setEnabled(false);
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

            groupRef.current.scale.setScalar(currentScale.current);

            // Once fully vanished, start the delay timer
            if (isVanishing.current && currentScale.current === 0) {
                isVanishing.current = false;
                delayTimer.current = 0;
                isWaitingToAppear.current = true;
                return;
            }
        }

        if (!tvRef.current) return;
        if (dragging) {
            if (isFocused) return; // Don't allow physics when zoomed in

            raycaster.setFromCamera(pointer, camera);

            const dragModePlane = new THREE.Plane();
            if (isTopDownView) {
                dragModePlane.setComponents(0, 1, 0, dragPlaneConstant.current);
            } else {
                dragModePlane.setComponents(0, 0, 1, dragPlaneConstant.current);
            }

            if (raycaster.ray.intersectPlane(dragModePlane, intersectionPoint)) {
                const targetPos = intersectionPoint.clone().sub(dragOffset);

                const rb = tvRef.current;
                const tvPos = rb.translation();
                const tvQuat = rb.rotation();

                const stableDelta = Math.min(delta, 0.033);

                const pointWorld = localDragPoint.clone().applyQuaternion(tvQuat as THREE.Quaternion).add(tvPos as THREE.Vector3);

                const displacement = targetPos.sub(pointWorld);
                const rbMass = rb.mass();
                const force = displacement.multiplyScalar(k * stableDelta * rbMass);

                rb.applyImpulseAtPoint(force, pointWorld, true);

                const angVel = rb.angvel();

                const maxAngVel = 8.0;
                if (Math.abs(angVel.x) > maxAngVel || Math.abs(angVel.y) > maxAngVel || Math.abs(angVel.z) > maxAngVel) {
                    rb.setAngvel({
                        x: THREE.MathUtils.clamp(angVel.x, -maxAngVel, maxAngVel),
                        y: THREE.MathUtils.clamp(angVel.y, -maxAngVel, maxAngVel),
                        z: THREE.MathUtils.clamp(angVel.z, -maxAngVel, maxAngVel)
                    }, true);
                }
            }
        }
    });

    return (
        <React.Fragment key={remountKey}>
            <RigidBody
                ref={tvRef}
                colliders={false}
                enabledRotations={[true, true, true]}
                ccd={true}
                linearDamping={linearDamping}
                angularDamping={angularDamping}
                position={[tvPosition.x, tvPosition.y, tvPosition.z]}
                rotation={rotation}
                type={"dynamic"}
                mass={mass}
            >
                <CuboidCollider args={colliderSize} position={colliderOffset} friction={0.3} restitution={0.1} density={density} />
                {/* Rotational inertia sensor (collision-free) */}
                {inertiaBoostSize && (
                    <CuboidCollider args={inertiaBoostSize} position={inertiaBoostOffset} sensor density={density * 0.3} />
                )}
                <group name={`${focusStateName}_cam_pos`} position={camPosOffset} />
                <group name={`${focusStateName}_cam_lookat`} position={camLookAtOffset} />

                <group
                    ref={groupRef}
                    onPointerDown={(e) => {
                        if (isFocused || isAnyFocusActive) return; // Block drag when anything is focused
                        e.stopPropagation();

                        setDragging(true);
                        setGlobalDragging(true);

                        tvRef.current?.wakeUp();

                        const dragModePlane = new THREE.Plane();
                        if (tvRef.current) {
                            if (isTopDownView) {
                                dragPlaneConstant.current = -tvRef.current.translation().y;
                                dragModePlane.setComponents(0, 1, 0, dragPlaneConstant.current);
                            } else {
                                dragPlaneConstant.current = -tvRef.current.translation().z;
                                dragModePlane.setComponents(0, 0, 1, dragPlaneConstant.current);
                            }
                        }

                        raycaster.setFromCamera(pointer, camera);
                        raycaster.ray.intersectPlane(dragModePlane, intersectionPoint);

                        if (tvRef.current) {
                            const rbTrans = tvRef.current.translation();
                            const rbRot = tvRef.current.rotation();
                            const tvPos = new THREE.Vector3(rbTrans.x, rbTrans.y, rbTrans.z);
                            const tvQuat = new THREE.Quaternion(rbRot.x, rbRot.y, rbRot.z, rbRot.w);

                            dragOffset.copy(intersectionPoint).sub(e.point);
                            localDragPoint.copy(e.point).sub(tvPos).applyQuaternion(tvQuat.invert());
                            if (flattenDragZ) localDragPoint.z = 0;

                            initialDamping.current.linear = tvRef.current.linearDamping();
                            initialDamping.current.angular = tvRef.current.angularDamping();
                            tvRef.current.setLinearDamping(4.0);
                            tvRef.current.setAngularDamping(15.0);
                        }
                    }}
                    onPointerUp={() => {
                        if (dragging && tvRef.current) {
                            tvRef.current.setLinearDamping(initialDamping.current.linear);
                            tvRef.current.setAngularDamping(initialDamping.current.angular);
                        }
                        setDragging(false);
                        setGlobalDragging(false);
                    }}
                    onPointerMove={(e) => {
                        if (dragging) e.stopPropagation();
                    }}
                >
                    {/* Solid invisible box for robust hover detection — hidden when this OR any other object is focused */}
                    {!isAnyFocusActive && (
                        <mesh
                            position={colliderOffset}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                setHovered(true);
                            }}
                            onPointerOut={() => setHovered(false)}
                            visible={false}
                        >
                            <boxGeometry args={[colliderSize[0] * 2, colliderSize[1] * 2, colliderSize[2] * 2]} />
                            <meshBasicMaterial transparent opacity={0} />
                        </mesh>
                    )}

                    {/* Children wrapped in a ref so we can traverse for raycast toggling */}
                    <group ref={childGroupRef}>
                        {children}
                    </group>
                </group>
            </RigidBody>
        </React.Fragment>
    );
}
