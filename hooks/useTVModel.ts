import { useMemo, useRef, useEffect } from 'react';
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
                    screenMeshRef.current = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

                    child.material = new THREE.MeshBasicMaterial({
                        map: texture,
                        toneMapped: false,
                        transparent: false,
                        opacity: 1,
                        side: THREE.DoubleSide,
                    });
                } else {
                    // PSX-style nearest-neighbor filtering
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

    // Resource tracking and cleanup to prevent WebGL memory leaks
    useEffect(() => {
        return () => {
            if (screenTextureRef.current) {
                screenTextureRef.current.dispose();
                screenTextureRef.current = null;
            }
            if (screenMeshRef.current?.material) {
                const mat = screenMeshRef.current.material;
                if (Array.isArray(mat)) {
                    mat.forEach(m => m.dispose());
                } else {
                    mat.dispose();
                }
            }
        };
    }, [clonedModel]);

    return {
        clonedModel,
        screenTextureRef,
        screenMeshRef,
        screenAspect
    };
}
