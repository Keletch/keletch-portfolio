import * as THREE from 'three';

// Applies the CRT barrel distortion math so UV hitboxes match the visual render
export function applyCRTFunction(uv: THREE.Vector2 | { x: number; y: number }, curveIntensity: number): THREE.Vector2 {
    let ux = (uv.x - 0.5) * 2.0;
    let uy = (uv.y - 0.5) * 2.0;

    const offsetX = Math.abs(uy) / curveIntensity;
    const offsetY = Math.abs(ux) / curveIntensity;

    ux = ux + ux * offsetX * offsetX;
    uy = uy + uy * offsetY * offsetY;

    ux = ux * 0.5 + 0.5;
    uy = uy * 0.5 + 0.5;

    return new THREE.Vector2(ux, uy);
}

// Pixel art helpers and drawing functions

export function drawPixelCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    pixelSize: number
) {
    const steps = Math.ceil(radius / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -steps; y <= steps; y += pixelSize) {
        for (let x = -steps; x <= steps; x += pixelSize) {
            if (x * x + y * y <= radius * radius) {
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill();
}

export function drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    pixelSize: number
) {
    const stepX = Math.ceil(rx / pixelSize) * pixelSize;
    const stepY = Math.ceil(ry / pixelSize) * pixelSize;

    ctx.beginPath();
    for (let y = -stepY; y <= stepY; y += pixelSize) {
        for (let x = -stepX; x <= stepX; x += pixelSize) {
            if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
                ctx.rect(Math.floor(cx + x), Math.floor(cy + y), pixelSize, pixelSize);
            }
        }
    }
    ctx.fill();
}

export function drawPixelRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

/**
 * Just traces the rounded rect path without calling fill() or stroke()
 */
export function tracePixelRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

export function drawPixelEye(
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    irisColor: string = '#5090ff',
    lookRange: number = 26,
    scleraColor: string = '#ffffff',
    isHologram: boolean = false
) {
    const pixelSize = 8;

    const pupilX = mousePos.x * lookRange;
    const pupilY = -mousePos.y * lookRange;

    ctx.fillStyle = scleraColor;
    if (isHologram) {
        ctx.strokeStyle = irisColor;
        ctx.lineWidth = 2;
    }

    ctx.shadowBlur = 8;
    ctx.shadowColor = isHologram ? irisColor : "rgba(255,255,255,0.5)";
    drawPixelEllipse(ctx, 0, 0, 80, 60, pixelSize);
    ctx.shadowBlur = 0;

    ctx.fillStyle = irisColor;
    drawPixelCircle(ctx, pupilX, pupilY, 28, pixelSize);

    ctx.fillStyle = isHologram ? 'rgba(0, 50, 0, 0.8)' : '#000000';
    drawPixelCircle(ctx, pupilX, pupilY, 12, pixelSize);

    ctx.fillStyle = '#ffffff';
    drawPixelCircle(ctx, pupilX + 6, pupilY - 6, 6, pixelSize);
}

export function drawConcentricCircles(
    ctx: CanvasRenderingContext2D,
    time: number
) {
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;

    ctx.save();
    ctx.translate(jitterX, 80 + jitterY);

    const numCircles = 12;
    const maxRadius = 150;
    const minRadius = 10;

    const drawCircles = (colorOffset: number, style: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = style;
        ctx.lineWidth = 2;

        for (let i = 0; i < numCircles; i++) {
            const radiusFactor = (i + 1) / numCircles;
            const radius = minRadius + (maxRadius - minRadius) * radiusFactor;

            const speed = 0.3 + (i * 0.15);
            const direction = i % 2 === 0 ? 1 : -1;
            const rotation = time * speed * direction;

            const offsetX = Math.cos(rotation) * (i * 2);
            const offsetY = Math.sin(rotation) * (i * 2);

            ctx.beginPath();
            ctx.arc(offsetX + colorOffset, offsetY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    };

    ctx.globalCompositeOperation = 'screen';
    drawCircles(2, 'rgba(255, 0, 0, 1)', 0.4);
    drawCircles(-2, 'rgba(0, 255, 255, 1)', 0.4);

    ctx.globalCompositeOperation = 'source-over';
    drawCircles(0, '#ffcc99', 1.0);

    ctx.restore();
}

export function applyRetroButtonEffect(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    baseColor: string,
    drawPath: (bx: number, by: number, color: string) => void
) {
    let jx = 0;
    let jy = 0;
    let shouldDraw = true;

    if (hoverProgress > 0.6) {
        const intensity = (hoverProgress - 0.6) * 2.5;
        jx = (Math.random() - 0.5) * 4 * intensity;
        jy = (Math.random() - 0.5) * 4 * intensity;

        if (Math.random() < 0.05) shouldDraw = false;
    }

    if (!shouldDraw) return;

    if (hoverProgress > 0.6) {
        const intensity = (hoverProgress - 0.6) * 2.5;
        const offset = Math.max(0.5, 2 * intensity);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawPath(btnX + jx - offset, btnY + jy, 'rgba(255, 0, 0, 0.8)');
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        drawPath(btnX + jx + offset, btnY + jy, 'rgba(0, 255, 255, 0.8)');
        ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    drawPath(btnX + jx, btnY + jy, baseColor);
    ctx.restore();
}

export function drawButtonShockwave(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hoverProgress: number,
    time: number,
    color: string = '#ffffff'
) {
    const fps = 8;
    const steppedTime = Math.floor(time * fps) / fps;
    const waveProgress = (steppedTime % 2.0) / 2.0;

    const maxRippleSize = 25;
    const rippleRadius = 10 + (waveProgress * maxRippleSize);

    const interactionAlpha = Math.max(0, 1 - (hoverProgress * 5));
    const rippleAlpha = Math.max(0, 1.0 - waveProgress) * interactionAlpha;

    if (rippleAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = rippleAlpha;
        ctx.beginPath();
        ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

export function drawPlayStopButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    morphProgress: number,
    color: string = '#ffffff',
    angle: number = 0
) {
    const p = hoverProgress;
    const m = morphProgress;

    const r = 8 + (5 * p);

    const startK = 0.77;
    const endK = 0.25;
    const k = startK * (1 - p) + endK * p;

    const triV0 = { x: r, y: 0 };
    const triV1 = { x: -0.5 * r, y: -0.866 * r };
    const triV2 = { x: -0.5 * r, y: 0.866 * r };

    const sqSize = r * 1.8;
    const sqV0 = { x: sqSize / 2, y: -sqSize / 2 };
    const sqV1 = { x: -sqSize / 2, y: -sqSize / 2 };
    const sqV2 = { x: -sqSize / 2, y: sqSize / 2 };
    const sqV3 = { x: sqSize / 2, y: sqSize / 2 };

    const v0 = {
        x: triV0.x * (1 - m) + sqV0.x * m,
        y: triV0.y * (1 - m) + sqV0.y * m
    };
    const v1 = {
        x: triV1.x * (1 - m) + sqV1.x * m,
        y: triV1.y * (1 - m) + sqV1.y * m
    };
    const v2 = {
        x: triV2.x * (1 - m) + sqV2.x * m,
        y: triV2.y * (1 - m) + sqV2.y * m
    };
    const v3 = {
        x: triV0.x * (1 - m) + sqV3.x * m,
        y: triV0.y * (1 - m) + sqV3.y * m
    };

    const t0 = { x: 0, y: -r * k };
    const t1 = { x: -0.866 * r * k, y: 0.5 * r * k };
    const t2 = { x: 0.866 * r * k, y: 0.5 * r * k };

    const cornerRadius = 4 * m;

    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = masterAlpha;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();

        if (m < 0.5) {
            ctx.moveTo(v0.x, v0.y);

            ctx.bezierCurveTo(
                v0.x + t0.x * (1 - m * 2), v0.y + t0.y * (1 - m * 2),
                v1.x - t1.x * (1 - m * 2), v1.y - t1.y * (1 - m * 2),
                v1.x, v1.y
            );

            ctx.bezierCurveTo(
                v1.x + t1.x * (1 - m * 2), v1.y + t1.y * (1 - m * 2),
                v2.x - t2.x * (1 - m * 2), v2.y - t2.y * (1 - m * 2),
                v2.x, v2.y
            );

            ctx.bezierCurveTo(
                v2.x + t2.x * (1 - m * 2), v2.y + t2.y * (1 - m * 2),
                v0.x - t0.x * (1 - m * 2), v0.y - t0.y * (1 - m * 2),
                v0.x, v0.y
            );
        } else {
            ctx.moveTo(v0.x - cornerRadius, v0.y);
            ctx.arcTo(v0.x, v0.y, v0.x, v3.y, cornerRadius);
            ctx.arcTo(v0.x, v3.y, v3.x, v3.y, cornerRadius);
            ctx.arcTo(v3.x, v3.y, v2.x, v2.y, cornerRadius);
            ctx.arcTo(v2.x, v2.y, v1.x, v1.y, cornerRadius);
            ctx.arcTo(v1.x, v1.y, v0.x, v0.y, cornerRadius);
        }

        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });
}

export function drawBackButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pBack = hoverProgress;

    const rBack = 8;
    const startWidthBack = rBack * 2;
    const endWidthBack = 4;
    const startHeightBack = rBack * 2;
    const endHeightBack = 18;
    const startRadiusBack = rBack;
    const endRadiusBack = 2;

    const phase1ProgressBack = Math.min(pBack * 2, 1.0);
    const phase2ProgressBack = Math.max((pBack - 0.5) * 2, 0);

    const widthBack = startWidthBack * (1 - phase1ProgressBack) + endWidthBack * phase1ProgressBack;
    const heightBack = startHeightBack * (1 - phase1ProgressBack) + endHeightBack * phase1ProgressBack;
    const cornerRadiusBack = startRadiusBack * (1 - phase1ProgressBack) + endRadiusBack * phase1ProgressBack;

    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.fillStyle = c;
        const rotationAngleBack1 = -0.5;

        ctx.save();
        ctx.globalAlpha = masterAlpha;
        ctx.translate(cx, cy);
        ctx.rotate(rotationAngleBack1);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
        ctx.fill();
        ctx.restore();

        if (phase2ProgressBack > 0) {
            const rotationAngleBack2 = 0.5;
            const alphaBack2 = phase2ProgressBack;

            ctx.save();
            ctx.globalAlpha = 0.8 * alphaBack2 * masterAlpha;
            ctx.translate(cx, cy);
            ctx.rotate(rotationAngleBack2);
            ctx.beginPath();
            drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
            ctx.fill();
            ctx.restore();
        }
    });
}

