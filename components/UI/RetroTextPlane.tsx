import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RetroTextPlaneProps {
    text: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale?: number;
    fontSize?: number;
    opacity?: number;
    color?: string;
    enableJitter?: boolean;
    isHorizontal?: boolean;
    inverted?: boolean;
    borderRadius?: number;
    onClick?: (e: any) => void;
    onPointerEnter?: (e: any) => void;
    onPointerLeave?: (e: any) => void;
}

export const RetroTextPlane = React.forwardRef<THREE.Mesh, RetroTextPlaneProps>(({
    text,
    position,
    rotation,
    scale = 1.0,
    fontSize = 60,
    opacity = 1.0,
    color = '#ffffff',
    enableJitter = true,
    isHorizontal = false,
    inverted = false,
    borderRadius = 20,
    onClick,
    onPointerEnter,
    onPointerLeave
}, ref) => {

    const localRef = useRef<THREE.Mesh>(null);
    React.useImperativeHandle(ref, () => localRef.current as THREE.Mesh);

    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const { canvas, ctx } = useMemo(() => {
        const c = document.createElement('canvas');
        if (isHorizontal) {
            c.width = 512;
            c.height = 128;
        } else {
            c.width = 128;
            c.height = 512;
        }
        const cx = c.getContext('2d');
        return { canvas: c, ctx: cx };
    }, [isHorizontal]);


    useMemo(() => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureRef.current = tex;
    }, [canvas]);

    useFrame((state) => {
        const mesh = localRef.current;
        if (!ctx || !textureRef.current || !mesh) return;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        let jitterX = 0;
        let jitterY = 0;

        if (enableJitter) {
            jitterX = (Math.random() - 0.5) * 2;
            jitterY = (Math.random() - 0.5) * 2;
        }



        ctx.save();

        if (inverted) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(0, 0, w, h, borderRadius);
            } else {
                ctx.rect(0, 0, w, h);
            }
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';


        const lines = text.split('\n');
        const lineHeight = fontSize * 1.0;
        const totalHeight = lines.length * lineHeight;
        const startY = (h - totalHeight) / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
            const lineY = startY + i * lineHeight;

            let shouldDraw = true;
            if (enableJitter && Math.random() < 0.05) {
                shouldDraw = false;
            }

            if (shouldDraw) {
                ctx.fillText(line, w / 2 + jitterX, lineY + jitterY);
            }
        });

        ctx.restore();
        textureRef.current.needsUpdate = true;
    });

    return (
        <mesh
            ref={localRef}
            position={position}
            rotation={rotation}
            scale={scale}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <planeGeometry args={isHorizontal ? [4, 1] : [1, 4]} />
            <meshBasicMaterial
                map={textureRef.current}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                blending={THREE.NormalBlending}
            />
        </mesh>
    );
});

RetroTextPlane.displayName = 'RetroTextPlane';
