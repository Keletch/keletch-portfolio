import { TelevisionProps } from '../Types';

export interface ExtrasProps extends TelevisionProps {
    focusedText?: string;
    showBackButton?: boolean;
    backButtonPosition?: { x: number; y: number };
    onBackClick?: () => void;
    showMenuButton?: boolean;
    menuButtonPosition?: { x: number; y: number };
    onMenuClick?: () => void;
    showLeftButton?: boolean;
    leftButtonPosition?: { x: number; y: number };
    onLeftClick?: () => void;
    showRightButton?: boolean;
    rightButtonPosition?: { x: number; y: number };
    onRightClick?: () => void;
    showGamesButton?: boolean;
    gamesButtonPosition?: { x: number; y: number };
    onGamesClick?: () => void;
}

export const EXTRAS_BUTTON_CONFIG = {
    BACK: { x: 200, y: -190, radius: 45 },
    MENU: { x: -200, y: -190, radius: 45 },
    LEFT: { x: -200, y: 190, radius: 45 },
    RIGHT: { x: 200, y: 190, radius: 45 },
    GAMES: { x: 0, y: 0, radius: 120 }
};
