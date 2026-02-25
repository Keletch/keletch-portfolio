// Helper functions for Lifestyle screen rendering (Retro Gallery)
import * as THREE from 'three';
import { LIFESTYLE_BUTTON_CONFIG } from './LifestyleTypes';

// Re-export drawing helpers
export {
    drawButtonShockwave,
    drawPlayStopButton,
    drawBackButton,
    drawMenuButton,
    drawPixelEye
} from '../Helpers';

// Hover detection for Lifestyle elements
export function checkButtonHover(
    uv: THREE.Vector2,
    isFocused: boolean,
    invertY: boolean,
    showBackButton: boolean,
    showMenuButton: boolean,
    backButtonPosition?: { x: number; y: number },
    menuButtonPosition?: { x: number; y: number }
): 'back' | 'menu' | null {
    if (!isFocused) return null;

    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;
    const dx = px - 256;
    let dy = py - 256;

    if (invertY) dy = -dy;

    if (showBackButton) {
        const btnX = backButtonPosition ? backButtonPosition.x : LIFESTYLE_BUTTON_CONFIG.BACK.x;
        const btnY = backButtonPosition ? backButtonPosition.y : LIFESTYLE_BUTTON_CONFIG.BACK.y;
        const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distBack < LIFESTYLE_BUTTON_CONFIG.BACK.radius) return 'back';
    }

    if (showMenuButton) {
        const btnX = menuButtonPosition ? menuButtonPosition.x : LIFESTYLE_BUTTON_CONFIG.MENU.x;
        const btnY = menuButtonPosition ? menuButtonPosition.y : LIFESTYLE_BUTTON_CONFIG.MENU.y;
        const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distMenu < LIFESTYLE_BUTTON_CONFIG.MENU.radius) return 'menu';
    }

    return null;
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

    // NOTE: Translate and invertY are intentionally handled by the caller.

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
