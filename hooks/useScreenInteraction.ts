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

    const updateScreenGaze = (state: RootState, dt: number, aspectCompensation = 1.0) => {
        if (!groupRef.current) return;

        const targetPos = new THREE.Vector3();

        // 1. Find Screen Mesh (Lazy / Cached)
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

        // 2. Get World Position of Screen Center
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

        // 3. Project to 2D Screen Space
        const tvScreenPos = targetPos.project(state.camera);

        // 4. Calculate Mouse Delta
        const gazeX = state.mouse.x - tvScreenPos.x;
        const gazeY = state.mouse.y - tvScreenPos.y;

        // 5. Apply Sensitivity and Offset
        const finalX = (gazeX * sensitivity) + gazeOffset.x;
        const finalY = (invertY ? -gazeY : gazeY) * sensitivity * aspectCompensation + gazeOffset.y;

        // 6. Clamp Normalized Values
        normalizedMouse.current.x = Math.max(-1, Math.min(1, finalX));
        normalizedMouse.current.y = Math.max(-1, Math.min(1, finalY));

        // 7. Smooth LookAt Transition
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