export function drawMenuButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pMenu = hoverProgress;

    const rMenu = 8;
    const startWidth = rMenu * 2;
    const endWidth = 4;
    const startHeight = rMenu * 2;
    const endHeight = 18;
    const startRadius = rMenu;
    const endRadius = 2;

    const phase1Progress = Math.min(pMenu * 2, 1.0);
    const phase2Progress = Math.max((pMenu - 0.5) * 2, 0);

    const width = startWidth * (1 - phase1Progress) + endWidth * phase1Progress;
    const height = startHeight * (1 - phase1Progress) + endHeight * phase1Progress;
    const cornerRadius = startRadius * (1 - phase1Progress) + endRadius * phase1Progress;

    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = masterAlpha;

        if (phase2Progress > 0) {
            const barSpacing = 6 * phase2Progress;
            const rotationAngle = -0.5 * phase2Progress;

            ctx.save();
            ctx.translate(cx - barSpacing, cy);
            ctx.rotate(rotationAngle);
            ctx.beginPath();
            drawPixelRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
            ctx.fill();
            ctx.restore();

            ctx.beginPath();
            drawPixelRoundedRect(ctx, cx - width / 2, cy - height / 2, width, height, cornerRadius);
            ctx.fill();

            ctx.beginPath();
            drawPixelRoundedRect(ctx, cx + barSpacing - width / 2, cy - height / 2, width, height, cornerRadius);
            ctx.fill();
        } else {
            ctx.beginPath();
            drawPixelRoundedRect(ctx, cx - width / 2, cy - height / 2, width, height, cornerRadius);
            ctx.fill();
        }
    });
}

