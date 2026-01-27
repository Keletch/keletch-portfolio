import { useState, useEffect, useRef } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import Radio from './Radio';
import Speaker from '@/components/Scene/Speaker';
import { useGLTF } from '@react-three/drei';

interface RadioSectionProps {
    viewState: string;
    onNavigate: (state: string) => void;
}

const RADIO_TRACKS = [
    '/music/Chai Tea 84.m4a',
    '/music/Mashwina.m4a',
    '/music/Mystery_Tape_01.m4a',
    '/music/Spore (GoldTrue).m4a',
    '/music/Thombstone_of_a_Ghost_Garden.m4a'
];

const RADIO_SCREEN_NAMES = ['screen', 'pantalla', 'display', 'radioscreen'];

const radioCtrl = {
    pos: [1.50, -0.45, 0] as [number, number, number],
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

export default function RadioSection({ viewState, onNavigate }: RadioSectionProps) {
    const { scene: leftSpeakerModel } = useGLTF('/models/leftSpeaker.glb');
    const { scene: rightSpeakerModel } = useGLTF('/models/rightSpeaker.glb');

    const [radioStatus, setRadioStatus] = useState<'playing' | 'paused' | 'stopped'>('stopped');
    const [currentSongName, setCurrentSongName] = useState('');
    const [radioProgress, setRadioProgress] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const resultAnalyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const autoplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Progress Loop
    useEffect(() => {
        let frame: number;
        const update = () => {
            if (audioRef.current && radioStatus === 'playing') {
                const prog = audioRef.current.currentTime / (audioRef.current.duration || 1);
                setRadioProgress(prog);
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
        }

        const setupAudio = (audio: HTMLAudioElement) => {
            audio.onended = () => {
                setRadioProgress(1);
                const currentIndex = RADIO_TRACKS.indexOf(trackPath);
                const nextIndex = currentIndex + 1;

                if (nextIndex < RADIO_TRACKS.length) {
                    autoplayTimeoutRef.current = setTimeout(() => {
                        playTrack(RADIO_TRACKS[nextIndex]);
                    }, 2000);
                } else {
                    setRadioStatus('stopped');
                    setRadioProgress(0);
                    setCurrentSongName('');
                }
            };

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            if (audioContextRef.current && !sourceNodeRef.current) {
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 256;
                const source = audioContextRef.current.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(audioContextRef.current.destination);
                sourceNodeRef.current = source;
                resultAnalyserRef.current = analyser;
            }
        };

        setupAudio(audioRef.current);

        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        audioRef.current.src = trackPath;
        audioRef.current.play();

        setCurrentSongName(trackName);
        setRadioProgress(0);
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
        setRadioProgress(0);
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
            setRadioProgress(progress);
        }
    };

    return (
        <group>
            {/* RADIO BODY */}
            <RigidBody colliders={false} enabledRotations={[true, false, true]} ccd={true} linearDamping={0.5} angularDamping={0.5} position={radioCtrl.pos} rotation={radioCtrl.rot}>
                <CuboidCollider args={radioCtrl.size} position={radioCtrl.offset} friction={0.5} restitution={0.1} />
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
                    onStartClick={handlePlayPause}
                    onStopClick={handleStop}
                    status={radioStatus}
                    currentSongName={currentSongName}
                    currentProgress={radioProgress}
                    onSeek={handleSeek}
                    showMenuButton={true}
                    showNextButton={true}
                    onNextClick={handleNext}
                    tracks={RADIO_TRACKS}
                    onSelectTrack={playTrack}
                    audioAnalyser={resultAnalyserRef.current || undefined}
                />
            </RigidBody>

            {/* LEFT SPEAKER */}
            <Speaker
                model={leftSpeakerModel}
                position={leftSpkCtrl.pos}
                rotation={leftSpkCtrl.rot}
                colliderSize={leftSpkCtrl.size}
                colliderOffset={leftSpkCtrl.offset}
                analyser={resultAnalyserRef.current || undefined}
                isPlaying={radioStatus === 'playing'}
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
            />
        </group>
    );
}
