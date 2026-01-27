import { RigidBody, CuboidCollider } from '@react-three/rapier';
import AboutMe from '@/components/Television/AboutMe/AboutMe';

interface AboutMeSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
}

const RED_SCREENS = ['redTVScreen', 'screen'];

const ABOUT_STORY = [
    "Hi! My name is Alex, and I am a web programmer passionate about building modern digital experiences. I enjoy working with cutting-edge tools and frameworks that allow me to bring creative ideas to life.",
    "I use technologies like Three.js for interactive 3D graphics and Next.js for powerful, scalable web applications. These tools help me create projects that feel dynamic, innovative, and future-ready.",
    "As a full stack developer, I work across both frontend and backend, making sure every part of a project connects smoothly. My goal is always to deliver clean, efficient, and modern solutions that stand out."
];

const ABOUT_FIGURES = ['circles', 'cube', 'dna'];

const tv2Position = { x: -2.8, y: 1.1, z: 0.45 }; // Red
const redTVCollider = { size: [1.08, 0.80, 0.85] as [number, number, number], offset: [0.03, 0.22, -0.38] as [number, number, number] };

export default function AboutMeSection({ viewState, onNavigate }: AboutMeSectionProps) {
    return (
        <RigidBody
            colliders={false}
            enabledRotations={[true, false, true]}
            ccd={true}
            linearDamping={0.5}
            angularDamping={0.5}
            position={[tv2Position.x, tv2Position.y, tv2Position.z]}
        >
            <CuboidCollider args={redTVCollider.size} position={redTVCollider.offset} friction={0.3} restitution={0.1} />
            <AboutMe
                modelPath="/models/redTV.glb"
                screenNames={RED_SCREENS}
                theme="void"
                invertY={true}
                focusedText="About Me"
                isFocused={viewState === 'tv_red_focus'}
                textYOffset={40}
                showStartButton={true}
                onStartClick={() => console.log("Start Clicked")}
                showBackButton={true}
                onBackClick={() => onNavigate('default')}
                showMenuButton={true}
                onMenuClick={() => onNavigate('shelf_focus')}
                enableStoryMode={true}
                storyContent={ABOUT_STORY}
                storyFigures={ABOUT_FIGURES}
            />
        </RigidBody>
    );
}