export function drawHUDRadioIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10; // 10 FPS Retro Elegant

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.globalAlpha = masterAlpha;

        const vibe = Math.sin(steppedTime * 15) * (0.5 + hoverProgress * 1.5);
        const w = 18;
        const h = 12;

        drawPixelRoundedRect(ctx, cx - w / 2, cy - h / 2 + 3 + vibe, w, h, 2);

        // Render speaker grill as cutout
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(cx - 7 + (i * 3), cy + 1 + vibe, 1.5, 6);
        }
        ctx.restore();

        drawPixelCircle(ctx, cx + 4.5, cy + 4 + vibe, 3, 2);

        // Antenna and signal waves
        const bend = Math.cos(steppedTime * 3) * 2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - h / 2 + 3 + vibe);
        ctx.lineTo(cx + 4 + bend, cy - 10 + vibe);
        ctx.stroke();

        drawPixelCircle(ctx, cx + 4.5 + bend, cy - 11 + vibe, 1.5, 1);

        if (hoverProgress > 0) {
            ctx.save();
            ctx.globalAlpha = (0.8 * masterAlpha) * hoverProgress;
            for (let i = 1; i <= 2; i++) {
                const step = (steppedTime * 5 + i) % 3;
                const r = 10 + step * 5;
                ctx.beginPath();
                ctx.arc(cx + 4 + bend, cy - 10 + vibe, r, -1.2, -0.4);
                ctx.stroke();
            }
            ctx.restore();
        }
    });
}

