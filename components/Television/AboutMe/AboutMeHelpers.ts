export {
    drawPixelCircle,
    drawPixelEllipse,
    drawPixelRoundedRect,
    drawPixelEye,
    drawButtonShockwave,
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton
} from '../Helpers';

export function paginateStory(
    textArr: string[],
    maxWidth: number,
    maxLines: number,
    font: string
): { pages: string[], paragraphMap: number[] } {
    const pages: string[] = [];
    const paragraphMap: number[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { pages: [], paragraphMap: [] };
    ctx.font = font;

    textArr.forEach((paragraph, pIndex) => {
        const words = paragraph.split(' ');
        let line = '';
        const lines: string[] = [];

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(line);
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        for (let i = 0; i < lines.length; i += maxLines) {
            const pageLines = lines.slice(i, i + maxLines);
            pages.push(pageLines.join('\n'));
            paragraphMap.push(pIndex);
        }
    });

    return { pages, paragraphMap };
}

// Figures (Cube, Circles, DNA)
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
        const rotY_x = x * cosY + z * sinY;
        const rotY_y = y;
        const rotY_z = -x * sinY + z * cosY;

        const rotX_x = rotY_x;
        const rotX_y = rotY_y * cosX - rotY_z * sinX;
        const rotX_z = rotY_y * sinX + rotY_z * cosX;

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

        const rotY_x = x * cosYInner + z * sinYInner;
        const rotY_y = y;
        const rotY_z = -x * sinYInner + z * cosYInner;

        const rotX_x = rotY_x;
        const rotX_y = rotY_y * cosXInner - rotY_z * sinXInner;
        const rotX_z = rotY_y * sinXInner + rotY_z * cosXInner;

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

    const facesWithDepth = faces.map((face) => {
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
            ctx.arc(x1 + colorOffset, y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x2 + colorOffset, y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    ctx.globalCompositeOperation = 'screen';
    drawHelix(4, 'rgba(255, 0, 0, 0.8)', 0.5);
    drawHelix(-4, 'rgba(0, 255, 255, 0.8)', 0.5);

    ctx.globalCompositeOperation = 'source-over';
    drawHelix(0, '#ffcc99', 1.0);

    ctx.restore();
}
