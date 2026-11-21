import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIZE = 1024;
const CENTER = SIZE / 2;
const SCALE = SIZE / 2.05;
const APEX = -0.82;
const CENTER_Y = 0.16;
const RADIUS = 0.64;
const BOTTOM = CENTER_Y + RADIUS;
const APEX_DISTANCE = CENTER_Y - APEX;
const TANGENT_Y = CENTER_Y - (RADIUS * RADIUS) / APEX_DISTANCE;
const TANGENT_HALF = RADIUS * Math.sqrt(1 - (RADIUS / APEX_DISTANCE) ** 2);

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function dropletHalfWidth(y) {
  if (y < APEX || y > BOTTOM) {
    return 0;
  }
  if (y < TANGENT_Y) {
    const t = (y - APEX) / (TANGENT_Y - APEX);
    return TANGENT_HALF * t;
  }
  return Math.sqrt(Math.max(0, RADIUS * RADIUS - (y - CENTER_Y) ** 2));
}

function sample(x, y) {
  const half = dropletHalfWidth(y);
  const dx = Math.abs(x) - half;
  let vertical = 0;
  if (y < APEX) {
    vertical = APEX - y;
  } else if (y > BOTTOM) {
    vertical = y - BOTTOM;
  }
  const outside = Math.max(dx, vertical);
  if (outside > 0.012) {
    return [0, 0, 0, 0];
  }
  const coverage = smoothstep(0.012, -0.004, outside) * smoothstep(0.0, 0.025, half);
  if (coverage <= 0) {
    return [0, 0, 0, 0];
  }

  const height = (y - APEX) / (BOTTOM - APEX);
  const glow = 0.5 - 0.45 * x + 0.55 * height;
  let red = mix(126, 18, glow);
  let green = mix(232, 84, glow);
  let blue = mix(255, 196, glow);

  const highlight = Math.hypot((x + 0.24) / 0.23, (y + 0.16) / 0.34);
  const shine = smoothstep(1.15, 0.05, highlight) * 0.62;
  red = mix(red, 255, shine);
  green = mix(green, 255, shine);
  blue = mix(blue, 255, shine);

  const sparkle = Math.hypot((x + 0.3) / 0.055, (y + 0.33) / 0.075);
  const glint = smoothstep(1.0, 0.0, sparkle);
  red = mix(red, 255, glint);
  green = mix(green, 255, glint);
  blue = mix(blue, 255, glint);

  const rim = smoothstep(0.055, 0.0, half - Math.abs(x));
  red = mix(red, 235, rim * 0.42);
  green = mix(green, 250, rim * 0.42);
  blue = mix(blue, 255, rim * 0.42);

  const core = smoothstep(0.85, 0.2, Math.hypot(x, (y - 0.1) * 0.9));
  const alpha = (0.72 + 0.14 * core + 0.1 * shine) * coverage;

  return [Math.round(red), Math.round(green), Math.round(blue), Math.round(alpha * 255)];
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
const samples = 3;
let offset = 0;
for (let py = 0; py < SIZE; py += 1) {
  raw[offset] = 0;
  offset += 1;
  for (let px = 0; px < SIZE; px += 1) {
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;
    for (let sy = 0; sy < samples; sy += 1) {
      for (let sx = 0; sx < samples; sx += 1) {
        const x = (px + (sx + 0.5) / samples - CENTER) / SCALE;
        const y = (py + (sy + 0.5) / samples - CENTER) / SCALE;
        const [r, g, b, a] = sample(x, y);
        red += r * a;
        green += g * a;
        blue += b * a;
        alpha += a;
      }
    }
    const total = samples * samples;
    if (alpha > 0) {
      raw[offset] = Math.round(red / alpha);
      raw[offset + 1] = Math.round(green / alpha);
      raw[offset + 2] = Math.round(blue / alpha);
      raw[offset + 3] = Math.round(alpha / total);
    }
    offset += 4;
  }
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const target = resolve('src-tauri/icon-source.png');
writeFileSync(target, png);
console.log(`wrote ${target} (${png.length} bytes)`);
