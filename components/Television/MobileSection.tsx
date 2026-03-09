'use client';

import { InteractiveTVWrapper } from '@/components/Scene/InteractiveTVWrapper';
import Television from '@/components/Television';

interface MobileSectionProps {
    viewState: string;
    onNavigate?: (state: string) => void;
    theme?: string;
    resetDelay?: number;
}

const MOBILE_SCREENS = ['mobileScreen'];

const mobileCtrl = {
    pos: [3.0, 4.0, 0.2] as [number, number, number],
    rot: [-1.5, 0, -0.30] as [number, number, number],
    size: [0.09, 0.20, 0.05] as [number, number, number],
    offset: [0.01, 0.23, 0.035] as [number, number, number],
    inertiaBoostSize: [0.15, 0.30, 0.2] as [number, number, number]
};

export default function MobileSection({ viewState, theme = 'mobile', resetDelay }: MobileSectionProps) {
    return (
        <InteractiveTVWrapper
            tvPosition={{ x: mobileCtrl.pos[0], y: mobileCtrl.pos[1], z: mobileCtrl.pos[2] }}
            rotation={mobileCtrl.rot}
            colliderSize={mobileCtrl.size}
            colliderOffset={mobileCtrl.offset}
            inertiaBoostSize={mobileCtrl.inertiaBoostSize}
            density={20.0}
            viewState={viewState}
            focusStateName="tv_mobile_focus"
            mass={5}
            linearDamping={0.8}
            angularDamping={0.8}
            springStiffness={80}
            resetDelay={resetDelay}
            camPosOffset={[0, 0.23, 0.6]}
            camLookAtOffset={[0, 0.23, 0]}
            flattenDragZ={true}
        >
            <Television
                modelPath="/models/mobile.glb"
                screenNames={MOBILE_SCREENS}
                theme={theme as 'classic'}
                modelYOffset={0}
                invertY={true}
                isFocused={viewState === 'tv_mobile_focus'}
            />
        </InteractiveTVWrapper>
    );
}
