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



    const touchZoomOffset = useRef(0);
    const touchPanOffset = useRef(new THREE.Vector2(0, 0));
    const pinchStartDist = useRef(0);
    const panStartMidpoint = useRef(new THREE.Vector2(0, 0));
    const baseFovOffset = useRef(0);
    const basePanOffset = useRef(new THREE.Vector2(0, 0));

    // Reset touch adjustments when changing views
    useEffect(() => {
        touchZoomOffset.current = 0;
        touchPanOffset.current.set(0, 0);
        baseFovOffset.current = 0;
        basePanOffset.current.set(0, 0);
        pinchStartDist.current = 0;
    }, [viewState]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
                
                panStartMidpoint.current.set(
                    (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    (e.touches[0].clientY + e.touches[1].clientY) / 2
                );
                
                baseFovOffset.current = touchZoomOffset.current;
                basePanOffset.current.copy(touchPanOffset.current);
            }
        };
        
        const handleTouchMove = (e: TouchEvent) => {
            // Only allow gestures when zoomed into a TV
            if (viewState === 'default') return;

            if (e.touches.length === 2 && pinchStartDist.current > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Zoom: pinch out (dist > start) = negative delta (decrease FOV)
                // Pinch in (dist < start) = positive delta (increase FOV)
                const zoomDelta = (pinchStartDist.current - dist) * 0.1;
                touchZoomOffset.current = THREE.MathUtils.clamp(baseFovOffset.current + zoomDelta, -25, 25);
                
                const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                // Pan: movement relative to screen mapped to camera right/up
                const panX = (panStartMidpoint.current.x - mx) * 0.004; 
                const panY = (my - panStartMidpoint.current.y) * 0.004;
                
                touchPanOffset.current.set(
                    THREE.MathUtils.clamp(basePanOffset.current.x + panX, -2.5, 2.5),
                    THREE.MathUtils.clamp(basePanOffset.current.y + panY, -2.5, 2.5)
                );
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, [viewState]);

    const defaultPos = new THREE.Vector3(-3.5, 2.5, 14);
    const defaultLookAt = new THREE.Vector3(-0.2, 1.2, 0);



    const currentPos = useRef(defaultPos.clone());
    const currentLookAt = useRef(defaultLookAt.clone());
    const currentUp = useRef(new THREE.Vector3(0, 1, 0));
    const tempTargetPos = useRef(new THREE.Vector3());
    const tempTargetLookAt = useRef(new THREE.Vector3());

    useFrame((_state, delta) => {
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

                // Universal orientation matching: align camera UP with the TV's rotation
                // This ensures that if the TV is tilted, the camera tilts with it
                const quat = camPosNode.getWorldQuaternion(new THREE.Quaternion());
                targetUp.set(0, 1, 0).applyQuaternion(quat);
            }
        } else if (isTopDownView) {
            targetPos = new THREE.Vector3(0, 15, 0);
            targetLookAt = new THREE.Vector3(0, 0, 0);
            targetUp.set(0, 0, -1);
        } else {
            const px = pointer.x;
            const py = pointer.y;

            // Mobile specific tilt/gyro overrides removed per user request
            // Just use the pointer coords which work for both touch and mouse


            tempTargetPos.current.set(
                defaultPos.x + px * 0.5,
                defaultPos.y + py * 0.5,
                defaultPos.z
            );
            targetPos = tempTargetPos.current;

            tempTargetLookAt.current.set(
                defaultLookAt.x + px * 0.2,
                defaultLookAt.y + py * 0.2,
                defaultLookAt.z
            );
            targetLookAt = tempTargetLookAt.current;
        }

        // Apply 2-finger touch pan offsets local to the camera's current viewing direction
        if (touchPanOffset.current.x !== 0 || touchPanOffset.current.y !== 0) {
            const forward = new THREE.Vector3().subVectors(targetLookAt, targetPos).normalize();
            const right = new THREE.Vector3().crossVectors(forward, targetUp).normalize();
            const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();

            const panVec = new THREE.Vector3()
                .addScaledVector(right, touchPanOffset.current.x)
                .addScaledVector(actualUp, touchPanOffset.current.y);

            targetPos = targetPos.clone().add(panVec);
            targetLookAt = targetLookAt.clone().add(panVec);
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
            // Apply FOV setting PLUS the 2-finger zoom offset
            perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, settings.cameraFOV + touchZoomOffset.current, delta * 5);
            perspectiveCamera.updateProjectionMatrix();
        }

        camera.lookAt(currentLookAt.current);
    });

    return null;
}
