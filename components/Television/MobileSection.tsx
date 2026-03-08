import { InteractiveTVWrapper } from '@/components/Scene/InteractiveTVWrapper';
import Television from '@/components/Television';

interface MobileSectionProps {
    viewState: string;
    onNavigate?: (state: string) => void;
    theme?: string;
}

const MOBILE_SCREENS = ['mobileScreen'];

const mobileCtrl = {
    pos: [3.0, 4.0, 0.30] as [number, number, number],
    rot: [-1.5, 0, -0.30] as [number, number, number],
    size: [0.09, 0.20, 0.03] as [number, number, number], // real collision shape
    offset: [0.01, 0.23, 0.00] as [number, number, number]
};

export default function MobileSection({ viewState, theme = 'mobile' }: MobileSectionProps) {
    return (
        <InteractiveTVWrapper
            tvPosition={{ x: mobileCtrl.pos[0], y: mobileCtrl.pos[1], z: mobileCtrl.pos[2] }}
            rotation={mobileCtrl.rot}
            colliderSize={mobileCtrl.size}
            colliderOffset={mobileCtrl.offset}
            density={20} // Lighter than before for more natural feel
            viewState={viewState}
            focusStateName="tv_mobile_focus"
            mass={1}
            linearDamping={0.8}
            angularDamping={0.8}
            springStiffness={80}
            springDamping={3.0}
        >
            <Television
                modelPath="/models/mobile.glb"
                screenNames={MOBILE_SCREENS}
                theme={theme as 'classic'}
                invertY={true}
                isFocused={viewState === 'tv_mobile_focus'}
            />
        </InteractiveTVWrapper>
    );
}
