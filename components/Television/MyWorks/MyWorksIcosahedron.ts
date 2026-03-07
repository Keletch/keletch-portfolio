// Icosahedron logic for the interactive video gallery
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
];
const ICO_FACES = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

export interface FaceParticle {
    cx: number; cy: number; rot: number; size: number;
    vx: number; vy: number; vr: number; vs: number;
    videoIndex: number; // 0-9 for staggered timelines
}

export interface IcoDeepState {
    angleX: number;
    angleY: number;
    faces: FaceParticle[];
    vOffsets: Float32Array;
    vVelocities: Float32Array;
    chromaEnergy: number; // New: Tracks interaction intensity (0 to 1)
}

function hash(n: number): number {
    const x = Math.sin(n * 123.456 + 789.123) * 10000;
    return x - Math.floor(x);
}

export function initIcoDeepState(): IcoDeepState {
    const faces = ICO_FACES.map((_, i) => {
        return {
            cx: 0.2 + hash(i + 1) * 0.6,
            cy: 0.2 + hash(i + 2) * 0.6,
            rot: hash(i + 3) * Math.PI * 2,
            size: 0.18 + hash(i + 4) * 0.12,
            vx: (hash(i + 5) - 0.5) * 0.02,
            vy: (hash(i + 6) - 0.5) * 0.02,
            vr: (hash(i + 7) - 0.5) * 0.05,
            vs: (hash(i + 8) - 0.5) * 0.005,
            videoIndex: Math.floor(hash(i + 9) * 6)
        };
    });

    return {
        angleX: Math.random() * Math.PI,
        angleY: Math.random() * Math.PI,
        faces,
        vOffsets: new Float32Array(ICO_VERTS.length * 2),
        vVelocities: new Float32Array(ICO_VERTS.length * 2),
        chromaEnergy: 0 // Start B&W
    };
}

// Physics and interaction state update
export function updateIcoDeepState(
    state: IcoDeepState,
    delta: number,
    mouse?: { x: number; y: number },
    mouseVel?: { x: number; y: number }
) {
    // Clamp delta to prevent physics explosions
    const safeDelta = Math.min(delta, 0.05);

    state.angleX += safeDelta * 0.05;
    state.angleY += safeDelta * 0.04;

    const springK = 15.0;
    const damping = 0.85;
    const mouseStrength = 0.8;

    for (let i = 0; i < ICO_VERTS.length; i++) {
        const i2 = i * 2;
        const offX = state.vOffsets[i2];
        const offY = state.vOffsets[i2 + 1];
        let velX = state.vVelocities[i2];
        let velY = state.vVelocities[i2 + 1];

        // Physics forces: Spring and mouse impulse
        const fx = -offX * springK;
        const fy = -offY * springK;

        // Mouse impulse
        if (mouse && mouseVel) {
            const vBase = ICO_VERTS[i];
            const scale = 65;
            const x1 = vBase[0] * Math.cos(state.angleY) - vBase[2] * Math.sin(state.angleY);
            const z1 = vBase[0] * Math.sin(state.angleY) + vBase[2] * Math.cos(state.angleY);
            const y2 = vBase[1] * Math.cos(state.angleX) - z1 * Math.sin(state.angleX);

            const px = x1 * scale;
            const py = y2 * scale;

            const dx = px + offX - mouse.x;
            const dy = py + offY - mouse.y;
            const distSq = dx * dx + dy * dy;

            const globalRadiusSq = 180 * 180;
            const falloff = Math.exp(-distSq / (globalRadiusSq * 0.2));
            const speed = Math.sqrt(mouseVel.x * mouseVel.x + mouseVel.y * mouseVel.y);
            const impulse = Math.min(speed, 400) * mouseStrength * falloff;

            const dist = Math.sqrt(distSq);
            if (dist > 1) {
                velX += (dx / dist) * impulse;
                velY += (dy / dist) * impulse;
            }
        }

        // Integration
        velX = (velX + fx * safeDelta) * damping;
        velY = (velY + fy * safeDelta) * damping;

        state.vOffsets[i2] = offX + velX * safeDelta;
        state.vOffsets[i2 + 1] = offY + velY * safeDelta;
        state.vVelocities[i2] = velX;
        state.vVelocities[i2 + 1] = velY;
    }

    // Interaction-driven color energy
    let mouseSpeed = 0;
    if (mouseVel) {
        mouseSpeed = Math.sqrt(mouseVel.x * mouseVel.x + mouseVel.y * mouseVel.y);
    }
    const mouseInput = Math.min(mouseSpeed * 0.003, 1.0);

    // Asymmetric buildup and decay
    if (mouseInput > state.chromaEnergy) {
        state.chromaEnergy += (mouseInput - state.chromaEnergy) * (safeDelta * 0.15);
    } else {
        state.chromaEnergy += (mouseInput - state.chromaEnergy) * (safeDelta * 3.0);
    }
    state.chromaEnergy = Math.max(0, Math.min(1, state.chromaEnergy));


    state.faces.forEach((p, i) => {
        const localDelta = safeDelta * (0.9 + hash(i + 10) * 0.2);
        p.cx += p.vx * localDelta;
        p.cy += p.vy * localDelta;
        p.rot += p.vr * localDelta;
        p.size += p.vs * localDelta;

        const b = 0.15 + hash(i + 11) * 0.1;
        if (p.cx < b || p.cx > 1 - b) { p.vx *= -1; p.cx = Math.max(b, Math.min(1 - b, p.cx)); }
        if (p.cy < b || p.cy > 1 - b) { p.vy *= -1; p.cy = Math.max(b, Math.min(1 - b, p.cy)); }
        if (p.size < 0.14 || p.size > 0.32) { p.vs *= -1; p.size = Math.max(0.14, Math.min(0.32, p.size)); }
        p.rot %= (Math.PI * 2);
    });
}

