import { TelevisionProps } from '../Types';

export interface VisionProps extends TelevisionProps {
    showBackButton?: boolean;
    onBackClick?: () => void;
    backButtonPosition?: { x: number; y: number };
    showMenuButton?: boolean;
    onMenuClick?: () => void;
    menuButtonPosition?: { x: number; y: number };
    visionColors?: { irisColor: string; textColor?: string; highlightColor?: string;[key: string]: any };
}
