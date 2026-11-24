#!/usr/bin/env node
// Generates the three built-in reminder timbres and the quiet focus tick.
// All files are original synthesis, so they ship under the project license.
// Run `node scripts/generate-sound-pack.mjs` after changing the synthesis.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const OUTPUT_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'src-tauri/assets');

function render({ duration, notes, strikeGain, cutoff, peak }) {
  const samples = new Float64Array(Math.round(SAMPLE_RATE * duration));

  const addBell = ({ startSeconds, frequency, decaySeconds, gain }) => {
    const start = Math.floor(startSeconds * SAMPLE_RATE);
    const partials = [
      { ratio: 1, gain: 1, decay: 1 },
      { ratio: 2.01, gain: 0.3, decay: 0.7 },
      { ratio: 2.99, gain: 0.12, decay: 0.48 },
      { ratio: 4.16, gain: 0.05, decay: 0.32 },
    ];
    let phase = 0;
    for (let index = start; index < samples.length; index += 1) {
      const seconds = (index - start) / SAMPLE_RATE;
      phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
      const attack = Math.min(1, seconds / 0.004);
      let value = 0;
      for (const partial of partials) {
        value +=
          partial.gain *
          Math.sin(phase * partial.ratio) *
          Math.exp(-seconds / (decaySeconds * partial.decay));
      }
      samples[index] += value * attack * gain;
    }
  };

  const addStrike = ({ startSeconds, gain }) => {
    const start = Math.floor(startSeconds * SAMPLE_RATE);
    let lowPass = 0;
    let seed = 0x2f6e2b1;
    for (let index = start; index < samples.length; index += 1) {
      const seconds = (index - start) / SAMPLE_RATE;
      seed = (1664525 * seed + 1013904223) >>> 0;
      const noise = (seed / 0xffffffff) * 2 - 1;
      lowPass += 0.25 * (noise - lowPass);
      const attack = Math.min(1, seconds / 0.001);
      samples[index] += lowPass * attack * Math.exp(-seconds / 0.008) * gain;
    }
  };

  for (const note of notes) {
    addBell(note);
  }
  if (strikeGain > 0) {
    addStrike({ startSeconds: notes[0].startSeconds, gain: strikeGain });
  }

  // A gentle one-pole low-pass removes the sharpest partials.
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
  let state = 0;
  for (let index = 0; index < samples.length; index += 1) {
    state += alpha * (samples[index] - state);
    samples[index] = state;
  }

  let loudest = 0;
  for (const value of samples) {
    loudest = Math.max(loudest, Math.abs(value));
  }
  const scale = loudest > 0 ? peak / loudest : 0;
  const fadeStart = Math.floor((duration - 0.12) * SAMPLE_RATE);
  const data = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    const fade =
      index < fadeStart ? 1 : (samples.length - 1 - index) / (samples.length - 1 - fadeStart);
    const value = Math.max(-1, Math.min(1, samples[index] * scale * Math.max(0, fade)));
    data.writeInt16LE(Math.round(value * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const files = {
  // Chime: the original rising fifth, warm and familiar.
  'notification.wav': {
    duration: 1.25,
    peak: 0.5,
    cutoff: 7000,
    strikeGain: 0.06,
    notes: [
      { startSeconds: 0, frequency: 698.46, decaySeconds: 0.55, gain: 0.9 },
      { startSeconds: 0.22, frequency: 1046.5, decaySeconds: 0.62, gain: 0.82 },
    ],
  },
  // Soft: a single low note with a longer decay, for quiet rooms.
  'notification-soft.wav': {
    duration: 1.35,
    peak: 0.42,
    cutoff: 4200,
    strikeGain: 0.03,
    notes: [{ startSeconds: 0, frequency: 523.25, decaySeconds: 0.95, gain: 0.9 }],
  },
  // Bell: a brighter two-note figure with more upper partials.
  'notification-bell.wav': {
    duration: 1.1,
    peak: 0.52,
    cutoff: 9000,
    strikeGain: 0.08,
    notes: [
      { startSeconds: 0, frequency: 880, decaySeconds: 0.42, gain: 0.9 },
      { startSeconds: 0.16, frequency: 1174.66, decaySeconds: 0.5, gain: 0.72 },
    ],
  },
  // Tick: a 55 ms wooden click, quiet enough to sit under focus.
  'tick.wav': {
    duration: 0.055,
    peak: 0.2,
    cutoff: 5000,
    strikeGain: 0.5,
    notes: [{ startSeconds: 0, frequency: 196, decaySeconds: 0.035, gain: 0.5 }],
  },
};

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, options] of Object.entries(files)) {
  const output = join(OUTPUT_DIR, name);
  writeFileSync(output, render(options));
  console.log(`Wrote ${output}`);
}
