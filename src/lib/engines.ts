import { Noise } from './noise';

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface EngineState {
  params: Record<string, number>;
  palette: string[];
  colorAt: (t: number) => [number, number, number];
  seed: number;
}

export interface EngineInstance {
  frame: (state: EngineState) => void;
  reset: (state: EngineState) => void;
}

export interface EngineDef {
  id: string;
  name: string;
  glyph: string;
  tagline: string;
  description: string;
  params: ParamDef[];
  create: (ctx: CanvasRenderingContext2D, w: number, h: number) => EngineInstance;
}

function mulberry32(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* 1. FLOW FIELD                                                       */
/* ------------------------------------------------------------------ */
const flowField: EngineDef = {
  id: 'flow',
  name: 'Flow Field',
  glyph: '≿',
  tagline: 'Perlin-driven particle currents',
  description:
    'Thousands of particles ride a 3-dimensional Perlin noise field, tracing luminous currents that evolve through time.',
  params: [
    { key: 'count', label: 'Particles', min: 200, max: 6000, step: 100, default: 2600 },
    { key: 'scale', label: 'Field Scale', min: 0.5, max: 6, step: 0.1, default: 2.2 },
    { key: 'speed', label: 'Velocity', min: 0.2, max: 5, step: 0.1, default: 1.6 },
    { key: 'drift', label: 'Field Drift', min: 0, max: 4, step: 0.1, default: 1.0 },
    { key: 'fade', label: 'Trail Length', min: 0.5, max: 20, step: 0.5, default: 5 },
    { key: 'weight', label: 'Line Weight', min: 0.4, max: 3, step: 0.1, default: 0.9 },
  ],
  create(ctx, w, h) {
    const noise = new Noise();
    let px: Float32Array, py: Float32Array;
    let count = 0;
    let zt = 0;
    const init = (state: EngineState) => {
      noise.reseed(state.seed);
      count = Math.floor(state.params.count);
      px = new Float32Array(count);
      py = new Float32Array(count);
      const rand = mulberry32(state.seed + 7);
      for (let i = 0; i < count; i++) {
        px[i] = rand() * w;
        py[i] = rand() * h;
      }
      zt = 0;
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, w, h);
    };
    return {
      reset(state) {
        init(state);
      },
      frame(state) {
        const p = state.params;
        if (Math.floor(p.count) !== count) init(state);
        // fade previous frame
        ctx.fillStyle = `rgba(5,6,10,${1 / p.fade})`;
        ctx.fillRect(0, 0, w, h);
        const s = (p.scale * 0.0012) * Math.min(w, h) / 1;
        const speed = p.speed;
        zt += 0.002 * p.drift;
        ctx.lineWidth = p.weight;
        for (let i = 0; i < count; i++) {
          const x = px[i];
          const y = py[i];
          const ang =
            noise.noise3(x * s * 0.01, y * s * 0.01, zt) * Math.PI * 3;
          const nx = x + Math.cos(ang) * speed;
          const ny = y + Math.sin(ang) * speed;
          const t = (Math.sin(ang) + 1) / 2;
          const c = state.colorAt(t);
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.55)`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          if (nx < 0 || nx > w || ny < 0 || ny > h) {
            const rand = Math.random();
            px[i] = rand * w;
            py[i] = Math.random() * h;
          } else {
            px[i] = nx;
            py[i] = ny;
          }
        }
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 2. STRANGE ATTRACTOR (de Jong)                                      */
/* ------------------------------------------------------------------ */
const attractor: EngineDef = {
  id: 'attractor',
  name: 'Strange Attractor',
  glyph: '∞',
  tagline: 'De Jong chaotic orbit density',
  description:
    'A single point orbits a chaotic map millions of times, accumulating density that reveals the hidden architecture of deterministic chaos.',
  params: [
    { key: 'a', label: 'Coeff α', min: -3, max: 3, step: 0.01, default: -2.24 },
    { key: 'b', label: 'Coeff β', min: -3, max: 3, step: 0.01, default: -0.74 },
    { key: 'c', label: 'Coeff γ', min: -3, max: 3, step: 0.01, default: 1.61 },
    { key: 'd', label: 'Coeff δ', min: -3, max: 3, step: 0.01, default: -2.43 },
    { key: 'density', label: 'Points / frame', min: 5000, max: 90000, step: 1000, default: 34000 },
    { key: 'glow', label: 'Glow', min: 1, max: 12, step: 0.5, default: 5 },
  ],
  create(ctx, w, h) {
    let x = 0.1;
    let y = 0.1;
    let sig = '';
    const clear = (state: EngineState) => {
      const bg = state.colorAt(0);
      ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
      ctx.fillRect(0, 0, w, h);
      x = 0.1;
      y = 0.1;
    };
    return {
      reset(state) {
        sig = `${state.params.a},${state.params.b},${state.params.c},${state.params.d}`;
        clear(state);
      },
      frame(state) {
        const p = state.params;
        const nsig = `${p.a},${p.b},${p.c},${p.d}`;
        if (nsig !== sig) {
          sig = nsig;
          clear(state);
        }
        const scale = Math.min(w, h) / 4.4;
        const cx = w / 2;
        const cy = h / 2;
        const n = Math.floor(p.density);
        ctx.globalCompositeOperation = 'lighter';
        const alpha = (p.glow / 12) * 0.5 + 0.02;
        for (let i = 0; i < n; i++) {
          const nx = Math.sin(p.a * y) - Math.cos(p.b * x);
          const ny = Math.sin(p.c * x) - Math.cos(p.d * y);
          x = nx;
          y = ny;
          const sx = cx + x * scale;
          const sy = cy + y * scale;
          const speed = Math.min(1, Math.hypot(nx - x, ny - y) + Math.abs(x) * 0.25);
          const t = (Math.abs(x) + Math.abs(y)) / 4;
          const c = state.colorAt(Math.min(0.98, 0.15 + t + speed * 0.2));
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
          ctx.fillRect(sx, sy, 1, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 3. REACTION-DIFFUSION (Gray-Scott)                                  */
/* ------------------------------------------------------------------ */
const reactionDiffusion: EngineDef = {
  id: 'reaction',
  name: 'Reaction–Diffusion',
  glyph: '◉',
  tagline: 'Gray–Scott morphogenesis',
  description:
    'Two virtual chemicals feed, react and diffuse across a grid, self-organising into the coral, spot and stripe patterns Turing predicted.',
  params: [
    { key: 'feed', label: 'Feed', min: 0.01, max: 0.09, step: 0.001, default: 0.037 },
    { key: 'kill', label: 'Kill', min: 0.045, max: 0.07, step: 0.0005, default: 0.06 },
    { key: 'iterations', label: 'Sim Speed', min: 1, max: 20, step: 1, default: 8 },
    { key: 'resolution', label: 'Grid Res', min: 80, max: 260, step: 20, default: 180 },
  ],
  create(ctx, w, h) {
    let gw = 0;
    let gh = 0;
    let a: Float32Array, b: Float32Array, a2: Float32Array, b2: Float32Array;
    let img: ImageData;
    let buf: HTMLCanvasElement;
    let bctx: CanvasRenderingContext2D;
    let sig = '';
    const init = (state: EngineState) => {
      gw = Math.floor(state.params.resolution);
      gh = Math.floor((gw * h) / w);
      a = new Float32Array(gw * gh);
      b = new Float32Array(gw * gh);
      a2 = new Float32Array(gw * gh);
      b2 = new Float32Array(gw * gh);
      a.fill(1);
      const rand = mulberry32(state.seed + 3);
      // seed random blobs of chemical B
      const seeds = 14;
      for (let s = 0; s < seeds; s++) {
        const cx = Math.floor(rand() * gw);
        const cy = Math.floor(rand() * gh);
        const r = 3 + rand() * 6;
        for (let y = -r; y <= r; y++) {
          for (let x = -r; x <= r; x++) {
            const px = cx + x;
            const py = cy + y;
            if (px < 0 || py < 0 || px >= gw || py >= gh) continue;
            if (x * x + y * y <= r * r) b[py * gw + px] = 1;
          }
        }
      }
      buf = document.createElement('canvas');
      buf.width = gw;
      buf.height = gh;
      bctx = buf.getContext('2d')!;
      img = bctx.createImageData(gw, gh);
    };
    const laplace = (arr: Float32Array, x: number, y: number): number => {
      const i = y * gw + x;
      const l = x > 0 ? arr[i - 1] : arr[i];
      const r = x < gw - 1 ? arr[i + 1] : arr[i];
      const u = y > 0 ? arr[i - gw] : arr[i];
      const d = y < gh - 1 ? arr[i + gw] : arr[i];
      const ul = x > 0 && y > 0 ? arr[i - gw - 1] : arr[i];
      const ur = x < gw - 1 && y > 0 ? arr[i - gw + 1] : arr[i];
      const dl = x > 0 && y < gh - 1 ? arr[i + gw - 1] : arr[i];
      const dr = x < gw - 1 && y < gh - 1 ? arr[i + gw + 1] : arr[i];
      return (
        arr[i] * -1 +
        (l + r + u + d) * 0.2 +
        (ul + ur + dl + dr) * 0.05
      );
    };
    return {
      reset(state) {
        sig = `${state.params.resolution}`;
        init(state);
      },
      frame(state) {
        const p = state.params;
        if (`${p.resolution}` !== sig) {
          sig = `${p.resolution}`;
          init(state);
        }
        const dA = 1.0;
        const dB = 0.5;
        const feed = p.feed;
        const kill = p.kill;
        const iters = Math.floor(p.iterations);
        for (let it = 0; it < iters; it++) {
          for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
              const i = y * gw + x;
              const av = a[i];
              const bv = b[i];
              const reaction = av * bv * bv;
              a2[i] = av + (dA * laplace(a, x, y) - reaction + feed * (1 - av));
              b2[i] = bv + (dB * laplace(b, x, y) + reaction - (kill + feed) * bv);
              if (a2[i] < 0) a2[i] = 0;
              else if (a2[i] > 1) a2[i] = 1;
              if (b2[i] < 0) b2[i] = 0;
              else if (b2[i] > 1) b2[i] = 1;
            }
          }
          let tmp = a;
          a = a2;
          a2 = tmp;
          tmp = b;
          b = b2;
          b2 = tmp;
        }
        const data = img.data;
        for (let i = 0; i < gw * gh; i++) {
          const v = Math.max(0, Math.min(1, a[i] - b[i]));
          const c = state.colorAt(1 - v);
          const j = i * 4;
          data[j] = c[0];
          data[j + 1] = c[1];
          data[j + 2] = c[2];
          data[j + 3] = 255;
        }
        bctx.putImageData(img, 0, 0);
        (ctx as any).imageSmoothingEnabled = true;
        ctx.drawImage(buf, 0, 0, w, h);
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 4. JULIA SET (animated)                                             */
/* ------------------------------------------------------------------ */
const julia: EngineDef = {
  id: 'julia',
  name: 'Julia Dreams',
  glyph: '✻',
  tagline: 'Living fractal boundary',
  description:
    'The complex parameter c walks a slow circle through the plane, morphing the Julia set through an endless family of fractal forms.',
  params: [
    { key: 'iterations', label: 'Iterations', min: 40, max: 400, step: 10, default: 160 },
    { key: 'radius', label: 'c Radius', min: 0.1, max: 0.9, step: 0.01, default: 0.7 },
    { key: 'orbitSpeed', label: 'Morph Speed', min: 0, max: 4, step: 0.05, default: 1 },
    { key: 'zoom', label: 'Zoom', min: 0.4, max: 3, step: 0.05, default: 1.15 },
    { key: 'quality', label: 'Detail', min: 120, max: 520, step: 40, default: 320 },
  ],
  create(ctx, w, h) {
    let bw = 0;
    let bh = 0;
    let img: ImageData;
    let buf: HTMLCanvasElement;
    let bctx: CanvasRenderingContext2D;
    let sig = '';
    let phase = 0;
    const init = (q: number) => {
      bw = Math.floor(q);
      bh = Math.floor((q * h) / w);
      buf = document.createElement('canvas');
      buf.width = bw;
      buf.height = bh;
      bctx = buf.getContext('2d')!;
      img = bctx.createImageData(bw, bh);
    };
    return {
      reset(state) {
        sig = `${state.params.quality}`;
        init(state.params.quality);
        phase = state.seed % 100;
      },
      frame(state) {
        const p = state.params;
        if (`${p.quality}` !== sig) {
          sig = `${p.quality}`;
          init(p.quality);
        }
        phase += 0.004 * p.orbitSpeed;
        const cRe = p.radius * Math.cos(phase * 0.9) - 0.2;
        const cIm = p.radius * Math.sin(phase * 1.3);
        const maxIter = Math.floor(p.iterations);
        const scale = 1 / p.zoom;
        const data = img.data;
        const aspect = bw / bh;
        for (let py = 0; py < bh; py++) {
          const y0 = ((py / bh) * 2 - 1) * 1.4 * scale;
          for (let px = 0; px < bw; px++) {
            const x0 = ((px / bw) * 2 - 1) * 1.4 * scale * aspect;
            let zx = x0;
            let zy = y0;
            let i = 0;
            while (i < maxIter) {
              const xt = zx * zx - zy * zy + cRe;
              zy = 2 * zx * zy + cIm;
              zx = xt;
              if (zx * zx + zy * zy > 16) break;
              i++;
            }
            const j = (py * bw + px) * 4;
            if (i >= maxIter) {
              const c0 = state.colorAt(0);
              data[j] = c0[0];
              data[j + 1] = c0[1];
              data[j + 2] = c0[2];
              data[j + 3] = 255;
            } else {
              const log_zn = Math.log(zx * zx + zy * zy) / 2;
              const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
              const smooth = (i + 1 - nu) / maxIter;
              const c = state.colorAt(Math.min(0.999, Math.pow(smooth, 0.5)));
              data[j] = c[0];
              data[j + 1] = c[1];
              data[j + 2] = c[2];
              data[j + 3] = 255;
            }
          }
        }
        bctx.putImageData(img, 0, 0);
        (ctx as any).imageSmoothingEnabled = true;
        ctx.drawImage(buf, 0, 0, w, h);
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 5. CYCLIC CELLULAR AUTOMATON                                        */
/* ------------------------------------------------------------------ */
const cyclic: EngineDef = {
  id: 'cyclic',
  name: 'Cyclic Automaton',
  glyph: '◴',
  tagline: 'Self-organising spiral waves',
  description:
    'Each cell consumes the next colour in a cycle when enough neighbours already hold it — from noise, hypnotic spiral galaxies emerge.',
  params: [
    { key: 'states', label: 'States', min: 6, max: 24, step: 1, default: 14 },
    { key: 'threshold', label: 'Threshold', min: 1, max: 4, step: 1, default: 2 },
    { key: 'resolution', label: 'Cell Grid', min: 120, max: 340, step: 20, default: 220 },
    { key: 'speed', label: 'Steps / frame', min: 1, max: 4, step: 1, default: 1 },
  ],
  create(ctx, w, h) {
    let gw = 0;
    let gh = 0;
    let grid: Uint8Array, next: Uint8Array;
    let img: ImageData;
    let buf: HTMLCanvasElement;
    let bctx: CanvasRenderingContext2D;
    let sig = '';
    let states = 14;
    const init = (state: EngineState) => {
      gw = Math.floor(state.params.resolution);
      gh = Math.floor((gw * h) / w);
      states = Math.floor(state.params.states);
      grid = new Uint8Array(gw * gh);
      next = new Uint8Array(gw * gh);
      const rand = mulberry32(state.seed + 11);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.floor(rand() * states);
      buf = document.createElement('canvas');
      buf.width = gw;
      buf.height = gh;
      bctx = buf.getContext('2d')!;
      img = bctx.createImageData(gw, gh);
    };
    return {
      reset(state) {
        sig = `${state.params.resolution}|${state.params.states}`;
        init(state);
      },
      frame(state) {
        const p = state.params;
        const nsig = `${p.resolution}|${p.states}`;
        if (nsig !== sig) {
          sig = nsig;
          init(state);
        }
        const thr = Math.floor(p.threshold);
        const steps = Math.floor(p.speed);
        for (let s = 0; s < steps; s++) {
          for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
              const i = y * gw + x;
              const cur = grid[i];
              const wantNext = (cur + 1) % states;
              let cnt = 0;
              // 8-neighbourhood with wrap
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = (x + dx + gw) % gw;
                  const ny = (y + dy + gh) % gh;
                  if (grid[ny * gw + nx] === wantNext) cnt++;
                }
              }
              next[i] = cnt >= thr ? wantNext : cur;
            }
          }
          const tmp = grid;
          grid = next;
          next = tmp;
        }
        const data = img.data;
        for (let i = 0; i < grid.length; i++) {
          const c = state.colorAt(grid[i] / (states - 1));
          const j = i * 4;
          data[j] = c[0];
          data[j + 1] = c[1];
          data[j + 2] = c[2];
          data[j + 3] = 255;
        }
        bctx.putImageData(img, 0, 0);
        (ctx as any).imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, w, h);
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* 6. RECURSIVE FRACTAL GROWTH                                         */
/* ------------------------------------------------------------------ */
const fractalTree: EngineDef = {
  id: 'tree',
  name: 'Fractal Growth',
  glyph: '☲',
  tagline: 'Recursive branching organism',
  description:
    'A recursive branching system sways in an invisible breeze, blossoming with light at its extremities — pure algorithmic botany.',
  params: [
    { key: 'depth', label: 'Recursion Depth', min: 6, max: 13, step: 1, default: 10 },
    { key: 'angle', label: 'Branch Angle', min: 10, max: 55, step: 1, default: 26 },
    { key: 'ratio', label: 'Length Ratio', min: 0.6, max: 0.82, step: 0.01, default: 0.75 },
    { key: 'sway', label: 'Wind Sway', min: 0, max: 12, step: 0.5, default: 4 },
    { key: 'splits', label: 'Branches', min: 2, max: 4, step: 1, default: 2 },
  ],
  create(ctx, w, h) {
    let t = 0;
    return {
      reset() {
        t = 0;
        ctx.fillStyle = '#05060a';
        ctx.fillRect(0, 0, w, h);
      },
      frame(state) {
        const p = state.params;
        t += 0.02;
        const bg = state.colorAt(0);
        ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
        ctx.fillRect(0, 0, w, h);
        const maxDepth = Math.floor(p.depth);
        const base = Math.min(w, h) * 0.26;
        const baseAngle = (p.angle * Math.PI) / 180;
        const splits = Math.floor(p.splits);
        const draw = (
          x: number,
          y: number,
          len: number,
          dir: number,
          depth: number
        ) => {
          if (depth > maxDepth || len < 1) return;
          const wind =
            (p.sway / 100) * Math.sin(t + depth * 0.5) * (maxDepth - depth + 1) * 0.12;
          const a = dir + wind;
          const nx = x + Math.cos(a) * len;
          const ny = y + Math.sin(a) * len;
          const tcol = depth / maxDepth;
          const c = state.colorAt(0.2 + tcol * 0.75);
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.35 + tcol * 0.5})`;
          ctx.lineWidth = Math.max(0.4, (maxDepth - depth) * 0.7);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          if (depth === maxDepth) {
            const tip = state.colorAt(0.95);
            ctx.fillStyle = `rgba(${tip[0]},${tip[1]},${tip[2]},0.8)`;
            ctx.beginPath();
            ctx.arc(nx, ny, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
          const spread = splits === 2 ? [-1, 1] : splits === 3 ? [-1, 0, 1] : [-1.5, -0.5, 0.5, 1.5];
          for (const s of spread) {
            draw(nx, ny, len * p.ratio, a + baseAngle * s, depth + 1);
          }
        };
        draw(w / 2, h * 0.96, base, -Math.PI / 2, 0);
      },
    };
  },
};

export const ENGINES: EngineDef[] = [
  flowField,
  attractor,
  reactionDiffusion,
  julia,
  cyclic,
  fractalTree,
];

export function defaultParams(def: EngineDef): Record<string, number> {
  const o: Record<string, number> = {};
  for (const pr of def.params) o[pr.key] = pr.default;
  return o;
}

export function randomParams(def: EngineDef, rand: () => number): Record<string, number> {
  const o: Record<string, number> = {};
  for (const pr of def.params) {
    const steps = Math.floor((pr.max - pr.min) / pr.step);
    const v = pr.min + Math.floor(rand() * (steps + 1)) * pr.step;
    o[pr.key] = Math.round(v / pr.step) * pr.step;
  }
  return o;
}
