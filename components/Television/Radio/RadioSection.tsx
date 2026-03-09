import { useState, useEffect, useRef } from 'react';
import { InteractiveTVWrapper } from '@/components/Scene/InteractiveTVWrapper';
import Radio from './Radio';
import Speaker from '@/components/Scene/Speaker';
import { useGLTF } from '@react-three/drei';
import { useSettingsStore } from '@/components/store/useSettingsStore';

interface RadioSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
    accentColor?: string;
    themeOverride?: { bgColor: string; baseColor: string; glowCenter: string; vignetteColor: string; irisColor: string; scleraColor: string };
}

const RADIO_TRACKS = [
    '/music/Chai Tea 84.m4a',
    '/music/Mashwina.m4a',
    '/music/Mystery_Tape_01.m4a',
    '/music/Spore (GoldTrue).m4a',
    '/music/Thombstone_of_a_Ghost_Garden.m4a',
    '/music/LOTUS FLOWER BY KRAKATOA.m4a',
    '/music/Miltthrekc.m4a',
    '/music/Clouds.m4a',
];

const RADIO_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'radioscreen'];

const radioCtrl = {
    pos: [1.50, -0.45, 0.2] as [number, number, number],
    rot: [0, 0, 0] as [number, number, number],
    size: [0.51, 0.14, 0.35] as [number, number, number],
    offset: [-0.03, 0.15, 0] as [number, number, number]
};

const leftSpkCtrl = {
    pos: [-4.9, 0, 0] as [number, number, number],
    rot: [0, 0.2, 0] as [number, number, number],
    size: [0.45, 1.6, 0.68] as [number, number, number],
    offset: [-0.05, 1.55, -0.08] as [number, number, number]
};

const rightSpkCtrl = {
    pos: [5.0, 0, 0] as [number, number, number],
    rot: [0, -0.4, 0] as [number, number, number],
    size: [0.45, 1.55, 0.68] as [number, number, number],
    offset: [0.02, 1.60, 0.08] as [number, number, number]
};

