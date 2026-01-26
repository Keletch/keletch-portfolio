import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface UseTVModelProps {
    modelPath: string;
    screenNames: string[];
    rotationX: number;
    modelYOffset: number;
    uvRotation: number;
}

export function useTVModel({ modelPath, screenNames, rotationX, modelYOffset, uvRotation }: UseTVModelProps) {
    const { scene: model } = useGLTF(modelPath);

    // Refs to expose to parent
    const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const screenMeshRef = useRef<THREE.Mesh | null>(null);
    const screenAspect = useRef(1.0);

    const clonedModel = useMemo(() => {
        if (!model) return null;

        const clone = model.clone();
        let screenFound = false;

        // 1. Create shared texture for this instance
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.set(1, 1);
        texture.offset.set(0, 0);
        texture.rotation = uvRotation;
        texture.center.set(0.5, 0.5);

        screenTextureRef.current = texture;

        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const childNameLower = child.name.toLowerCase();
                const isScreen = screenNames.some(name => childNameLower.includes(name.toLowerCase()));

                if (isScreen) {
                    screenFound = true;
                    child.geometry.computeBoundingBox();
                    const box = child.geometry.boundingBox;
                    if (box && screenAspect.current === 1.0) {
                        const width = box.max.x - box.min.x;
                        const height = box.max.y - box.min.y;
                        screenAspect.current = width / height;
                    }

                    child.userData.isScreen = true;
                    // Reference will be captured by ref in parent or we traverse again. 
                    // Actually, let's capture it here if we can, but since this is useMemo, refs are safe to mutate.
                    screenMeshRef.current = child;

                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        toneMapped: false,
                        transparent: false,
                        opacity: 1,
                        side: THREE.DoubleSide,
                    });
                } else {
                    // Look PSX / Cartoon process
                    if (child.material) {
                        const processMaterial = (mat: any) => {
                            if (mat.map) {
                                mat.map.minFilter = THREE.NearestFilter;
                                mat.map.magFilter = THREE.NearestFilter;
                                mat.map.needsUpdate = true;
                            }
                            mat.flatShading = true;
                            mat.needsUpdate = true;
                        };

                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => processMaterial(m));
                        } else {
                            processMaterial(child.material);
                        }
                    }
                }
            }
        });

        if (!screenFound) {
            console.warn(`WARNING: No screen found in ${modelPath}`);
        }

        clone.rotation.x = rotationX;
        clone.position.y = modelYOffset;

        return clone;
    }, [model, modelPath, modelYOffset, rotationX, screenNames, uvRotation]);

    return {
        clonedModel,
        screenTextureRef,
        screenMeshRef,
        screenAspect
    };
}