function mapTriangle(
    ctx: CanvasRenderingContext2D,
    img: HTMLVideoElement,
    sx0: number, sy0: number,
    sx1: number, sy1: number,
    sx2: number, sy2: number,
    dx0: number, dy0: number,
    dx1: number, dy1: number,
    dx2: number, dy2: number
) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx0, dy0);
    ctx.lineTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.closePath();
    ctx.clip();

    const det = sx0 * (sy1 - sy2) - sx1 * (sy0 - sy2) + sx2 * (sy0 - sy1);
    if (Math.abs(det) < 0.0001) {
        ctx.restore();
        return;
    }

    // Stable affine transform
    const dxa = dx1 - dx0;
    const dya = dy1 - dy0;
    const dxb = dx2 - dx0;
    const dyb = dy2 - dy0;

    const sxa = sx1 - sx0;
    const sya = sy1 - sy0;
    const sxb = sx2 - sx0;
    const syb = sy2 - sy0;

    const idet = 1 / (sxa * syb - sxb * sya);

    const ma = (dxa * syb - dxb * sya) * idet;
    const mb = (dya * syb - dyb * sya) * idet;
    const mc = (dxb * sxa - dxa * sxb) * idet;
    const md = (dyb * sxa - dya * sxb) * idet;

    ctx.transform(ma, mb, mc, md, dx0 - ma * sx0 - mc * sy0, dy0 - mb * sx0 - md * sy0);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
}

// Pre-allocate arrays for rendering to avoid GC pressure
const projectedVerts = new Float32Array(ICO_VERTS.length * 3); // x, y, z
const faceSortArray: { id: number, z: number }[] = ICO_FACES.map((_, i) => ({ id: i, z: 0 }));

