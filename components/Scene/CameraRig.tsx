'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

interface CameraRigProps {
    viewState: 'default' | 'shelf_focus' | 'radio_focus' | 'tv_red_focus' | 'tv_lcd_focus' | 'tv_dirty_focus' | 'tv_typical_focus' | 'tv_lowpoly_focus' | 'tv_typical_gallery';
}

export function CameraRig({ viewState }: CameraRigProps) {
    const { camera, pointer } = useThree();

    const defaultPos = new THREE.Vector3(-3.5, 2.5, 14);
    const defaultLookAt = new THREE.Vector3(-0.2, 1.2, 0);

    const shelfPos = new THREE.Vector3(-0.15, -0.66, 3.05);
    const shelfLookAt = new THREE.Vector3(-2.4, -1.76, -5.0);

    const redTVPos = new THREE.Vector3(-3.0, 1.1, 2.9);
    const redTVLookAt = new THREE.Vector3(-3.02, 0.7, 0.45);

    const lcdTVPos = new THREE.Vector3(-1.9, 2.5, 2.5);
    const lcdTVLookAt = new THREE.Vector3(-1.94, 2.1, 0.45);

    const dirtyTVPos = new THREE.Vector3(-0.5, 1.0, 3.4);
    const dirtyTVLookAt = new THREE.Vector3(-0.55, 0.6, 0);

    const typicalTVPos = new THREE.Vector3(0.75, 2.1, 2.8);
    const typicalTVLookAt = new THREE.Vector3(0.75, 2.2, 0);

    const lowPolyTVPos = new THREE.Vector3(1.6, 0.8, 3.2);
    const lowPolyTVLookAt = new THREE.Vector3(1.6, 0.55, 0);

    const radioPos = new THREE.Vector3(1.40, -0.60, 1.30);
    const radioLookAt = new THREE.Vector3(1.48, -0.70, 0.00);

    const currentLookAt = useRef(defaultLookAt.clone());
    const tempTargetPos = useRef(new THREE.Vector3());
    const tempTargetLookAt = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        // 1. Determine Target Position & LookAt based on State
        let targetPos = defaultPos;
        let targetLookAt = defaultLookAt;

        if (viewState === 'shelf_focus') {
            targetPos = shelfPos;
            targetLookAt = shelfLookAt;
        } else if (viewState === 'tv_red_focus') {
            targetPos = redTVPos;
            targetLookAt = redTVLookAt;
        } else if (viewState === 'tv_lcd_focus') {
            targetPos = lcdTVPos;
            targetLookAt = lcdTVLookAt;
        } else if (viewState === 'tv_dirty_focus') {
            targetPos = dirtyTVPos;
            targetLookAt = dirtyTVLookAt;
        } else if (viewState === 'tv_typical_focus' || viewState === 'tv_typical_gallery') {
            targetPos = typicalTVPos;
            targetLookAt = typicalTVLookAt;
        } else if (viewState === 'tv_lowpoly_focus') {
            targetPos = lowPolyTVPos;
            targetLookAt = lowPolyTVLookAt;
        } else if (viewState === 'radio_focus') {
            targetPos = radioPos;
            targetLookAt = radioLookAt;
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

        const step = 0.05;
        camera.position.lerp(targetPos, step);
        currentLookAt.current.lerp(targetLookAt, step);
        camera.lookAt(currentLookAt.current);
    });

    return null;
}
