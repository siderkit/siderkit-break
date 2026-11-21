#!/usr/bin/env node
// Generates the built-in reminder sound. The file is original synthesis, so it
// can ship under the project license.
//
// The sound is two soft bell notes a perfect fifth apart: a warm "ding ding"
// that reads as a reminder without sounding like an alarm. Run
// `node scripts/generate-sound.mjs`, then audition it from Settings -> Reminders.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 48_000;
const DURATION_SECONDS = 1.25;
const PEAK = 0.5;
const OUTPUT = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'src-tauri/assets/notification.wav',
);

const samples = new Float64Array(Math.round(SAMPLE_RATE * DURATION_SECONDS));

let noiseSeed = 0x2f6e2b1;
function noise() {
  noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
  return (noiseSeed / 0xffffffff) * 2 - 1;
}

/**
 * Adds a bell note. The fundamental carries most of the energy; the quiet
 * upper partials give it a metallic edge without turning it into a beep.
 */
function addBell({ startSeconds, frequency, decaySeconds, gain }) {
  const start = Math.floor(startSeconds * SAMPLE_RATE);
  const partials = [
    { ratio: 1, gain: 1, decay: 1 },
    { ratio: 2.01, gain: 0.34, decay: 0.72 },
    { ratio: 2.99, gain: 0.14, decay: 0.5 },
    { ratio: 4.16, gain: 0.06, decay: 0.34 },
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
}

/** Adds the soft mallet contact that makes the attack feel like a bell. */
function addStrike({ startSeconds, gain }) {
  const start = Math.floor(startSeconds * SAMPLE_RATE);
  let lowPass = 0;
  for (let index = start; index < samples.length; index += 1) {
    const seconds = (index - start) / SAMPLE_RATE;
    lowPass += 0.25 * (noise() - lowPass);
    const attack = Math.min(1, seconds / 0.001);
    const decay = Math.exp(-seconds / 0.008);
    samples[index] += lowPass * attack * decay * gain;
  }
}

/** Adds a few quiet early reflections so the chime sits in a small room. */
function addRoom() {
  const dry = samples.slice();
  const taps = [
    [0.023, 0.12],
    [0.041, 0.08],
    [0.067, 0.05],
  ];
  for (const [seconds, gain] of taps) {
    const delay = Math.round(seconds * SAMPLE_RATE);
    for (let index = delay; index < samples.length; index += 1) {
      samples[index] += dry[index - delay] * gain;
    }
  }
}

/** A one-pole low-pass keeps the upper partials from sounding sharp. */
function lowPass(cutoffHz) {
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoffHz) / SAMPLE_RATE);
  let state = 0;
  for (let index = 0; index < samples.length; index += 1) {
    state += alpha * (samples[index] - state);
    samples[index] = state;
  }
}

// F5 then C6: a rising perfect fifth, the interval most people hear as a
// friendly two-note doorbell.
addBell({ startSeconds: 0, frequency: 698.46, decaySeconds: 0.55, gain: 0.9 });
addBell({ startSeconds: 0.22, frequency: 1046.5, decaySeconds: 0.62, gain: 0.82 });
addStrike({ startSeconds: 0, gain: 0.06 });
addStrike({ startSeconds: 0.22, gain: 0.05 });
addRoom();
lowPass(7000);

let peak = 0;
for (const value of samples) {
  peak = Math.max(peak, Math.abs(value));
}
const scale = peak > 0 ? PEAK / peak : 0;
const fadeStart = Math.floor((DURATION_SECONDS - 0.12) * SAMPLE_RATE);
for (let index = 0; index < samples.length; index += 1) {
  const fade =
    index < fadeStart ? 1 : (samples.length - 1 - index) / (samples.length - 1 - fadeStart);
  samples[index] *= scale * Math.max(0, Math.min(1, fade));
}

const data = Buffer.alloc(samples.length * 2);
for (let index = 0; index < samples.length; index += 1) {
  const value = Math.max(-1, Math.min(1, samples[index]));
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

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, Buffer.concat([header, data]));
console.log(`Wrote ${OUTPUT} (${samples.length} samples, ${DURATION_SECONDS}s, peak ${PEAK})`);
