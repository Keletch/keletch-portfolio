// Helper functions for MyWorks screen rendering
import * as THREE from 'three';
import { MYWORKS_BUTTON_CONFIG } from './MyWorksTypes';
import { PROJECTS } from './MyWorksData';

// Re-export drawing helpers
export {
    drawButtonShockwave,
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton
} from '../Helpers';

// Hover detection for MyWorks OSD
export function checkButtonHover(
    uv: THREE.Vector2,
    isFocused: boolean,
    invertY: boolean,
    galleryState: string,
    currentProjectIndex: number,
    showStartButton: boolean,
    showBackButton: boolean,
    showMenuButton: boolean,
    showPrevButton: boolean,
    showEyeButton: boolean,
    startButtonPosition?: { x: number; y: number },
    backButtonPosition?: { x: number; y: number },
    menuButtonPosition?: { x: number; y: number },
    prevButtonPosition?: { x: number; y: number },
    eyeButtonPosition?: { x: number; y: number }
): 'play' | 'back' | 'menu' | 'prev' | 'eye' | 'text_box' | null {
    if (!isFocused) return null;

    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;
    const dx = px - 256;
    let dy = py - 256;

    if (invertY) dy = -dy;

    if (showStartButton) {
        const btnX = startButtonPosition ? startButtonPosition.x : MYWORKS_BUTTON_CONFIG.PLAY.x;
        const btnY = startButtonPosition ? startButtonPosition.y : MYWORKS_BUTTON_CONFIG.PLAY.y;
        const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distPlay < MYWORKS_BUTTON_CONFIG.PLAY.radius) return 'play';
    }

    if (showBackButton) {
        const btnX = backButtonPosition ? backButtonPosition.x : MYWORKS_BUTTON_CONFIG.BACK.x;
        const btnY = backButtonPosition ? backButtonPosition.y : MYWORKS_BUTTON_CONFIG.BACK.y;
        const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distBack < MYWORKS_BUTTON_CONFIG.BACK.radius) return 'back';
    }

    if (showMenuButton) {
        const btnX = menuButtonPosition ? menuButtonPosition.x : MYWORKS_BUTTON_CONFIG.MENU.x;
        const btnY = menuButtonPosition ? menuButtonPosition.y : MYWORKS_BUTTON_CONFIG.MENU.y;
        const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distMenu < MYWORKS_BUTTON_CONFIG.MENU.radius) return 'menu';
    }

    if (showPrevButton) {
        const btnX = prevButtonPosition ? prevButtonPosition.x : MYWORKS_BUTTON_CONFIG.PREV.x;
        const btnY = prevButtonPosition ? prevButtonPosition.y : MYWORKS_BUTTON_CONFIG.PREV.y;
        const distPrev = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distPrev < MYWORKS_BUTTON_CONFIG.PREV.radius) return 'prev';
    }

    if (showEyeButton) {
        const btnX = eyeButtonPosition ? eyeButtonPosition.x : MYWORKS_BUTTON_CONFIG.EYE.x;
        const btnY = eyeButtonPosition ? eyeButtonPosition.y : MYWORKS_BUTTON_CONFIG.EYE.y;
        const distEye = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distEye < MYWORKS_BUTTON_CONFIG.EYE.radius) return 'eye';
    }

    // Text box hit detection
    if (galleryState === 'gallery') {
        const textBoxY = 80;
        const maxWidth = 380;
        const padding = 15;
        const lineHeight = 22;

        const currentProject = PROJECTS[currentProjectIndex];
        const fullText = `${currentProject.title}\n${currentProject.stack}\n\n${currentProject.desc}`;
        const numLines = fullText.split('\n').length;
        const boxHeight = (numLines * lineHeight) + (padding * 2);
        const totalWidth = maxWidth + (padding * 2);
        const minX = -totalWidth / 2;
        const maxX = totalWidth / 2;
        const minY = textBoxY - padding;
        const maxY = textBoxY - padding + boxHeight;
        if (dx > minX && dx < maxX && dy > minY && dy < maxY) {
            return 'text_box';
        }
    }

    return null;
}

// Helper function to wrap text
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