export function drawHUDMenuIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = masterAlpha;

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cx - 1, cy - 9, 4, 18, 2);
        ctx.fill();

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cx + 5, cy - 9, 4, 18, 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx - 7, cy);
        ctx.rotate(-28.6479 * Math.PI / 180);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -2, -9, 4, 18, 2);
        ctx.fill();
        ctx.restore();
    });
}

export function drawHUDSettingsGear(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = masterAlpha;

        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        const outerRadius = 8.5;
        const innerRadius = 5.5;
        for (let i = 0; i < 8; i++) {
            const a1 = (i * Math.PI) / 4 - 0.15;
            const a2 = (i * Math.PI) / 4 + 0.15;

            ctx.lineTo(cx + Math.cos(a1) * innerRadius, cy + Math.sin(a1) * innerRadius);
            ctx.lineTo(cx + Math.cos(a1) * outerRadius, cy + Math.sin(a1) * outerRadius);
            ctx.lineTo(cx + Math.cos(a2) * outerRadius, cy + Math.sin(a2) * outerRadius);
            ctx.lineTo(cx + Math.cos(a2) * innerRadius, cy + Math.sin(a2) * innerRadius);
        }
        ctx.closePath();
        ctx.stroke();
    });
}

export function drawHUDFullscreenIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = masterAlpha;

        const size = 6.5; // distance from center to corner
        const arrow = 3.5; // length of arrow head lines

        ctx.beginPath();
        // Top-Left
        ctx.moveTo(cx - size + arrow, cy - size);
        ctx.lineTo(cx - size, cy - size);
        ctx.lineTo(cx - size, cy - size + arrow);
        ctx.moveTo(cx - size, cy - size);
        ctx.lineTo(cx - 1.5, cy - 1.5);

        // Top-Right
        ctx.moveTo(cx + size - arrow, cy - size);
        ctx.lineTo(cx + size, cy - size);
        ctx.lineTo(cx + size, cy - size + arrow);
        ctx.moveTo(cx + size, cy - size);
        ctx.lineTo(cx + 1.5, cy - 1.5);

        // Bottom-Right
        ctx.moveTo(cx + size - arrow, cy + size);
        ctx.lineTo(cx + size, cy + size);
        ctx.lineTo(cx + size, cy + size - arrow);
        ctx.moveTo(cx + size, cy + size);
        ctx.lineTo(cx + 1.5, cy + 1.5);

        // Bottom-Left
        ctx.moveTo(cx - size + arrow, cy + size);
        ctx.lineTo(cx - size, cy + size);
        ctx.lineTo(cx - size, cy + size - arrow);
        ctx.moveTo(cx - size, cy + size);
        ctx.lineTo(cx - 1.5, cy + 1.5);

        ctx.stroke();
    });
}

export function drawHUDResetIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const masterAlpha = ctx.globalAlpha;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = masterAlpha;

        const radius = 7.5;
        const startAngle = 0.2 * Math.PI;
        const endAngle = 1.8 * Math.PI;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle, false);
        ctx.stroke();

        ctx.save();
        const headX = cx + Math.cos(endAngle) * radius;
        const headY = cy + Math.sin(endAngle) * radius;
        ctx.translate(headX, headY);
        ctx.rotate(endAngle + Math.PI * 0.5);

        ctx.beginPath();
        ctx.moveTo(2.5, 0);
        ctx.lineTo(-2.5, 3.5);
        ctx.lineTo(-2.5, -3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}

