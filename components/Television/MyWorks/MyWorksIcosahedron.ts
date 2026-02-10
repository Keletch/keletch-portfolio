// 3D Icosahedron Helper for Chaotic Video - STAGGERED LOOP ENGINE (Frame-Shatter v10)
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
    // Stateful vertex physics (12 vertices of an icosahedron)
    vOffsets: { x: number; y: number }[];
    vVelocities: { x: number; y: number }[];
}

function hash(n: number): number {
    const x = Math.sin(n * 123.456 + 789.123) * 10000;
    return x - Math.floor(x);
}

export function initIcoDeepState(): IcoDeepState {
    const faces = ICO_FACES.map((_, i) => {
        const h = hash(i);
        return {
            cx: 0.2 + hash(i + 1) * 0.6,
            cy: 0.2 + hash(i + 2) * 0.6,
            rot: hash(i + 3) * Math.PI * 2,
            size: 0.18 + hash(i + 4) * 0.12,
            vx: (hash(i + 5) - 0.5) * 0.02,
            vy: (hash(i + 6) - 0.5) * 0.02,
            vr: (hash(i + 7) - 0.5) * 0.05,
            vs: (hash(i + 8) - 0.5) * 0.005,
            // Staggered video timeline index (0-5 for the 6-video shatter buffer)
            videoIndex: Math.floor(hash(i + 9) * 6)
        };
    });

    return {
        angleX: Math.random() * Math.PI,
        angleY: Math.random() * Math.PI,
        faces,
        vOffsets: ICO_VERTS.map(() => ({ x: 0, y: 0 })),
        vVelocities: ICO_VERTS.map(() => ({ x: 0, y: 0 }))
    };
}

