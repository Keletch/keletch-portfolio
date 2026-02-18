import { RigidBody, CuboidCollider } from '@react-three/rapier';
import MyWorks from '@/components/Television/MyWorks/MyWorks';

interface MyWorksSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
    themeOverride?: string;
}

const LCD_SCREENS = ['LCDScreen', 'screen', 'LCD_Screen'];

const tv3Position = { x: -1.9, y: 2.5, z: 0.40 }; // Toxic / MyWorks
const toxicCollider = { size: [1.05, 0.60, 0.24] as [number, number, number], offset: [0.00, 0.26, -0.04] as [number, number, number] };

export default function MyWorksSection({ viewState, onNavigate, themeOverride }: MyWorksSectionProps) {
    return (
        <RigidBody
            colliders={false}
            enabledRotations={[true, false, true]}
            ccd={true}
            linearDamping={0.5}
            angularDamping={0.5}
            position={[tv3Position.x, tv3Position.y, tv3Position.z]}
        >
            <CuboidCollider args={toxicCollider.size} position={toxicCollider.offset} friction={0.3} restitution={0.1} />
            <MyWorks
                modelPath="/models/LCDTVFixed.glb"
                screenNames={LCD_SCREENS}
                theme={(themeOverride || 'toxic') as any}
                scale={1.1}
                invertY={true}
                focusedText="My Works"
                isFocused={viewState === 'tv_lcd_focus'}
                textYOffset={40}

                // Top Left: Menu
                showMenuButton={true}
                menuButtonPosition={{ x: -200, y: -190 }}
                onMenuClick={() => onNavigate('shelf_focus')}

                // Top Right: Back
                showBackButton={true}
                backButtonPosition={{ x: 200, y: -190 }}
                onBackClick={() => onNavigate('default')}

                // Bottom Left: Previous
                showPrevButton={true}
                prevButtonPosition={{ x: -200, y: 190 }}
                onPrevClick={() => { }}

                // Bottom Right: Start (Next)
                showStartButton={true}
                startButtonPosition={{ x: 200, y: 190 }}
                onStartClick={() => { }}
                disableStartPulse={true}

                // Bottom Center: Eye
                showEyeButton={true}
                onEyeClick={() => window.open('https://galeria.chu.mx/gallery', '_blank')}
            />
        </RigidBody>
    );
}