/**
 * Draws the HUD Letter (Contact/Email) icon — elegant envelope, right-menu style.
 */
export function drawHUDLetterIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        const w = 22;
        const h = 15;
        const x0 = cx - w / 2;
        const y0 = cy - h / 2;
        const x1 = x0 + w;
        // Flap tip: drops about 70% into the body for a larger, more visible triangle
        const flapDepth = h * 0.70;

        ctx.fillStyle = c;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Envelope body: filled rectangle
        ctx.fillRect(x0, y0, w, h);

        // Flap seam: a V line drawn as a transparent cutout
        // This draws the "fold line" of the envelope flap
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = 2.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0 + 1, y0);
        ctx.lineTo(cx, y0 + flapDepth);
        ctx.lineTo(x1 - 1, y0);
        ctx.stroke();
        ctx.restore();
    });
}

export function drawHUDTVIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const steppedTime = Math.floor(time * 10) / 10;
    const tvW = 26;
    const tvH = 18;
    const cornerR = 4;
    const scrW = 10;
    const scrH = 8;
    const scrXOffset = -2;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        const isMainPass = c.toLowerCase() === color.toLowerCase() || c.startsWith('rgba(');

        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 1. Body Outline
        tracePixelRoundedRect(ctx, cx - tvW / 2, cy - tvH / 2, tvW, tvH, cornerR);
        ctx.stroke();


        // 3. Antennas (Subtle)
        const antLen = 10;
        const wiggle = Math.sin(time * 3.5) * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - tvH / 2);
        ctx.lineTo(cx - 5 - Math.cos(0.7 + wiggle) * antLen, cy - tvH / 2 - Math.sin(0.7 + wiggle) * antLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - tvH / 2);
        ctx.lineTo(cx + 5 + Math.cos(0.7 - wiggle) * (antLen * 0.85), cy - tvH / 2 - Math.sin(0.7 - wiggle) * (antLen * 0.85));
        ctx.stroke();

        // 4. Dials
        const dialX = cx + tvW / 2 - 4.5;
        ctx.fillRect(dialX, cy - 3, 2, 2);
        ctx.fillRect(dialX, cy + 1, 2, 2);

        // 5. Screen area
        const sx = cx + scrXOffset - scrW / 2;
        const sy = cy - scrH / 2;

        ctx.save();
        ctx.beginPath();
        drawPixelRoundedRect(ctx, sx, sy, scrW, scrH, 1);
        ctx.clip();

        // 5a. Noise
        if (isMainPass) {
            const noiseCount = 6;
            for (let i = 0; i < noiseCount; i++) {
                const nx = sx + (Math.abs(Math.sin(i * 99 + steppedTime * 12)) * scrW);
                const ny = sy + (Math.abs(Math.cos(i * 33 + steppedTime * 12)) * scrH);
                ctx.globalAlpha = 0.2 + Math.random() * 0.3;
                ctx.fillStyle = c;
                ctx.fillRect(Math.floor(nx), Math.floor(ny), 1, 1);
            }
        }

        if (hoverProgress > 0.01) {
            ctx.save();
            ctx.globalAlpha = hoverProgress;
            ctx.globalCompositeOperation = 'destination-out';
            
            const sweepSpeed = 50;
            const lineGap = 10;
            const move = (time * sweepSpeed) % 60;

            for (let i = -2; i < 4; i++) {
                const offset = move + (i * lineGap);
                for (let y = 0; y < scrH; y++) {
                    const x = offset - y;
                    if (x >= 0 && x < scrW) {
                        ctx.fillRect(sx + Math.floor(x), sy + y, 2, 1);
                    }
                }
            }
            ctx.restore();
        }
        ctx.restore();

        // 6. Screen border
        tracePixelRoundedRect(ctx, sx, sy, scrW, scrH, 1);
        ctx.stroke();
    });
}

export function drawHUDVisionIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = masterAlpha;

        // Smoother Blink (no disappearing)
        const blinkBase = Math.sin(steppedTime * 4);
        const blinkScale = (blinkBase > 0.95) ? 0.3 : 1;
        const scan = Math.sin(steppedTime * 2) * 2;

        // Smooth Pixel Eye Outer
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, blinkScale);
        drawPixelEllipse(ctx, 0, 0, 10, 7, 2);
        ctx.restore();

        // Iris & Dilating Pupil
        const pupilSize = 3 + (hoverProgress * 3); // Dilation on hover
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        drawPixelCircle(ctx, cx + scan, cy, pupilSize, 1);
        ctx.restore();
    });
}

