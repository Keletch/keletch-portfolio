import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RigidBodyProps, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useSettingsStore } from '@/components/store/useSettingsStore';

interface ResettableRigidBodyProps extends RigidBodyProps {
    resetDelay?: number; // seconds to wait before re-appearing at origin
}

export const ResettableRigidBody = forwardRef<RapierRigidBody, ResettableRigidBodyProps>(
    ({ position, rotation, children, resetDelay = 0, ...props }, forwardedRef) => {
        const rbRef = useRef<RapierRigidBody>(null);
        const groupRef = useRef<THREE.Group>(null);
        const [remountKey, setRemountKey] = useState(0);

        useImperativeHandle(forwardedRef, () => rbRef.current as RapierRigidBody);

        const globalResetTrigger = useSettingsStore(state => state.globalResetTrigger);
        const globalUnfreezeTrigger = useSettingsStore(state => state.globalUnfreezeTrigger);
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
        // Track the trigger value at mount to skip stale triggers on remount
        const mountedTrigger = useRef(globalResetTrigger);

        // Physics registration
        React.useEffect(() => {
            registerResettingItem();
            return () => unregisterResettingItem();
        }, [registerResettingItem, unregisterResettingItem]);

        React.useEffect(() => {
            if (globalUnfreezeTrigger > 0) {
                if (rbRef.current) {
                    const defaultType = props.type === 'fixed' ? 1
                        : props.type === 'kinematicPosition' ? 2
                            : props.type === 'kinematicVelocity' ? 3
                                : 0;
                    rbRef.current.setBodyType(defaultType, true);
                }
            }
        }, [globalUnfreezeTrigger, props.type]);

        // Global reset synchronization
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

        useFrame((state, delta) => {
            if (!groupRef.current) return;

            // Vanish/Appear transitions
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

            const speed = scaleTarget.current === 0 ? 10.0 : 4.0;
            currentScale.current = THREE.MathUtils.lerp(currentScale.current, scaleTarget.current, speed * delta);

            if (Math.abs(currentScale.current - scaleTarget.current) < 0.01) {
                currentScale.current = scaleTarget.current;
            }

            groupRef.current.scale.setScalar(currentScale.current);

            if (isVanishing.current && currentScale.current === 0) {
                isVanishing.current = false;
                delayTimer.current = 0;
                isWaitingToAppear.current = true;
            }
        });

        return (
            <React.Fragment key={remountKey}>
                <RigidBody ref={rbRef} position={position} rotation={rotation} {...props}>
                    <group ref={groupRef}>
                        {children}
                    </group>
                </RigidBody>
            </React.Fragment>
        );
    }
);

ResettableRigidBody.displayName = 'ResettableRigidBody';
