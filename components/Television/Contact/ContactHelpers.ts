import * as THREE from 'three';
import { drawBackButton, drawMenuButton } from '../Helpers';

// Re-export standard helpers tailored for Contact TV if needed
export { drawBackButton, drawMenuButton };

// Mobile screen has different aspect ratio
// We need to adjust raycasting logic slightly differently than standard 1:1 TVs
export type HitResult = 'back' | 'menu' | 'link_email' | 'link_linkedin' | 'link_github' | null;

export function checkContactButtonHover(
    uv: THREE.Vector2,
    isFocused: boolean,
    invertY: boolean,
    showBackButton: boolean,
    showMenuButton: boolean,
    backButtonPosition: { x: number, y: number },
    menuButtonPosition: { x: number, y: number }
): HitResult {
    if (!isFocused) return null;

    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;
    const dx = px - 256;
    let dy = py - 256;

    if (invertY) dy = -dy;

    if (showBackButton) {
        const distBack = Math.sqrt(Math.pow(dx - backButtonPosition.x, 2) + Math.pow(dy - backButtonPosition.y, 2));
        if (distBack < 30) return 'back';
    }

    if (showMenuButton) {
        const distMenu = Math.sqrt(Math.pow(dx - menuButtonPosition.x, 2) + Math.pow(dy - menuButtonPosition.y, 2));
        if (distMenu < 30) return 'menu';
    }

    if (dx > -200 && dx < 200) {
        // startY -70, spacing 110
        // email: -70 (-120 to -20)
        // linkedin: 40 (-10 to 90)
        // github: 150 (100 to 200)
        if (dy > -120 && dy < -20) return 'link_email';
        if (dy > -10 && dy < 90) return 'link_linkedin';
        if (dy > 100 && dy < 200) return 'link_github';
    }

    return null;
}
