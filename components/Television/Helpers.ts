
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
    color: string = '#ffffff'
) {
    const p = hoverProgress;
    const m = morphProgress; // 0 = triangle, 1 = rounded square

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

    // Triangle vertices (play button)
    const triV0 = { x: r, y: 0 };
    const triV1 = { x: -0.5 * r, y: -0.866 * r };
    const triV2 = { x: -0.5 * r, y: 0.866 * r };

    // Square vertices (stop button) - slightly larger to match visual size
    const sqSize = r * 1.8;
    const sqV0 = { x: sqSize / 2, y: -sqSize / 2 };    // top-right
    const sqV1 = { x: -sqSize / 2, y: -sqSize / 2 };   // top-left
    const sqV2 = { x: -sqSize / 2, y: sqSize / 2 };    // bottom-left
    const sqV3 = { x: sqSize / 2, y: sqSize / 2 };     // bottom-right

    // Interpolate vertices
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
    // v3 only exists for square (interpolate from v0)
    const v3 = {
        x: triV0.x * (1 - m) + sqV3.x * m,
        y: triV0.y * (1 - m) + sqV3.y * m
    };

    // Bezier control points (for triangle smoothing)
    const t0 = { x: 0, y: -r * k };
    const t1 = { x: -0.866 * r * k, y: 0.5 * r * k };
    const t2 = { x: 0.866 * r * k, y: 0.5 * r * k };

    // Corner radius for square (only applies when m > 0)
    const cornerRadius = 4 * m;

    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();

    if (m < 0.5) {
        // Triangle-like shape (use bezier curves)
        ctx.moveTo(cx + v0.x, cy + v0.y);

        ctx.bezierCurveTo(
            cx + v0.x + t0.x * (1 - m * 2), cy + v0.y + t0.y * (1 - m * 2),
            cx + v1.x - t1.x * (1 - m * 2), cy + v1.y - t1.y * (1 - m * 2),
            cx + v1.x, cy + v1.y
        );

        ctx.bezierCurveTo(
            cx + v1.x + t1.x * (1 - m * 2), cy + v1.y + t1.y * (1 - m * 2),
            cx + v2.x - t2.x * (1 - m * 2), cy + v2.y - t2.y * (1 - m * 2),
            cx + v2.x, cy + v2.y
        );

        ctx.bezierCurveTo(
            cx + v2.x + t2.x * (1 - m * 2), cy + v2.y + t2.y * (1 - m * 2),
            cx + v0.x - t0.x * (1 - m * 2), cy + v0.y - t0.y * (1 - m * 2),
            cx + v0.x, cy + v0.y
        );
    } else {
        // Square-like shape (use arcTo for rounded corners)
        ctx.moveTo(cx + v0.x - cornerRadius, cy + v0.y);
        ctx.arcTo(cx + v0.x, cy + v0.y, cx + v0.x, cy + v3.y, cornerRadius);
        ctx.arcTo(cx + v0.x, cy + v3.y, cx + v3.x, cy + v3.y, cornerRadius);
        ctx.arcTo(cx + v3.x, cy + v3.y, cx + v2.x, cy + v2.y, cornerRadius);
        ctx.arcTo(cx + v2.x, cy + v2.y, cx + v1.x, cy + v1.y, cornerRadius);
        ctx.arcTo(cx + v1.x, cy + v1.y, cx + v0.x, cy + v0.y, cornerRadius);
    }

    ctx.closePath();
    ctx.fill();
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

    let phase1ProgressBack = Math.min(pBack * 2, 1.0);
    let phase2ProgressBack = Math.max((pBack - 0.5) * 2, 0);

    const startWidthBack = rBack * 2;
    const endWidthBack = 4;
    const startHeightBack = rBack * 2;
    const endHeightBack = 18;
    const startRadiusBack = rBack;
    const endRadiusBack = 2;

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

    let phase1Progress = Math.min(pMenu * 2, 1.0);
    let phase2Progress = Math.max((pMenu - 0.5) * 2, 0);

    const startWidth = rMenu * 2;
    const endWidth = 4;
    const startHeight = rMenu * 2;
    const endHeight = 18;
    const startRadius = rMenu;
    const endRadius = 2;

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

export function draw3DCube(
    ctx: CanvasRenderingContext2D,
    time: number
) {
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;

    ctx.save();
    ctx.translate(jitterX, 40 + jitterY);

    const size = 12;
    const angleY = time * 0.5;
    const angleX = time * 0.35 + 0.3;

    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    const project = (x: number, y: number, z: number): [number, number] => {
        let rotY_x = x * cosY + z * sinY;
        let rotY_y = y;
        let rotY_z = -x * sinY + z * cosY;

        let rotX_x = rotY_x;
        let rotX_y = rotY_y * cosX - rotY_z * sinX;
        let rotX_z = rotY_y * sinX + rotY_z * cosX;

        const scale = 80 / (rotX_z + 3);
        return [rotX_x * scale, rotX_y * scale];
    };

    const vertices: [number, number][] = [
        project(-1, -1, -1), project(1, -1, -1), project(1, 1, -1), project(-1, 1, -1),
        project(-1, -1, 1), project(1, -1, 1), project(1, 1, 1), project(-1, 1, 1)
    ].map(([x, y]) => [x * size, y * size]);

    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const innerSize = 2.5;

    const projectInner = (x: number, y: number, z: number): [number, number, number] => {
        const innerAngleY = -angleY;
        const innerAngleX = -angleX;

        const cosYInner = Math.cos(innerAngleY);
        const sinYInner = Math.sin(innerAngleY);
        const cosXInner = Math.cos(innerAngleX);
        const sinXInner = Math.sin(innerAngleX);

        let rotY_x = x * cosYInner + z * sinYInner;
        let rotY_y = y;
        let rotY_z = -x * sinYInner + z * cosYInner;

        let rotX_x = rotY_x;
        let rotX_y = rotY_y * cosXInner - rotY_z * sinXInner;
        let rotX_z = rotY_y * sinXInner + rotY_z * cosXInner;

        const scale = 80 / (rotX_z + 3);
        return [rotX_x * scale, rotX_y * scale, rotX_z];
    };

    const innerVertices: [number, number, number][] = [
        projectInner(-1, -1, -1), projectInner(1, -1, -1), projectInner(1, 1, -1), projectInner(-1, 1, -1),
        projectInner(-1, -1, 1), projectInner(1, -1, 1), projectInner(1, 1, 1), projectInner(-1, 1, 1)
    ].map(([x, y, z]) => [x * innerSize, y * innerSize, z]);

    const faces = [
        [0, 1, 2, 3], [4, 5, 6, 7],
        [0, 1, 5, 4], [2, 3, 7, 6],
        [0, 3, 7, 4], [1, 2, 6, 5]
    ];

    const facesWithDepth = faces.map((face, idx) => {
        const avgZ = face.reduce((sum, i) => sum + innerVertices[i][2], 0) / face.length;
        return { face, avgZ };
    }).sort((a, b) => a.avgZ - b.avgZ);

    facesWithDepth.forEach(({ face }) => {
        ctx.fillStyle = '#ffcc99';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(innerVertices[face[0]][0], innerVertices[face[0]][1]);
        face.forEach((i) => ctx.lineTo(innerVertices[i][0], innerVertices[i][1]));
        ctx.closePath();
        ctx.fill();
    });

    ctx.globalAlpha = 1.0;

    const drawEdges = (offsetX: number, style: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = style;
        ctx.lineWidth = 2;
        edges.forEach(([i, j]) => {
            ctx.beginPath();
            ctx.moveTo(vertices[i][0] + offsetX, vertices[i][1]);
            ctx.lineTo(vertices[j][0] + offsetX, vertices[j][1]);
            ctx.stroke();
        });
    };

    ctx.globalCompositeOperation = 'screen';
    drawEdges(2, 'rgba(255, 0, 0, 1)', 0.4);
    drawEdges(-2, 'rgba(0, 255, 255, 1)', 0.4);

    ctx.globalCompositeOperation = 'source-over';
    drawEdges(0, '#ffcc99', 1.0);

    ctx.restore();
}

export function drawDNAHelix(
    ctx: CanvasRenderingContext2D,
    time: number
) {
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterY = (Math.random() - 0.5) * 1.5;

    ctx.save();
    ctx.translate(jitterX, jitterY);

    const helixHeight = 500;
    const helixRadius = 90;
    const segments = 50;
    const rotation = time * 0.5;

    const drawHelix = (colorOffset: number, style: string, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = style;
        ctx.lineWidth = 4;

        const strand1: [number, number][] = [];
        const strand2: [number, number][] = [];

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 4 + rotation;
            const y = (i / segments) * helixHeight - helixHeight / 2;

            const x1 = Math.cos(t) * helixRadius;
            const x2 = Math.cos(t + Math.PI) * helixRadius;

            strand1.push([x1 + colorOffset, y]);
            strand2.push([x2 + colorOffset, y]);
        }

        ctx.beginPath();
        strand1.forEach(([x, y], i) => {
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.beginPath();
        strand2.forEach(([x, y], i) => {
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        for (let i = 0; i < segments; i += 4) {
            const t = (i / segments) * Math.PI * 4 + rotation;
            const y = (i / segments) * helixHeight - helixHeight / 2;
            const x1 = Math.cos(t) * helixRadius;
            const x2 = Math.cos(t + Math.PI) * helixRadius;

            ctx.beginPath();
            ctx.moveTo(x1 + colorOffset, y);
            ctx.lineTo(x2 + colorOffset, y);
            ctx.stroke();

            ctx.fillStyle = style;
            ctx.beginPath();
            ctx.arc(x1 + colorOffset, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x2 + colorOffset, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    ctx.globalCompositeOperation = 'screen';
    drawHelix(2, 'rgba(255, 0, 0, 1)', 0.4);
    drawHelix(-2, 'rgba(0, 255, 255, 1)', 0.4);

    ctx.globalCompositeOperation = 'source-over';
    drawHelix(0, '#ffcc99', 1.0);

    ctx.restore();
}

