// Tiny sound effects using Web Audio API — no files needed
const ctx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function play(fn) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  fn(ctx);
}

function beep(ctx, freq, type, duration, gain = 0.15) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(vol).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playCorrect() {
  play((ctx) => {
    beep(ctx, 523, 'sine', 0.15, 0.12);
    setTimeout(() => beep(ctx, 659, 'sine', 0.15, 0.12), 80);
    setTimeout(() => beep(ctx, 784, 'sine', 0.25, 0.12), 160);
  });
}

export function playWrong() {
  play((ctx) => {
    beep(ctx, 200, 'square', 0.25, 0.08);
    setTimeout(() => beep(ctx, 160, 'square', 0.35, 0.08), 150);
  });
}

export function playTick() {
  play((ctx) => beep(ctx, 880, 'sine', 0.05, 0.04));
}

export function playStreak() {
  play((ctx) => {
    beep(ctx, 587, 'sine', 0.1, 0.1);
    setTimeout(() => beep(ctx, 784, 'sine', 0.1, 0.1), 60);
    setTimeout(() => beep(ctx, 988, 'sine', 0.1, 0.1), 120);
    setTimeout(() => beep(ctx, 1175, 'sine', 0.2, 0.1), 180);
  });
}

export function playComplete() {
  play((ctx) => {
    [523, 587, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => beep(ctx, f, 'sine', 0.2, 0.1), i * 100);
    });
  });
}