export default function RadioSection({ viewState, onNavigate, accentColor, themeOverride }: RadioSectionProps) {
    const { scene: leftSpeakerModel } = useGLTF('/models/leftSpeaker.glb');
    const { scene: rightSpeakerModel } = useGLTF('/models/rightSpeaker.glb');

    const musicVolume = useSettingsStore(state => state.musicVolume);

    const [radioStatus, setRadioStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');
    const [currentSongName, setCurrentSongName] = useState('');
    // Optimization: Use Ref for progress to avoid 60fps React re-renders in RadioSection and children
    const radioProgressRef = useRef(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const resultAnalyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const autoplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(musicVolume, audioContextRef.current?.currentTime || 0, 0.05);
        } else if (audioRef.current) {
            audioRef.current.volume = Math.min(1.0, musicVolume);
        }
    }, [musicVolume]);

    // Progress Loop
    useEffect(() => {
        let frame: number;
        const update = () => {
            if (audioRef.current && radioStatus === 'playing') {
                const prog = audioRef.current.currentTime / (audioRef.current.duration || 1);
                radioProgressRef.current = prog;
            }
            frame = requestAnimationFrame(update);
        };
        update();
        return () => cancelAnimationFrame(frame);
    }, [radioStatus, currentSongName]);

    const playTrack = (trackPath: string) => {
        if (autoplayTimeoutRef.current) {
            clearTimeout(autoplayTimeoutRef.current);
            autoplayTimeoutRef.current = null;
        }

        const trackName = trackPath.split('/').pop()?.replace(/\.(mp3|m4a)$/, '') || 'Unknown Track';

        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = musicVolume;
        }

        const setupAudio = (audio: HTMLAudioElement) => {
            audio.onended = () => {
                radioProgressRef.current = 1;
                const currentIndex = RADIO_TRACKS.indexOf(trackPath);
                const nextIndex = currentIndex + 1;

                if (nextIndex < RADIO_TRACKS.length) {
                    autoplayTimeoutRef.current = setTimeout(() => {
                        playTrack(RADIO_TRACKS[nextIndex]);
                    }, 2000);
                } else {
                    setRadioStatus('stopped');
                    radioProgressRef.current = 0;
                    setCurrentSongName('');
                }
            };

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }

            if (audioContextRef.current && !sourceNodeRef.current) {
                const analyser = audioContextRef.current.createAnalyser();
                const gainNode = audioContextRef.current.createGain();
                analyser.fftSize = 256;
                gainNode.gain.value = musicVolume;

                const source = audioContextRef.current.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(gainNode);
                gainNode.connect(audioContextRef.current.destination);

                sourceNodeRef.current = source;
                resultAnalyserRef.current = analyser;
                gainNodeRef.current = gainNode;

                audio.volume = 1.0;
            }
        };

        setupAudio(audioRef.current);

        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        audioRef.current.src = trackPath;
        audioRef.current.play();

        setCurrentSongName(trackName);
        radioProgressRef.current = 0;
        setRadioStatus('playing');
    };

    const handlePlayPause = () => {
        if (radioStatus === 'playing') {
            if (audioRef.current) audioRef.current.pause();
            setRadioStatus('paused');
        } else if (radioStatus === 'paused') {
            if (audioRef.current) audioRef.current.play();
            setRadioStatus('playing');
        } else {
            const randomTrack = RADIO_TRACKS[Math.floor(Math.random() * RADIO_TRACKS.length)];
            playTrack(randomTrack);
        }
    };

    const handleStop = () => {
        if (autoplayTimeoutRef.current) {
            clearTimeout(autoplayTimeoutRef.current);
            autoplayTimeoutRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setRadioStatus('stopped');
        radioProgressRef.current = 0;
        setCurrentSongName('');
    };

    const handleNext = () => {
        if (autoplayTimeoutRef.current) {
            clearTimeout(autoplayTimeoutRef.current);
            autoplayTimeoutRef.current = null;
        }
        let availableTracks = RADIO_TRACKS;
        if (currentSongName) {
            const filtered = RADIO_TRACKS.filter(t => {
                const name = t.split('/').pop()?.replace(/\.(mp3|m4a)$/, '') || '';
                return name !== currentSongName;
            });
            if (filtered.length > 0) availableTracks = filtered;
        }
        const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
        playTrack(randomTrack);
    };

    const handleSeek = (progress: number) => {
        if (audioRef.current && radioStatus !== 'stopped') {
            const duration = audioRef.current.duration || 1;
            audioRef.current.currentTime = duration * progress;
            radioProgressRef.current = progress;
        }
    };

    return (
        <group>
            {/* RADIO BODY */}
            <InteractiveTVWrapper
                tvPosition={{ x: radioCtrl.pos[0], y: radioCtrl.pos[1], z: radioCtrl.pos[2] }}
                colliderSize={radioCtrl.size}
                colliderOffset={radioCtrl.offset}
                density={25}
                viewState={viewState}
                focusStateName="radio_focus"
                mass={5}
                linearDamping={0.8}
                angularDamping={0.8}
                springStiffness={80}
                camPosOffset={[0, 0.45, 1.3]}
                camLookAtOffset={[0, 0.25, 0]}
                resetDelay={1.90}
            >
                <Radio
                    modelPath="/models/radio.glb"
                    screenNames={RADIO_SCREEN_NAMES}
                    theme="sonar"
                    modelYOffset={0}
                    invertY={true}
                    isFocused={viewState === 'radio_focus'}
                    showBackButton={viewState === 'radio_focus'}
                    onBackClick={() => onNavigate('default')}
                    showStartButton={true}
                    startButtonPosition={{ x: -200, y: 190 }}
                    onStartClick={handlePlayPause}
                    onStopClick={handleStop}
                    status={radioStatus}
                    currentSongName={currentSongName}
                    currentProgress={radioProgressRef}
                    onSeek={handleSeek}
                    showMenuButton={true}
                    menuButtonPosition={{ x: -200, y: -190 }}
                    showNextButton={true}
                    onNextClick={handleNext}
                    tracks={RADIO_TRACKS}
                    onSelectTrack={playTrack}
                    audioAnalyser={resultAnalyserRef.current || undefined}
                    accentColor={accentColor}
                    themeOverride={themeOverride}
                />
            </InteractiveTVWrapper>

            {/* LEFT SPEAKER */}
            <Speaker
                model={leftSpeakerModel}
                position={leftSpkCtrl.pos}
                rotation={leftSpkCtrl.rot}
                colliderSize={leftSpkCtrl.size}
                colliderOffset={leftSpkCtrl.offset}
                analyser={resultAnalyserRef.current || undefined}
                isPlaying={radioStatus === 'playing'}
                resetDelay={1.95}
            />

            {/* RIGHT SPEAKER */}
            <Speaker
                model={rightSpeakerModel}
                position={rightSpkCtrl.pos}
                rotation={rightSpkCtrl.rot}
                colliderSize={rightSpkCtrl.size}
                colliderOffset={rightSpkCtrl.offset}
                analyser={resultAnalyserRef.current || undefined}
                isPlaying={radioStatus === 'playing'}
                resetDelay={2.10}
            />
        </group>
    );
}
