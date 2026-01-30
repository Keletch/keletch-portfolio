
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

    ctx.globalAlpha = 0.8;

    const startK = 0.77;
    const endK = 0.25;
    const k = startK * (1 - p) + endK * p;

    let jx = 0;
    let jy = 0;
    if (p > 0.8) {
        jx = (Math.random() - 0.5) * 3 * p;
        jy = (Math.random() - 0.5) * 3 * p;
    }
    const cx = btnX + jx;
    const cy = btnY + jy;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

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

    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';

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
    ctx.globalAlpha = 1.0;
}

export function drawBackButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pBack = hoverProgress;

    ctx.globalAlpha = 0.8;

    const rBack = 8;
    const startWidthBack = rBack * 2;
    const endWidthBack = 4;
    const startHeightBack = rBack * 2;
    const endHeightBack = 18;
    const startRadiusBack = rBack;
    const endRadiusBack = 2;

    let phase1ProgressBack = Math.min(pBack * 2, 1.0);
    let phase2ProgressBack = Math.max((pBack - 0.5) * 2, 0);

    const widthBack = startWidthBack * (1 - phase1ProgressBack) + endWidthBack * phase1ProgressBack;
    const heightBack = startHeightBack * (1 - phase1ProgressBack) + endHeightBack * phase1ProgressBack;
    const cornerRadiusBack = startRadiusBack * (1 - phase1ProgressBack) + endRadiusBack * phase1ProgressBack;

    let jxBack = 0;
    let jyBack = 0;
    if (pBack > 0.8) {
        jxBack = (Math.random() - 0.5) * 3 * pBack;
        jyBack = (Math.random() - 0.5) * 3 * pBack;
    }
    const cxBack = btnX + jxBack;
    const cyBack = btnY + jyBack;

    ctx.fillStyle = color;

    const rotationAngleBack1 = -0.5;
    ctx.save();
    ctx.translate(cxBack, cyBack);
    ctx.rotate(rotationAngleBack1);
    ctx.beginPath();
    drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
    ctx.fill();
    ctx.restore();

    if (phase2ProgressBack > 0) {
        const rotationAngleBack2 = 0.5;
        const alphaBack2 = phase2ProgressBack;

        ctx.save();
        ctx.globalAlpha = 0.8 * alphaBack2;
        ctx.translate(cxBack, cyBack);
        ctx.rotate(rotationAngleBack2);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -widthBack / 2, -heightBack / 2, widthBack, heightBack, cornerRadiusBack);
        ctx.fill();
        ctx.restore();
    }

    ctx.globalAlpha = 1.0;
}

export function drawMenuButton(
    ctx: CanvasRenderingContext2D,
    btnX: number,
    btnY: number,
    hoverProgress: number,
    color: string = '#ffffff'
) {
    const pMenu = hoverProgress;

    ctx.globalAlpha = 0.8;

    const rMenu = 8;
    const startWidth = rMenu * 2;
    const endWidth = 4;
    const startHeight = rMenu * 2;
    const endHeight = 18;
    const startRadius = rMenu;
    const endRadius = 2;

    let phase1Progress = Math.min(pMenu * 2, 1.0);
    let phase2Progress = Math.max((pMenu - 0.5) * 2, 0);

    const width = startWidth * (1 - phase1Progress) + endWidth * phase1Progress;
    const height = startHeight * (1 - phase1Progress) + endHeight * phase1Progress;
    const cornerRadius = startRadius * (1 - phase1Progress) + endRadius * phase1Progress;

    let jxMenu = 0;
    let jyMenu = 0;
    if (pMenu > 0.8) {
        jxMenu = (Math.random() - 0.5) * 2 * pMenu;
        jyMenu = (Math.random() - 0.5) * 2 * pMenu;
    }

    const cxMenu = btnX + jxMenu;
    const cyMenu = btnY + jyMenu;

    ctx.fillStyle = color;

    if (phase2Progress > 0) {
        const barSpacing = 6 * phase2Progress;
        const rotationAngle = -0.5 * phase2Progress;

        ctx.save();
        ctx.translate(cxMenu - barSpacing, cyMenu);
        ctx.rotate(rotationAngle);
        ctx.beginPath();
        drawPixelRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();

        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu + barSpacing - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();
    } else {
        ctx.beginPath();
        drawPixelRoundedRect(ctx, cxMenu - width / 2, cyMenu - height / 2, width, height, cornerRadius);
        ctx.fill();
    }

    ctx.globalAlpha = 1.0;
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