export function drawHUDMyWorksIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10;
    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = masterAlpha;

        // Rock / Stone / Mineral (More jagged, moved DOWN)
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy + 11);
        ctx.lineTo(cx - 11, cy + 7);
        ctx.lineTo(cx - 5, cy + 4);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.lineTo(cx + 10, cy + 8);
        ctx.lineTo(cx + 8, cy + 12);
        ctx.closePath();
        ctx.stroke();

        // Inner facets
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 4); ctx.lineTo(cx - 1, cy + 8); ctx.lineTo(cx + 5, cy + 5);
        ctx.stroke();

        // Hammer strike animation logic
        const strikeSource = Math.max(0, Math.sin(steppedTime * 14));
        const strike = Math.pow(strikeSource, 0.4) * hoverProgress;
        const float = Math.sin(steppedTime * 3) * 1.5 * (1 - hoverProgress);

        const pivotX = cx + 15;
        const pivotY = cy - 2 + float;
        const hammerRot = -1.3 + (strike * 1.5);

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(hammerRot);

        ctx.fillRect(-2, -15, 4, 15);

        ctx.save();
        ctx.translate(0, -15);
        drawPixelRoundedRect(ctx, -8, -3, 10, 6, 1);

        ctx.beginPath();
        ctx.moveTo(-1, -2);
        ctx.lineTo(8, -1.5);
        ctx.lineTo(7, 2.5);
        ctx.lineTo(-1, 1.5);
        ctx.fill();
        ctx.restore();

        ctx.restore();

        if (strike > 0.9) {
            // Impact Particles / Stone Dust (Sync'd to hit)
            ctx.save();
            ctx.globalAlpha = masterAlpha * hoverProgress;
            ctx.fillStyle = c;
            for (let i = 0; i < 6; i++) {
                const pSeed = Math.floor(steppedTime * 20) + i;
                const px = cx - 1 + (Math.sin(pSeed * 47) * 9);
                const py = cy + 4 - Math.abs(Math.cos(pSeed * 71) * 12);
                const pSize = 1 + (i % 2);
                ctx.fillRect(px, py, pSize, pSize);
            }
            ctx.restore();
        }
    });
}

export function drawHUDAboutMeIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.globalAlpha = masterAlpha;

        // Stable head and ears
        drawPixelCircle(ctx, cx, cy, 9.5, 2);

        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 6);
        ctx.lineTo(cx - 10, cy - 14);
        ctx.lineTo(cx - 2, cy - 8.5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy - 6);
        ctx.lineTo(cx + 10, cy - 14);
        ctx.lineTo(cx + 2, cy - 8.5);
        ctx.fill();

        // Face features with blinking logic
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const blink = Math.sin(steppedTime * 5) > 0.97 ? 0.2 : 1;

        ctx.save();
        ctx.translate(cx - 4, cy - 2);
        ctx.scale(1, blink);
        drawPixelEllipse(ctx, 0, 0, 2.5, 1.5, 1);
        ctx.restore();
        ctx.save();
        ctx.translate(cx + 4, cy - 2);
        ctx.scale(1, blink);
        drawPixelEllipse(ctx, 0, 0, 2.5, 1.5, 1);
        ctx.restore();

        ctx.fillRect(cx - 0.5, cy + 1.2, 1, 1);
        ctx.fillRect(cx - 6, cy + 1, 3, 0.5);
        ctx.fillRect(cx + 3, cy + 1, 3, 0.5);
        ctx.restore();

        // Waving Hand (Greeting)
        const waveAngle = Math.sin(steppedTime * 12) * 0.45 * hoverProgress;
        ctx.save();
        ctx.translate(cx + 7.5, cy + 5);
        ctx.rotate(-0.35 - waveAngle);
        drawPixelRoundedRect(ctx, -2, -6, 5, 9, 3);
        ctx.restore();
    });
}