// Project info display with typewriter effect
export function drawProjectInfo(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    wrappedLines: string[],
    fullText: string,
    typingStartTime: number,
    waitingForInput: boolean,
    opacity: number,
    textColor: string = '#ffffff',
    highlightColor: string = '#ffffff'
) {
    ctx.save();

    const textBoxY = 50;
    const maxWidth = 380;
    const lineHeight = 20;
    const padding = 15;

    ctx.font = `bold 15px "Courier New", monospace`;

    const numLines = wrappedLines.length;
    const boxHeight = (numLines * lineHeight) + (padding * 2);
    const totalWidth = maxWidth + (padding * 2);

    // Border with transition opacity
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    const highlightRGB = hexToRgb(highlightColor) || { r: 255, g: 255, b: 255 };
    const textRGB = hexToRgb(textColor) || { r: 255, g: 255, b: 255 };
    ctx.strokeStyle = `rgba(${highlightRGB.r}, ${highlightRGB.g}, ${highlightRGB.b}, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-totalWidth / 2, textBoxY - padding, totalWidth, boxHeight);

    let charsToShow = 0;
    if (waitingForInput) {
        charsToShow = fullText.length;
    } else {
        const charSpeed = 0.05;
        const timeSinceStart = (Date.now() - typingStartTime) / 1000;
        charsToShow = Math.floor(timeSinceStart / charSpeed);
    }

    charsToShow = Math.min(charsToShow, fullText.length);
    const currentVisibleText = fullText.slice(0, charsToShow);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const visibleLines = currentVisibleText.split('\n');
    visibleLines.forEach((txt, i) => {
        ctx.fillStyle = `rgba(${textRGB.r}, ${textRGB.g}, ${textRGB.b}, 1.0)`;
        ctx.fillText(txt, -maxWidth / 2, textBoxY + (i * lineHeight));
    });

    ctx.restore();

    return {
        charsShown: charsToShow,
        isComplete: charsToShow >= fullText.length,
        boxHeight: boxHeight,
        numLines: numLines
    };
}

// External link button (Eye icon)
export function drawEyeButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hoverProgress: number,
    time: number,
    baseColor: string = '#ffffff',
    radius: number = 40
) {
    ctx.save();
    ctx.translate(x, y);

    const baseDesignRadius = 40;
    const baseScale = radius / baseDesignRadius;
    ctx.scale(baseScale, baseScale);

    const jx = (Math.random() - 0.5) * 2 * hoverProgress;
    const jy = (Math.random() - 0.5) * 2 * hoverProgress;
    const scale = 1 + hoverProgress * 0.1;
    ctx.translate(jx, jy);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `rgba(0,0,0,${0.5 + hoverProgress * 0.3})`;
    ctx.fill();

    const iconScale = 0.7;
    ctx.scale(iconScale, iconScale);

    ctx.strokeStyle = baseColor;
    ctx.fillStyle = baseColor;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.quadraticCurveTo(0, -25, 35, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.quadraticCurveTo(0, 25, 35, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    const lashLength = 10;
    const lashStart = 28;

    ctx.beginPath();
    ctx.moveTo(0, -lashStart);
    ctx.lineTo(0, -lashStart - lashLength);
    ctx.stroke();

    const lashAngle = 0.5;
    const drawLash = (angle: number, heightOffset: number) => {
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -lashStart + heightOffset);
        ctx.lineTo(0, -lashStart - lashLength + heightOffset);
        ctx.stroke();
        ctx.restore();
    };

    drawLash(-lashAngle, 2);
    drawLash(-lashAngle * 2, 8);
    drawLash(lashAngle, 2);
    drawLash(lashAngle * 2, 8);

    if (hoverProgress > 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = baseColor;
        ctx.fillStyle = `rgba(255, 255, 255, ${hoverProgress * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.quadraticCurveTo(0, -25, 35, 0);
        ctx.quadraticCurveTo(0, 25, -35, 0);
        ctx.fill();
    }

    ctx.restore();
}

// Display standard title text
export function drawFocusedText(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    focusedText: string,
    invertY: boolean,
    textYOffset: number
) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (invertY) {
        ctx.rotate(Math.PI);
        ctx.scale(-1, 1);
    }
    const jitterX = (Math.random() - 0.5) * 4;
    const jitterY = (Math.random() - 0.5) * 4;
    ctx.font = '900 50px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const textY = -h / 2 + textYOffset;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillText(focusedText, jitterX + 4, textY + jitterY);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fillText(focusedText, jitterX - 4, textY + jitterY);
    ctx.fillStyle = '#ffffff';
    if (Math.random() > 0.1) {
        ctx.fillText(focusedText, jitterX, textY + jitterY);
    }
    ctx.restore();
}

