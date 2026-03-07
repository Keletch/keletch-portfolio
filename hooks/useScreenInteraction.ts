import { useRef } from 'react';
import { useThree, RootState } from '@react-three/fiber';
import * as THREE from 'three';

interface UseScreenInteractionProps {
    groupRef: React.RefObject<THREE.Group>;
    screenNames: string[];
    gazeOffset?: { x: number; y: number };
    invertY?: boolean;
    sensitivity?: number;
}

export function useScreenInteraction({
    groupRef,
    screenNames,
    gazeOffset = { x: 0, y: 0 },
    invertY = false,
    sensitivity = 5.0
}: UseScreenInteractionProps) {
    const screenMeshRef = useRef<THREE.Mesh | null>(null);
    const normalizedMouse = useRef({ x: 0, y: 0 });
    const currentLookAt = useRef({ x: 0, y: 0 });

    const targetPosRef = useRef(new THREE.Vector3());

    const updateScreenGaze = (state: RootState, dt: number, aspectCompensation = 1.0) => {
        if (!groupRef.current) return;

        const targetPos = targetPosRef.current;

        // Cache screen mesh
        if (!screenMeshRef.current) {
            groupRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const childNameLower = child.name.toLowerCase();
                    if (screenNames.some(name => childNameLower.includes(name.toLowerCase()))) {
                        screenMeshRef.current = child;
                    }
                }
            });
        }

        // Get screen center in world space
        if (screenMeshRef.current) {
            const mesh = screenMeshRef.current;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox;
            if (box) {
                box.getCenter(targetPos);
                mesh.localToWorld(targetPos);
            } else {
                mesh.getWorldPosition(targetPos);
            }
        } else {
            groupRef.current.getWorldPosition(targetPos);
        }

        // Project to 2D screen space
        const tvScreenPos = targetPos.project(state.camera);

        let tvX = tvScreenPos.x;
        let tvY = tvScreenPos.y;
        if (Number.isNaN(tvX) || !Number.isFinite(tvX)) tvX = 0;
        if (Number.isNaN(tvY) || !Number.isFinite(tvY)) tvY = 0;

        // Calculate screen-relative gaze
        const gazeX = state.mouse.x - tvX;
        const gazeY = state.mouse.y - tvY;

        const finalX = (gazeX * sensitivity) + gazeOffset.x;
        const finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

        normalizedMouse.current.x = Math.max(-1, Math.min(1, finalX));
        normalizedMouse.current.y = Math.max(-1, Math.min(1, finalY));

        // Interpolate gaze position
        const speed = 2.0 * dt;
        currentLookAt.current.x += (normalizedMouse.current.x - currentLookAt.current.x) * speed;
        currentLookAt.current.y += (normalizedMouse.current.y - currentLookAt.current.y) * speed;
    };

    return {
        screenMeshRef,
        normalizedMouse,
        currentLookAt,
        updateScreenGaze
    };
}