export function drawChaoticIcosahedronVideo(
    ctx: CanvasRenderingContext2D,
    videos: HTMLVideoElement[],
    opacity: number,
    state: IcoDeepState
) {
    if (opacity < 0.01 || !state || !videos || videos.length === 0) return;

    ctx.save();
    const scale = 65;
    const { angleX, angleY, chromaEnergy } = state;

    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    for (let i = 0; i < ICO_VERTS.length; i++) {
        const v = ICO_VERTS[i];
        const i3 = i * 3;
        const i2 = i * 2;

        const x1 = v[0] * cosY - v[2] * sinY;
        const z1 = v[0] * sinY + v[2] * cosY;
        const y2 = v[1] * cosX - z1 * sinX;
        const z2 = v[1] * sinX + z1 * cosX;

        projectedVerts[i3] = x1 * scale + state.vOffsets[i2];
        projectedVerts[i3 + 1] = y2 * scale + state.vOffsets[i2 + 1];
        projectedVerts[i3 + 2] = z2;
    }

    for (let i = 0; i < ICO_FACES.length; i++) {
        const f = ICO_FACES[i];
        const z0 = projectedVerts[f[0] * 3 + 2];
        const z1 = projectedVerts[f[1] * 3 + 2];
        const z2 = projectedVerts[f[2] * 3 + 2];
        faceSortArray[i].id = i;
        faceSortArray[i].z = (z0 + z1 + z2) / 3;
    }

    faceSortArray.sort((a, b) => a.z - b.z);

    for (let i = 0; i < faceSortArray.length; i++) {
        const faceId = faceSortArray[i].id;
        const indices = ICO_FACES[faceId];
        const i0 = indices[0] * 3, i1 = indices[1] * 3, i2 = indices[2] * 3;

        const v0x = projectedVerts[i0], v0y = projectedVerts[i0 + 1];
        const v1x = projectedVerts[i1], v1y = projectedVerts[i1 + 1];
        const v2x = projectedVerts[i2], v2y = projectedVerts[i2 + 1];

        const crossZ = (v1x - v0x) * (v2y - v0y) - (v1y - v0y) * (v2x - v0x);
        if (crossZ < 0) continue;

        const p = state.faces[faceId];
        const video = videos[p.videoIndex % videos.length];

        if (video && video.readyState >= 2) {
            const vw = video.videoWidth || 320;
            const vh = video.videoHeight || 180;
            const cx = p.cx * vw;
            const cy = p.cy * vh;
            const rot = p.rot;
            const sizePatch = p.size * Math.min(vw, vh);

            const cosRot = Math.cos(rot), sinRot = Math.sin(rot);
            const cosRot2 = Math.cos(rot + (Math.PI * 2) / 3), sinRot2 = Math.sin(rot + (Math.PI * 2) / 3);
            const cosRot3 = Math.cos(rot + (Math.PI * 4) / 3), sinRot3 = Math.sin(rot + (Math.PI * 4) / 3);

            const s0x = Math.max(0, Math.min(vw, cx + cosRot * sizePatch));
            const s0y = Math.max(0, Math.min(vh, cy + sinRot * sizePatch));
            const s1x = Math.max(0, Math.min(vw, cx + cosRot2 * sizePatch));
            const s1y = Math.max(0, Math.min(vh, cy + sinRot2 * sizePatch));
            const s2x = Math.max(0, Math.min(vw, cx + cosRot3 * sizePatch));
            const s2y = Math.max(0, Math.min(vh, cy + sinRot3 * sizePatch));

            ctx.globalAlpha = opacity;

            // Apply grayscale BEFORE drawing — video is BORN in B&W, never flashes color
            const desaturationAmt = 1.0 - chromaEnergy; // 1 = full B&W, 0 = full color
            ctx.filter = desaturationAmt > 0.01 ? `grayscale(${desaturationAmt})` : 'none';

            mapTriangle(ctx, video, s0x, s0y, s1x, s1y, s2x, s2y, v0x, v0y, v1x, v1y, v2x, v2y);

            ctx.filter = 'none'; // Reset filter for wireframe

        } else {
            // Video transition / loading -> Transparent
        }

        // RGB Chromatic Aberration Wireframe
        const wireAbberation = 2.0;
        ctx.globalCompositeOperation = 'screen'; // Additive blending for RGB

        // RED Channel (Shift Left)
        ctx.beginPath();
        ctx.moveTo(v0x - wireAbberation, v0y); ctx.lineTo(v1x - wireAbberation, v1y); ctx.lineTo(v2x - wireAbberation, v2y);
        ctx.closePath();
        ctx.globalAlpha = opacity * 0.4;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // GREEN Channel (Center)
        ctx.beginPath();
        ctx.moveTo(v0x, v0y - wireAbberation); ctx.lineTo(v1x, v1y - wireAbberation); ctx.lineTo(v2x, v2y - wireAbberation);
        ctx.closePath();
        ctx.globalAlpha = opacity * 0.4;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.stroke();

        // BLUE Channel (Shift Right)
        ctx.beginPath();
        ctx.moveTo(v0x + wireAbberation, v0y); ctx.lineTo(v1x + wireAbberation, v1y); ctx.lineTo(v2x + wireAbberation, v2y);
        ctx.closePath();
        ctx.globalAlpha = opacity * 0.4;
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over'; // Reset
    }
    ctx.restore();
}
