'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef, useEffect } from 'react';
import { useSettingsStore } from '@/components/store/useSettingsStore';

interface CameraRigProps {
    viewState: 'default' | 'shelf_focus' | 'radio_focus' | 'tv_red_focus' | 'tv_lcd_focus' | 'tv_dirty_focus' | 'tv_typical_focus' | 'tv_lowpoly_focus' | 'tv_typical_gallery' | 'tv_settings_focus' | 'tv_mobile_focus';
}

export function CameraRig({ viewState }: CameraRigProps) {
    const { camera, pointer, scene } = useThree();
    const isTopDownView = useSettingsStore(state => state.isTopDownView);
    const toggleTopDownView = useSettingsStore(state => state.toggleTopDownView);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                if (viewState === 'default' && !useSettingsStore.getState().isDragging) {
                    toggleTopDownView();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewState, toggleTopDownView]);

    const defaultPos = new THREE.Vector3(-3.5, 2.5, 14);
    const defaultLookAt = new THREE.Vector3(-0.2, 1.2, 0);



    const currentPos = useRef(defaultPos.clone());
    const currentLookAt = useRef(defaultLookAt.clone());
    const currentUp = useRef(new THREE.Vector3(0, 1, 0));
    const tempTargetPos = useRef(new THREE.Vector3());
    const tempTargetLookAt = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        // Default camera targets
        let targetPos = defaultPos;
        let targetLookAt = defaultLookAt;
        const targetUp = new THREE.Vector3(0, 1, 0);

        const dynamicTVs = ['shelf_focus', 'radio_focus', 'tv_settings_focus', 'tv_dirty_focus', 'tv_typical_focus', 'tv_typical_gallery', 'tv_lowpoly_focus', 'tv_red_focus', 'tv_lcd_focus', 'tv_mobile_focus'];

        if (dynamicTVs.includes(viewState)) {
            // Dynamic anchoring to physics bodies
            const baseState = viewState === 'tv_typical_gallery' ? 'tv_typical_focus' : viewState;
            const camPosNode = scene.getObjectByName(`${baseState}_cam_pos`);
            const lookAtNode = scene.getObjectByName(`${baseState}_cam_lookat`);

            if (camPosNode && lookAtNode) {
                targetPos = camPosNode.getWorldPosition(new THREE.Vector3());
                targetLookAt = lookAtNode.getWorldPosition(new THREE.Vector3());

                if (viewState === 'tv_mobile_focus') {
                    // Mobile is vertical, camera up needs to rotate with it
                    const quat = camPosNode.getWorldQuaternion(new THREE.Quaternion());
                    targetUp.set(0, 1, 0).applyQuaternion(quat);
                } else {
                    targetUp.set(0, 1, 0);
                }
            }
        } else if (isTopDownView) {
            targetPos = new THREE.Vector3(0, 15, 0);
            targetLookAt = new THREE.Vector3(0, 0, 0);
            targetUp.set(0, 0, -1);
        } else {
            tempTargetPos.current.set(
                defaultPos.x + pointer.x * 0.5,
                defaultPos.y + pointer.y * 0.5,
                defaultPos.z
            );
            targetPos = tempTargetPos.current;

            tempTargetLookAt.current.set(
                defaultLookAt.x + pointer.x * 0.2,
                defaultLookAt.y + pointer.y * 0.2,
                defaultLookAt.z
            );
            targetLookAt = tempTargetLookAt.current;
        }

        const step = 5 * delta;
        currentPos.current.lerp(targetPos, step);
        currentLookAt.current.lerp(targetLookAt, step);
        currentUp.current.lerp(targetUp, step).normalize();

        camera.position.copy(currentPos.current); // Update camera position from currentPos ref
        camera.up.copy(currentUp.current);

        const settings = useSettingsStore.getState();
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        if (perspectiveCamera.isPerspectiveCamera) {
            perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, settings.cameraFOV, delta * 5);
            perspectiveCamera.updateProjectionMatrix();
        }

        camera.lookAt(currentLookAt.current);
    });

    return null;
}
