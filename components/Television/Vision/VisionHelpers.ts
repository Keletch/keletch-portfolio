import * as THREE from 'three';

import {
    drawBackButton,
    drawMenuButton,
    drawPlayStopButton,
    drawButtonShockwave
} from '../Helpers';

import {
    updateButtonHoverAnimation
} from '../SharedHelpers';

export {
    drawBackButton,
    drawMenuButton,
    drawPlayStopButton,
    drawButtonShockwave,
    updateButtonHoverAnimation
};

export const VISION_BUTTON_CONFIG = {
    BACK: { x: 200, y: -190, radius: 30 },
    MENU: { x: -200, y: -190, radius: 30 },
    PLAY: { x: 0, y: 190, radius: 30 }
};

export function checkVisionButtonHover(
    uv: THREE.Vector2,
    isFocused: boolean,
    invertY: boolean,
    showBackButton: boolean,
    showMenuButton: boolean,
    showPlayButton: boolean,
    storyMode: boolean,
    backButtonPosition?: { x: number; y: number },
    menuButtonPosition?: { x: number; y: number },
    playButtonPosition?: { x: number; y: number },
    storyTextBox?: { x: number; y: number; w: number; h: number }
): 'back' | 'menu' | 'play' | 'story_text' | null {
    if (!isFocused) return null;

    const px = uv.x * 512;
    const py = (1 - uv.y) * 512;
    const dx = px - 256;
    let dy = py - 256;

    if (invertY) dy = -dy;

    if (showPlayButton) {
        const btnX = playButtonPosition ? playButtonPosition.x : VISION_BUTTON_CONFIG.PLAY.x;
        const btnY = playButtonPosition ? playButtonPosition.y : VISION_BUTTON_CONFIG.PLAY.y;
        const distPlay = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distPlay < VISION_BUTTON_CONFIG.PLAY.radius) return 'play';
    }

    if (showBackButton) {
        const btnX = backButtonPosition ? backButtonPosition.x : VISION_BUTTON_CONFIG.BACK.x;
        const btnY = backButtonPosition ? backButtonPosition.y : VISION_BUTTON_CONFIG.BACK.y;
        const distBack = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distBack < VISION_BUTTON_CONFIG.BACK.radius) return 'back';
    }

    if (showMenuButton) {
        const btnX = menuButtonPosition ? menuButtonPosition.x : VISION_BUTTON_CONFIG.MENU.x;
        const btnY = menuButtonPosition ? menuButtonPosition.y : VISION_BUTTON_CONFIG.MENU.y;
        const distMenu = Math.sqrt((dx - btnX) * (dx - btnX) + (dy - btnY) * (dy - btnY));
        if (distMenu < VISION_BUTTON_CONFIG.MENU.radius) return 'menu';
    }

    if (storyMode && storyTextBox) {
        const halfW = storyTextBox.w / 2;
        if (dx >= storyTextBox.x - halfW && dx <= storyTextBox.x + halfW) {
            if (dy >= storyTextBox.y && dy <= storyTextBox.y + storyTextBox.h) {
                return 'story_text';
            }
        }
    }

    return null;
}
