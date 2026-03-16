import { useCallback, useRef } from 'react';

type SoundType = 'add-to-cart' | 'success' | 'error' | 'scan' | 'delete' | 'notification';

// Simple beep sounds generated via Web Audio API — no external files needed
const SOUND_CONFIG: Record<SoundType, { freq: number; duration: number; type: OscillatorType }> = {
  'add-to-cart': { freq: 800, duration: 0.08, type: 'sine' },
  success: { freq: 600, duration: 0.15, type: 'sine' },
  error: { freq: 300, duration: 0.2, type: 'square' },
  scan: { freq: 1200, duration: 0.05, type: 'sine' },
  delete: { freq: 400, duration: 0.1, type: 'triangle' },
  notification: { freq: 900, duration: 0.12, type: 'sine' },
};

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

// Unlock AudioContext on first user interaction (browser autoplay policy)
function unlockAudio() {
  if (unlocked) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  unlocked = true;
}

// Listen for first interaction globally
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'keydown'] as const;
  const handler = () => {
    unlockAudio();
    for (const e of events) window.removeEventListener(e, handler);
  };
  for (const e of events) window.addEventListener(e, handler, { once: true });
}

function playBeep(sound: SoundType): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const config = SOUND_CONFIG[sound];
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration);
  } catch {
    // Ignore audio errors
  }
}

export function useSound() {
  const enabledRef = useRef(true);

  const play = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;
    // Check settings
    const stored = localStorage.getItem('sardorbek-sound');
    if (stored === 'false') return;
    playBeep(sound);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem('sardorbek-sound', String(enabled));
  }, []);

  return { play, setEnabled };
}

// Non-hook version for stores/services
export function playSound(sound: SoundType): void {
  const stored = localStorage.getItem('sardorbek-sound');
  if (stored === 'false') return;
  playBeep(sound);
}