export function drawHUDLifestyleIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = masterAlpha;

        const w = 18;
        const h = 14;
        const float = Math.sin(steppedTime * 2) * 1.5;

        // Polaroid Body
        drawPixelRoundedRect(ctx, cx - w / 2, cy - h / 2 + float, w, h, 2);
        // Lens
        drawPixelCircle(ctx, cx, cy - 1 + float, 4, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        drawPixelCircle(ctx, cx, cy - 1 + float, 1.5, 1);
        ctx.restore();

        // Viewfinder
        ctx.strokeRect(cx - 7, cy - 5 + float, 3, 2);

        // Photo Printing
        if (hoverProgress > 0) {
            // Faster print speed (1.5s instead of 4s)
            const printDuration = 1.5;
            const printStep = Math.min(1, steppedTime / printDuration);
            const photoH = 10 * hoverProgress * printStep;
            ctx.save();
            ctx.translate(cx - 5, cy + 4 + float);
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, 10, photoH);
            ctx.globalCompositeOperation = 'destination-out';
            if (photoH > 4) ctx.fillRect(1.5, 1.5, 7, photoH - 4);
            ctx.restore();
        }

        // Slot
        ctx.fillRect(cx - 6, cy + 3 + float, 12, 1.5);
    });
}

export function drawHUDExtrasIcon(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff',
    time: number = 0
) {
    const masterAlpha = ctx.globalAlpha;
    const steppedTime = Math.floor(time * 10) / 10;

    applyRetroButtonEffect(ctx, btnX, btnY, hoverProgress, color, (cx, cy, c) => {
        ctx.strokeStyle = c;
        ctx.fillStyle = c;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = masterAlpha;

        const s = 7.5;
        const float = Math.sin(steppedTime * 2) * 2.5;
        const rot = steppedTime * 1.5;

        // Wireframe cube projection
        ctx.save();
        ctx.translate(cx, cy + float);

        const vertices: { x: number; y: number }[] = [];
        for (let i = 0; i < 8; i++) {
            const x = (i & 1 ? 1 : -1) * s;
            const y = (i & 2 ? 1 : -1) * s;
            const z = (i & 4 ? 1 : -1) * s;

            // Rotate Y
            const rx = x * Math.cos(rot) - z * Math.sin(rot);
            const rz = x * Math.sin(rot) + z * Math.cos(rot);
            // Rotate X
            const ry = y * Math.cos(0.5) - rz * Math.sin(0.5);

            // Project
            vertices.push({ x: rx, y: ry });
        }

        const drawEdge = (a: number, b: number) => {
            ctx.beginPath();
            ctx.moveTo(vertices[a].x, vertices[a].y);
            ctx.lineTo(vertices[b].x, vertices[b].y);
            ctx.stroke();
        };

        drawEdge(0, 1); drawEdge(1, 2); drawEdge(2, 3); drawEdge(3, 0);
        drawEdge(4, 5); drawEdge(5, 6); drawEdge(6, 7); drawEdge(7, 4);
        drawEdge(0, 4); drawEdge(1, 5); drawEdge(2, 6); drawEdge(3, 7);

        ctx.restore();

        // Orbiting spheres on hover
        if (hoverProgress > 0) {
            ctx.save();
            ctx.globalAlpha = masterAlpha * hoverProgress;
            for (let i = 0; i < 3; i++) {
                const angle = (steppedTime * 4.5) + (i * Math.PI * 2 / 3);
                const orbitR = 15 + Math.sin(steppedTime * 2 + i) * 3;
                const ox = cx + Math.cos(angle) * orbitR;
                const oy = cy + Math.sin(angle) * orbitR * 0.35 + float;
                drawPixelCircle(ctx, ox, oy, 1.8, 1);
            }
            ctx.restore();
        }
    });
}