export function updateIcoDeepState(
    state: IcoDeepState,
    delta: number,
    mouse?: { x: number; y: number },
    mouseVel?: { x: number; y: number }
) {
    state.angleX += delta * 0.05;
    state.angleY += delta * 0.04;

    // --- Vertex Physics Simulation ---
    const springK = 8.0;   // Spring constant (stiffness)
    const damping = 0.92;  // Viscous damping (0-1)
    const mouseRadius = 80;
    const mouseStrength = 0.8;

    state.vOffsets.forEach((off, i) => {
        const vel = state.vVelocities[i];

        // 1. Spring force towards center (elastic recovery)
        const fx = -off.x * springK;
        const fy = -off.y * springK;

        // 2. Mouse impulse (Global Interaction - speed-sensitive stretch)
        if (mouse && mouseVel) {
            const vBase = ICO_VERTS[i];
            const scale = 65;
            let x1 = vBase[0] * Math.cos(state.angleY) - vBase[2] * Math.sin(state.angleY);
            let z1 = vBase[0] * Math.sin(state.angleY) + vBase[2] * Math.cos(state.angleY);
            let y2 = vBase[1] * Math.cos(state.angleX) - z1 * Math.sin(state.angleX);

            const px = x1 * scale;
            const py = y2 * scale;

            const dx = px + off.x - mouse.x;
            const dy = py + off.y - mouse.y;
            const distSq = dx * dx + dy * dy;

            // Sharper Global Falloff: smaller radius for tighter interaction
            const globalRadiusSq = 180 * 180;
            const dist = Math.sqrt(distSq);
            // Sharper exponent (0.2) for faster drop-off
            const falloff = Math.exp(-distSq / (globalRadiusSq * 0.2));

            // Mouse speed impact (limited for stability)
            const speed = Math.sqrt(mouseVel.x * mouseVel.x + mouseVel.y * mouseVel.y);
            const impulse = Math.min(speed, 400) * mouseStrength * falloff;

            if (dist > 1) {
                vel.x += (dx / dist) * impulse;
                vel.y += (dy / dist) * impulse;
            }
        }

        // 3. Integration
        vel.x = (vel.x + fx * delta) * damping;
        vel.y = (vel.y + fy * delta) * damping;

        off.x += vel.x * delta;
        off.y += vel.y * delta;
    });

    state.faces.forEach((p, i) => {
        const localDelta = delta * (0.9 + hash(i + 10) * 0.2);

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

    // Stable affine transform formulas:
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

export function drawChaoticIcosahedronVideo(
    ctx: CanvasRenderingContext2D,
    videos: HTMLVideoElement[],
    opacity: number,
    state: IcoDeepState,
    mouse?: { x: number; y: number } // Added mouse parameter
) {
    if (opacity < 0.01 || !state || !videos || videos.length === 0) return;

    ctx.save();
    const scale = 65;
    const { angleX, angleY } = state;

    const projected = ICO_VERTS.map((v, i) => {
        let x1 = v[0] * Math.cos(angleY) - v[2] * Math.sin(angleY);
        let z1 = v[0] * Math.sin(angleY) + v[2] * Math.cos(angleY);
        let y2 = v[1] * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = v[1] * Math.sin(angleX) + z1 * Math.cos(angleX);

        // Base projected coordinates
        let px = x1 * scale;
        let py = y2 * scale;

        // Apply interactive vertex offsets from physics engine
        const off = state.vOffsets[i];
        px += off.x;
        py += off.y;

        return { x: px, y: py, z: z2 };
    });

    const faces = ICO_FACES.map((faceIndices, i) => {
        const v0 = projected[faceIndices[0]];
        const v1 = projected[faceIndices[1]];
        const v2 = projected[faceIndices[2]];
        const zAvg = (v0.z + v1.z + v2.z) / 3;
        return { indices: faceIndices, z: zAvg, id: i, v0, v1, v2 };
    }).sort((a, b) => a.z - b.z);

    faces.forEach(face => {
        const crossZ = (face.v1.x - face.v0.x) * (face.v2.y - face.v0.y) -
            (face.v1.y - face.v0.y) * (face.v2.x - face.v0.x);

        if (crossZ < 0) return;

        const p = state.faces[face.id];
        const video = videos[p.videoIndex % videos.length];

        if (video && video.readyState >= 2) {
            const vw = video.videoWidth || 320;
            const vh = video.videoHeight || 180;
            const cx = p.cx * vw;
            const cy = p.cy * vh;
            const rot = p.rot;
            const sizePatch = p.size * Math.min(vw, vh);

            const getPoint = (ang: number) => {
                const a = rot + ang;
                return {
                    x: Math.max(0, Math.min(vw, cx + Math.cos(a) * sizePatch)),
                    y: Math.max(0, Math.min(vh, cy + Math.sin(a) * sizePatch))
                };
            };

            const s0 = getPoint(0);
            const s1 = getPoint((Math.PI * 2) / 3);
            const s2 = getPoint((Math.PI * 4) / 3);

            // --- ABERRATION LOGIC (Stress Detection) ---
            const v0off = state.vOffsets[face.indices[0]];
            const v1off = state.vOffsets[face.indices[1]];
            const v2off = state.vOffsets[face.indices[2]];

            // Calculate face stress (avg displacement magnitude)
            const stress = (
                Math.sqrt(v0off.x * v0off.x + v0off.y * v0off.y) +
                Math.sqrt(v1off.x * v1off.x + v1off.y * v1off.y) +
                Math.sqrt(v2off.x * v2off.x + v2off.y * v2off.y)
            ) / 3;

            // DRAW PASS 1: Base texture (Slightly dimmed to allow color layers to pop)
            ctx.globalAlpha = opacity * 0.9;
            mapTriangle(
                ctx, video,
                s0.x, s0.y, s1.x, s1.y, s2.x, s2.y,
                face.v0.x, face.v0.y, face.v1.x, face.v1.y, face.v2.x, face.v2.y
            );

            // DRAW PASS 2 & 3: Vivid Chromatic Aberration (only on stress)
            if (stress > 0.4) {
                const aberrationAmt = Math.min(stress * 0.2, 12);
                const abOpacity = Math.min(stress * 0.1, 0.7);

                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = opacity * abOpacity;

                // Red/Cyan Shift pass 1 (Cyan/Blue-ish)
                // Use high saturation to avoid white-washing
                ctx.filter = 'hue-rotate(180deg) saturate(300%) contrast(1.2)';
                mapTriangle(
                    ctx, video,
                    s0.x, s0.y, s1.x, s1.y, s2.x, s2.y,
                    face.v0.x - aberrationAmt, face.v0.y,
                    face.v1.x - aberrationAmt, face.v1.y,
                    face.v2.x - aberrationAmt, face.v2.y
                );

                // Pass 2 (Red shift)
                ctx.filter = 'hue-rotate(0deg) saturate(300%) contrast(1.2)';
                mapTriangle(
                    ctx, video,
                    s0.x, s0.y, s1.x, s1.y, s2.x, s2.y,
                    face.v0.x + aberrationAmt, face.v0.y,
                    face.v1.x + aberrationAmt, face.v1.y,
                    face.v2.x + aberrationAmt, face.v2.y
                );

                ctx.restore();
                ctx.filter = 'none'; // Reset filter
            }

        } else {
            ctx.beginPath();
            ctx.moveTo(face.v0.x, face.v0.y);
            ctx.lineTo(face.v1.x, face.v1.y);
            ctx.lineTo(face.v2.x, face.v2.y);
            ctx.closePath();
            ctx.fillStyle = `hsl(${face.id * 18}, 60%, 40%)`;
            ctx.fill();
        }

        ctx.globalAlpha = opacity * 0.4;
        ctx.beginPath();
        ctx.moveTo(face.v0.x, face.v0.y);
        ctx.lineTo(face.v1.x, face.v1.y);
        ctx.lineTo(face.v2.x, face.v2.y);
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    ctx.restore();
}
