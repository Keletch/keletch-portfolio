import { CuboidCollider } from '@react-three/rapier';
import { ResettableRigidBody } from '@/components/Scene/ResettableRigidBody';
import SettingsTV from '@/components/Television/Settings/Settings';
import { ThemeColors } from '../Types';

interface SettingsSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
    themeOverride?: Partial<ThemeColors>;
}

const TOON_SCREENS = ['toonTVScreen', 'screen', 'toontvscreen'];

const colliders = {
    toon: { size: [0.65, 0.50, 0.40] as [number, number, number], offset: [0, 0, 0] as [number, number, number] },
};

export default function SettingsSection({ viewState, onNavigate, themeOverride }: SettingsSectionProps) {
    const isFocused = viewState === 'tv_settings_focus';

    return (
        <ResettableRigidBody
            colliders={false}
            enabledRotations={[true, false, true]}
            ccd={true}
            linearDamping={0.5}
            angularDamping={0.5}
            position={[0, 0, 0]} // TV position is handled in TVCluster or applied here?
        // Actually, TVCluster gives tv1Position. Let's make this accept position
        >
            {/* The rigid body wrapper needs position props or we let TVCluster handle position and just put SettingsTV inside TVCluster?
                Actually, the other sections (AboutMeSection, MyWorksSection) hardcode the TV position and ARE the wrapper inside TVScene.
                Since toonTV is currently inside TVCluster, we might just put this RigidBody in TVCluster, OR we refactor it out of TVCluster into TVScene.
                Let's export this without RigidBody if we want to keep it in TVCluster, or let TVCluster handle the RigidBody.
            */}
        </ResettableRigidBody>
    );
}