export function drawStaticNoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    alpha: number = 1.0
) {
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const noiseSize = 5;
    const cols = Math.ceil(width / noiseSize);
    const rows = Math.ceil(height / noiseSize);

    if (Math.random() > 0.95) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.fillRect(0, 0, width, height);
    }

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            if (Math.random() > 0.4) {
                const gray = Math.floor(Math.random() * 255);
                const r = gray + (Math.random() > 0.9 ? 50 : 0);
                const g = gray + (Math.random() > 0.9 ? 50 : 0);
                const b = gray;
                ctx.fillStyle = `rgba(${r},${g},${b}, ${Math.random() * 0.8})`;
                ctx.fillRect(i * noiseSize, j * noiseSize, noiseSize, noiseSize);
            }
        }
    }

    const shiftAmplitude = 10;
    const numShifts = 5;
    for (let i = 0; i < numShifts; i++) {
        const y = Math.random() * height;
        const h = Math.random() * 50 + 10;
        const shiftX = (Math.random() - 0.5) * shiftAmplitude;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(shiftX, y, width, h);

        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fillRect(-shiftX, y, width, h);
    }

    if (Math.random() > 0.7) {
        const blockX = Math.random() * width;
        const blockY = Math.random() * height;
        const blockW = Math.random() * 200 + 50;
        const blockH = Math.random() * 40 + 5;

        ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
        ctx.fillRect(blockX, blockY, blockW, blockH);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let y = 0; y < height; y += 3) {
        if (y % 6 === 0) {
            ctx.fillRect(0, y, width, 1);
        }
    }

    const barY = (time * 150) % (height + 200) - 100;
    const barHeight = 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, barY, width, barHeight);

    if (Math.random() > 0.8) {
        ctx.fillRect(0, barY + (Math.random() * 50 - 25), width, barHeight / 2);
    }

    ctx.restore();
}



export function drawZoomTutorial(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    opacity: number = 1.0,
    flicker: number = 1.0
) {
    if (opacity <= 0.01 || flicker <= 0.01) return;

    ctx.save();
    
    const steppedTime = Math.floor(time * 12) / 12;
    const pinchProgress = (Math.sin(steppedTime * 4) + 1) / 2;
    // Balanced size for mobile readability
    ctx.font = 'bold 20px "Courier New", monospace';
    const textStr = 'Ajusta el zoom con los dedos';
    const textMetrics = ctx.measureText(textStr);
    const boxW = textMetrics.width + 85; 
    const boxH = 64; 
    const x = (w - boxW) / 2;
    const y = (h - boxH) / 2;

    const accentColor = '#4af626';

    // Intense Glitch/Flicker effect for transitions
    let finalFlicker = flicker;
    if (flicker < 0.9) {
        if (Math.random() > 0.8) finalFlicker *= (0.3 + Math.random() * 0.5);
    }

    ctx.globalAlpha = opacity * finalFlicker;

    // Very Subtle Glow - back to original feel
    ctx.shadowBlur = 0.5 * finalFlicker;
    ctx.shadowColor = 'rgba(74, 246, 38, 0.2)';

    // Background - Solid black as requested
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    drawPixelRoundedRect(ctx, x, y, boxW, boxH, 4);
    
    // Border - Lower width for original look
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);

    // Subtle Ghosting during glitch
    if (flicker < 0.9 && Math.random() > 0.8) {
        ctx.strokeStyle = 'rgba(74, 246, 38, 0.3)';
        const gx = (Math.random() - 0.5) * 4;
        const gy = (Math.random() - 0.5) * 3;
        ctx.strokeRect(x + 1 + gx, y + 1 + gy, boxW - 2, boxH - 2);
    }

    ctx.shadowBlur = 0;

    // Text
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Stable position when not flickering
    const jitterAmount = flicker < 0.9 ? 2.0 : 0.0;
    const jitterX = (Math.random() - 0.5) * jitterAmount;
    const jitterY = (Math.random() - 0.5) * jitterAmount;
    ctx.fillText(textStr, x + 70 + jitterX, y + boxH / 2 + jitterY);

    // Scanline / Glitch line
    if (flicker < 0.9 && Math.random() > 0.8) {
        ctx.fillStyle = 'rgba(74, 246, 38, 0.2)';
        ctx.fillRect(x, y + Math.random() * boxH, boxW, 2);
    }

    // Diagonal Arrows Icon (separating and returning)
    const iconX = x + 35;
    const iconY = y + boxH / 2;

    ctx.save();
    ctx.translate(iconX, iconY);
    
    const travel = 8;
    const off = pinchProgress * travel;
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Arrow 1: Top-Right
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(off + 6, -off - 6);
    ctx.stroke();
    
    // Arrow Head 1
    ctx.beginPath();
    ctx.moveTo(off + 2, -off - 6);
    ctx.lineTo(off + 6, -off - 6);
    ctx.lineTo(off + 6, -off - 2);
    ctx.stroke();

    // Arrow 2: Bottom-Left
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-off - 6, off + 6);
    ctx.stroke();

    // Arrow Head 2
    ctx.beginPath();
    ctx.moveTo(-off - 2, off + 6);
    ctx.lineTo(-off - 6, off + 6);
    ctx.lineTo(-off - 6, off + 2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
}
