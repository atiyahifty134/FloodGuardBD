/**
 * alarm.js
 * Web Audio API–based siren generator for HIGH / SEVERE flood risk alerts.
 * No external audio files are used — the siren waveform is synthesized
 * entirely in the browser.
 */

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let sweepInterval = null;
let isPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Starts a looping two-tone siren, similar to a civil defense alarm.
 * Safe to call multiple times — it will not stack additional oscillators.
 */
export function startSiren() {
  if (isPlaying) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(500, ctx.currentTime);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();

  isPlaying = true;

  const LOW_FREQ = 500;
  const HIGH_FREQ = 1000;
  const SWEEP_DURATION = 1.1; // seconds per direction

  let goingUp = true;

  const sweep = () => {
    if (!oscillator || !audioCtx) return;
    const now = audioCtx.currentTime;
    const target = goingUp ? HIGH_FREQ : LOW_FREQ;
    oscillator.frequency.cancelScheduledValues(now);
    oscillator.frequency.setValueAtTime(oscillator.frequency.value, now);
    oscillator.frequency.linearRampToValueAtTime(target, now + SWEEP_DURATION);
    goingUp = !goingUp;
  };

  sweep();
  sweepInterval = setInterval(sweep, SWEEP_DURATION * 1000);
}

/**
 * Stops the siren and releases audio resources gracefully.
 */
export function stopSiren() {
  if (!isPlaying) return;

  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }

  if (gainNode && audioCtx) {
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
  }

  if (oscillator) {
    const osc = oscillator;
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        /* already stopped */
      }
    }, 300);
    oscillator = null;
  }

  gainNode = null;
  isPlaying = false;
}

/**
 * Plays a single short alert "beep" — useful for a one-off notification
 * rather than a continuous siren.
 */
export function playAlertBeep() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

export function isSirenPlaying() {
  return isPlaying;
}
