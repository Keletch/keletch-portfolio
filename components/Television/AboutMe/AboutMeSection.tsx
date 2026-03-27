import AboutMe from '@/components/Television/AboutMe/AboutMe';
import { InteractiveTVWrapper } from '@/components/Scene/InteractiveTVWrapper';

interface AboutMeSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
    themeOverride?: { bgColor: string; baseColor: string; glowCenter: string; vignetteColor: string; irisColor: string; scleraColor: string; isHologram?: boolean; textColor?: string; highlightColor?: string; textShadow1?: string; textShadow2?: string; };
}

const RED_SCREENS = ['redTVScreen', 'screen'];

const ABOUT_STORY = [
    "Hi, I'm Alex. I've been programming for about 8 years. My journey started with traditional code, but I've always adapted to new technologies. Currently, my primary focus is on building high-performance applications using Next.js, Vercel, Supabase, and Redis, though my experience allows me to comfortably work with almost any tool required for the job.",
    "My workflow is built on a very broad foundation. Throughout my career, I've managed everything from server firewalls and hosting environments to database architecture and cloud deployments. I don't tie myself to one specific stack; I use my historically diverse knowledge to find the most efficient path forward.",
    "Versatility is my biggest strength. Lately, I've integrated AI into my process as a highly valuable supportive tool. It's an accelerator that helps me prototype faster and solve complex logic with agility. Because of my strong programming background, I can guide the AI effectively rather than relying on it.",
    "As a creative technologist, my skills extend beyond pure code. I have deep experience in music and audio production using DAWs like Ableton and FL Studio, as well as video post-production in After Effects. I care deeply about making sure experiences don't just work flawlessly, but also look and sound incredible.",
    "Finally, I understand the broader business ecosystem. From SEO and Analytics to CMS platforms and team collaboration tools, I see the big picture. When you hand me a project, I have the complete toolkit and problem-solving mindset needed to bring it to life from start to finish."
];

const ABOUT_FIGURES = ['neural_mesh', 'hyper_pulse', 'liquid_metal', 'audio_waveform', 'orbital_rings'];

const tv2Position = { x: -2.8, y: 1.1, z: 0.45 }; // Red
const redTVCollider = { size: [1.08, 0.80, 0.85] as [number, number, number], offset: [0.03, 0.22, -0.38] as [number, number, number] };

export default function AboutMeSection({ viewState, onNavigate, themeOverride }: AboutMeSectionProps) {
    return (
        <InteractiveTVWrapper
            tvPosition={tv2Position}
            colliderSize={redTVCollider.size}
            colliderOffset={redTVCollider.offset}
            viewState={viewState}
            focusStateName="tv_red_focus"
            camPosOffset={[0, 0.45, 2.3]}
            resetDelay={0.30}
        >
            <AboutMe
                modelPath="/models/redTV.glb"
                screenNames={RED_SCREENS}
                theme="void"
                invertY={true}
                focusedText="About Me"
                isFocused={viewState === 'tv_red_focus'}
                showStartButton={true}
                startButtonPosition={{ x: 0, y: 190 }}
                onStartClick={() => { }}
                showBackButton={true}
                backButtonPosition={{ x: 200, y: -190 }}
                onBackClick={() => onNavigate('default')}
                showMenuButton={true}
                menuButtonPosition={{ x: -200, y: -190 }}
                onMenuClick={() => onNavigate('shelf_focus')}
                enableStoryMode={true}
                storyContent={ABOUT_STORY}
                storyFigures={ABOUT_FIGURES}
                themeOverride={themeOverride}
            />
        </InteractiveTVWrapper>
    );
}
