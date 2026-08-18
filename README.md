# CHIMERA V1

**Browser-based generative synthesizer.** Six algorithmic engines share one typed contract, one seedable PRNG, and one palette lookup. The UI is a parameter surface. The canvas is the output.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-087ea4?style=flat-square&logo=react&logoColor=fff)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=fff)](https://vite.dev/)
[![Renderer](https://img.shields.io/badge/renderer-Canvas%202D-111111?style=flat-square)](#architecture)
[![Strict](https://img.shields.io/badge/tsc-strict-3178C6?style=flat-square)](./tsconfig.app.json)
[![License](https://img.shields.io/badge/license-unlicensed-lightgrey?style=flat-square)](#license)

> A static client application. No backend, no accounts, no network calls from application code. `npm run build` produces a deployable Vite bundle.

---

## Contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Engines](#engines)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Configuration](#configuration)
- [Extending](#extending)
- [Performance](#performance)
- [Project structure](#project-structure)
- [Development](#development)
- [Quality bar](#quality-bar)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [References](#references)
- [License](#license)

---

## Why this exists

Most generative sketches bind one algorithm to one page. Adding a second algorithm means copying the render loop, the sliders, and the colour handling. The two copies then diverge.

CHIMERA inverts that. The host owns transport, layout, seed, palette, and the animation frame. An engine owns only its buffers and its step. The boundary is a TypeScript contract (`EngineDef` / `EngineInstance` / `EngineState`). A new algorithm is a new object pushed onto an array. The UI enumerates that array; it does not special-case engines.

The other constraint is **reproducibility**. Genesis state — particle placement, chemical inoculum, automaton field, Perlin permutation — is derived from an explicit integer seed through Mulberry32. Parameter randomisation walks each control’s own `[min, max, step]` lattice, so a randomised patch is always a value the slider can represent.

This is a v1 instrument, not a platform. The scope is deliberate: one page, six engines, a shared colour ramp, a PNG export. Complexity that does not serve that scope is omitted.

---

## Features

| Area | What is implemented |
| --- | --- |
| Engines | Flow field, Peter de Jong attractor, Gray–Scott reaction–diffusion, animated Julia set, cyclic cellular automaton, recursive branching |
| Contract | Typed parameter schema, `create` / `reset` / `frame`, no DOM access from engines |
| Colour | Eight five-stop ramps; engines sample `colorAt(t) → [r, g, b]` |
| Determinism | Mulberry32 for genesis; seedable Perlin permutation table |
| Transport | Play / pause, reset, randomize, PNG export, fullscreen stage |
| Host | Per-engine parameter maps (switching engines does not clobber the previous patch), live sliders, FPS window, compact seed readout |
| Render | `ResizeObserver`-driven canvas; device pixel ratio clamped at 1.75; opaque 2D context |
| Delivery | Vite 7 + React 19 + TypeScript `strict`; ESLint flat config; static build |

What is **not** claimed: automated tests, CI, a public API, persistence, URL-serialized patches, WebGL, or a worker pool. Those are listed under [Roadmap](#roadmap) where they are intended.

---

## Engines

Each engine declares its controls. The host renders one slider per `ParamDef`. Structural invalidation (particle count, grid size, coefficient set) is detected inside the engine via a local signature; the host does not need to know which knobs reallocate buffers.

| ID | Name | Algorithm | Default cost centre |
| --- | --- | --- | --- |
| `flow` | Flow Field | 3D Perlin advection of particles | Particle count × stroke |
| `attractor` | Strange Attractor | Peter de Jong map, additive 1×1 density | Points / frame |
| `reaction` | Reaction–Diffusion | Gray–Scott, 9-point Laplacian | Grid × iterations / frame |
| `julia` | Julia Dreams | Escape-time \(z^2 + c(t)\), smooth dwell | Detail × iterations |
| `cyclic` | Cyclic Automaton | Greenberg–Hastings, toroidal Moore neighbourhood | Grid × steps / frame |
| `tree` | Fractal Growth | Recursive branching with closed-form wind | \(O(\text{arity}^{\text{depth}})\) |

### Flow Field (`flow`)

Particles integrate along headings sampled from a seedable 3D Perlin field. *Field Scale* sets spatial frequency; *Field Drift* advances the temporal slice. Trails are a per-frame fade, not a history buffer.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `count` | Particles | 200–6000 | 100 | 2600 |
| `scale` | Field Scale | 0.5–6 | 0.1 | 2.2 |
| `speed` | Velocity | 0.2–5 | 0.1 | 1.6 |
| `drift` | Field Drift | 0–4 | 0.1 | 1.0 |
| `fade` | Trail Length | 0.5–20 | 0.5 | 5 |
| `weight` | Line Weight | 0.4–3 | 0.1 | 0.9 |

Positions are `Float32Array` pairs. Initial placement is seeded. Particles that leave the frame are reinserted with `Math.random` — the only non-seeded path in the engines, documented so it is not mistaken for a guarantee.

### Strange Attractor (`attractor`)

Iterates the Peter de Jong map

```
x' = sin(a · y) − cos(b · x)
y' = sin(c · x) − cos(d · y)
```

and accumulates density with `globalCompositeOperation = 'lighter'`, restored to `source-over` after the batch. Changing any coefficient clears the buffer.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `a`–`d` | Coeff α–δ | −3–3 | 0.01 | −2.24, −0.74, 1.61, −2.43 |
| `density` | Points / frame | 5000–90000 | 1000 | 34000 |
| `glow` | Glow | 1–12 | 0.5 | 5 |

### Reaction–Diffusion (`reaction`)

Gray–Scott on a grid, \(D_A = 1\), \(D_B = 0.5\). Laplacian weights: centre −1, cardinals 0.2, diagonals 0.05. Reset stamps 14 seed-derived disks of \(B\) into \(A = 1\). Display is \(A − B\) through the active palette, simulated at grid resolution and blit to the stage.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `feed` | Feed | 0.01–0.09 | 0.001 | 0.037 |
| `kill` | Kill | 0.045–0.07 | 0.0005 | 0.06 |
| `iterations` | Sim Speed | 1–20 | 1 | 8 |
| `resolution` | Grid Res | 80–260 | 20 | 180 |

### Julia Dreams (`julia`)

Escape-time Julia set for \(z \mapsto z^2 + c\). \(c\) orbits

```
c(t) = r·cos(0.9 t) − 0.2  +  i · r·sin(1.3 t)
```

Colour uses the standard smooth-iteration \(\nu\) correction. Interior points take `colorAt(0)`. Phase is initialized from `seed % 100`.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `iterations` | Iterations | 40–400 | 10 | 160 |
| `radius` | c Radius | 0.1–0.9 | 0.01 | 0.7 |
| `orbitSpeed` | Morph Speed | 0–4 | 0.05 | 1 |
| `zoom` | Zoom | 0.4–3 | 0.05 | 1.15 |
| `quality` | Detail | 120–520 | 40 | 320 |

Highest per-pixel cost in the set. Lower *Detail* or *Iterations* first if the frame time is unacceptable.

### Cyclic Automaton (`cyclic`)

Each cell holds one of \(N\) states and advances to \((s+1) \bmod N\) when at least \(T\) Moore neighbours already hold that successor. The grid is toroidal. Image smoothing is forced off so the lattice stays a lattice.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `states` | States | 6–24 | 1 | 14 |
| `threshold` | Threshold | 1–4 | 1 | 2 |
| `resolution` | Cell Grid | 120–340 | 20 | 220 |
| `speed` | Steps / frame | 1–4 | 1 | 1 |

### Fractal Growth (`tree`)

Recursive branching from the bottom centre. Wind is a depth-weighted sinusoid of time, not noise, so the motion is periodic. The scene is redrawn each frame; there is no accumulating buffer. Stroke width tapers with remaining depth; tips sample the high end of the palette.

| Key | Label | Range | Step | Default |
| --- | --- | --- | --- | --- |
| `depth` | Recursion Depth | 6–13 | 1 | 10 |
| `angle` | Branch Angle | 10–55 | 1 | 26 |
| `ratio` | Length Ratio | 0.60–0.82 | 0.01 | 0.75 |
| `sway` | Wind Sway | 0–12 | 0.5 | 4 |
| `splits` | Branches | 2–4 | 1 | 2 |

---

## Architecture

```
App.tsx                         owns
  ├─ engine id, per-engine params, palette, seed, play flag
  ├─ ResizeObserver → backing-store size
  ├─ stateRef: EngineState      (read by the RAF loop, no remount)
  └─ requestAnimationFrame
        └─ EngineInstance.frame(state)
              └─ CanvasRenderingContext2D

src/lib/engines.ts              six EngineDef + defaultParams / randomParams
src/lib/noise.ts                seedable classic Perlin (2D / 3D)
src/lib/palettes.ts             ramps + makeColorAt
```

### Contract

```ts
interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

interface EngineState {
  params: Record<string, number>;
  palette: string[];
  colorAt: (t: number) => [number, number, number];
  seed: number;
}

interface EngineInstance {
  frame(state: EngineState): void;
  reset(state: EngineState): void;
}

interface EngineDef {
  id: string;
  name: string;
  glyph: string;
  tagline: string;
  description: string;
  params: ParamDef[];
  create(ctx: CanvasRenderingContext2D, w: number, h: number): EngineInstance;
}
```

An instance is constructed once per `(engineId, width, height)`. Slider input does not tear it down. The RAF loop reads `stateRef`; React re-renders do not rebuild the frame callback. Play/pause is a ref flip — the loop keeps running so the FPS window still reflects a paused stage (zero committed frames).

### Separation of concerns

| Owner | Responsibility | Must not |
| --- | --- | --- |
| `App.tsx` | Layout, transport, parameter bus, canvas lifetime | Inspect engine buffers |
| Engine | Allocate, step, draw | Touch the DOM or parse hex |
| `palettes.ts` | Ramp data and interpolation | Know what \(t\) means |
| `noise.ts` | Seedable gradient noise | Own colour or canvas |

### Determinism

- Genesis PRNG is Mulberry32. The same function is used to shuffle the Perlin table (Fisher–Yates into a 512-entry wrap-free permutation).
- `randomParams` snaps to each `ParamDef`’s step. The host’s **Generate New** action draws a new integer seed, then a Mulberry32 stream from that seed.
- Known leak: flow-field wrap-around uses `Math.random`. Reset from the same seed still reconstructs the initial field; long-running sessions will diverge after particles leave the frame.

### Colour

`makeColorAt` piecewise-linearly interpolates five hex stops in sRGB and returns rounded integer triples. Engines choose the meaning of \(t \in [0, 1]\) (heading, residual, dwell, discrete state, depth). They never store palette hex.

Shipped ramps: Aurora, Ember, Ultraviolet, Bone, Coral Reef, Acid, Sakura, Glacier.

### Render loop

- Backing store = CSS size × `min(devicePixelRatio, 1.75)`.
- Context is created with `{ alpha: false }`.
- FPS is a 500 ms sliding window, not a single-frame reciprocal.
- Accumulative engines fade or add into an uncleared buffer. Grid engines step `ImageData` offscreen and blit. Julia and the tree redraw.

---

## Getting started

**Runtime:** Node.js 20.19+ (Vite 7). A current Chromium, Firefox, or Safari. No GPU requirement beyond what Canvas 2D already needs.

```bash
git clone https://github.com/zazieproductions/CHIMERA-V1-Generative-Synth.git
cd CHIMERA-V1-Generative-Synth
npm install
npm run dev
```

Open the URL Vite prints. There is no `.env` file to create.

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Dev server with HMR |
| `build` | `tsc -b && vite build` | Typecheck the project references, then emit `dist/` |
| `preview` | `vite preview` | Serve the production bundle locally |
| `lint` | `eslint .` | Flat-config ESLint over `*.ts` / `*.tsx` |

`build` is the gate: a type error fails the emit. `tsconfig.app.json` enables `strict` and `noFallthroughCasesInSwitch`.

---

## Usage

The shell is three panes.

| Region | Role |
| --- | --- |
| Left rail | Engine list (`ENGINES.map`). Switching changes the active schema and instance; stored patches for other engines are kept. |
| Centre | Stage canvas, vignette, floating transport, live engine name. |
| Right | Description, sliders bound to the active `ParamDef[]`, palette grid, **Generate New**. |
| Header | Wordmark, FPS, seed rendered as a short base-36 token. |

### Transport

| Control | Behaviour |
| --- | --- |
| Play / Pause | Sets `playingRef`. The RAF handle is not cancelled. |
| Reset | `instance.reset(state)` — rebuilds buffers from the current seed and params. |
| Randomize / Generate New | New seed in `[0, 1e9)`, lattice-walked params, 50% chance of a new palette, then reset. |
| Export PNG | `canvas.toDataURL('image/png')` as `chimera-{engineId}-{seed}.png`. |
| Fullscreen | `Element.requestFullscreen()` on the stage wrapper only. |

### Typical session

1. Select **Strange Attractor**.
2. Leave the default coefficients; raise **Glow** if the density is thin on a bright display.
3. Switch palette to **Ember** or **Ultraviolet** — the buffer resets so the new floor is clean.
4. Press **Generate New** to walk the coefficient lattice.
5. Export when the accumulation is dense enough.

There is no undo stack and no patch file. The current picture is the live canvas.

---

## Configuration

There is no runtime configuration file and no required environment variables. Vite is set to accept `VITE_` and `NEXT_PUBLIC_` prefixes; application code does not read them.

The configuration surface is source:

| Concern | Location | Notes |
| --- | --- | --- |
| Engine set and parameter lattices | `src/lib/engines.ts` → `ENGINES` | Adding or removing an entry is the full registration |
| Colour ramps | `src/lib/palettes.ts` → `PALETTES` | Five hex stops, low → high |
| Initial seed | `src/App.tsx` (`useState(42)`) | Integer; header shows `seed.toString(36)` |
| DPR ceiling | `src/App.tsx` (`Math.min(..., 1.75)`) | Protects high-DPI backing-store cost |
| Typecheck | `tsconfig.app.json`, `tsconfig.node.json` | Project references; `tsc -b` |
| Lint | `eslint.config.js` | `dist/` ignored |

When adding a palette, keep the first stop near-black. Several engines use `colorAt(0)` as a clear colour; a light floor will flash the stage on reset.

---

## Extending

A seventh engine is one `EngineDef` appended to `ENGINES`. `defaultParams` and `randomParams` pick up the schema. The rail, sliders, and randomize path require no host edits.

```ts
const example: EngineDef = {
  id: 'example',
  name: 'Example',
  glyph: '·',
  tagline: 'One-line behaviour',
  description: 'What the operator is modulating.',
  params: [
    { key: 'rate', label: 'Rate', min: 0, max: 1, step: 0.01, default: 0.4 },
  ],
  create(ctx, w, h) {
    return {
      reset(state) {
        /* rebuild every buffer from state.seed and state.params */
      },
      frame(state) {
        const { rate } = state.params;
        const [r, g, b] = state.colorAt(rate);
        /* draw; do not allocate in the inner loop */
      },
    };
  },
};
```

Conventions the existing engines follow:

1. `reset` is total. No leftover particles, grid, or composite mode.
2. Detect buffer-invalidating params locally (string signature or integer compare). Do not ask the host to remount.
3. Colour only through `state.colorAt`.
4. Chance only through Mulberry32 constructed from `state.seed` plus a small odd salt, so two streams in one engine do not couple.
5. Noise through `import { Noise } from './noise'` and `reseed` on reset.
6. Typed arrays for per-cell / per-particle state. No object-per-cell.

---

## Performance

The renderer is Canvas 2D on the main thread. Cost is bounded by the sliders, not by a hidden quality tier.

- Particle and grid state is `Float32Array` / `Uint8Array`.
- Gray–Scott and the cyclic automaton simulate at field resolution and blit; the display may be larger than the field.
- Julia is the expensive engine. *Detail* sets offscreen width; *Iterations* sets the escape ceiling. Both are operator-facing.
- DPR is clamped so a 3× laptop does not triple fill rate by default.
- Attractor cost is linear in *Points / frame*. Raising *Glow* is cheaper than raising density when the image is only thin, not sparse.
- Parameter identity is a string or integer signature checked once per frame, not a deep compare.

There is no frame-time budget enforcer. If a combination is too heavy, lower the engine’s cost-centre control (see the table in [Engines](#engines)).

---

## Project structure

```
.
├── index.html              App shell, document metadata
├── package.json            Scripts and dependencies
├── eslint.config.js        Flat ESLint config
├── tsconfig.json           Solution-style references
├── tsconfig.app.json       Strict app project (`src/`)
├── tsconfig.node.json      Vite config project
├── vite.config.ts          React + Tailwind plugins
└── src/
    ├── main.tsx            React 19 mount
    ├── App.tsx             Host: bus, loop, layout
    ├── index.css           Tokens, range thumb, scrollbars
    └── lib/
        ├── engines.ts      Contract + six implementations
        ├── noise.ts        Perlin 2D / 3D
        └── palettes.ts     Ramps + interpolator
```

`engines.ts` is intentionally a single module. Each engine is delimited and independently readable. There is no abstract base class and no plugin loader.

---

## Development

```bash
npm install
npm run dev          # iterate on an engine or the host
npm run lint         # eslint .
npm run build        # tsc -b && vite build
npm run preview      # sanity-check the production bundle
```

Workflow that matches how the tree is laid out:

1. Change an algorithm in `src/lib/engines.ts`, or the host in `src/App.tsx`.
2. Confirm the engine still `reset`s cleanly after a palette change and a seed change.
3. Confirm sliders that should not reallocate (velocity, glow, wind) do not flash the canvas.
4. Run `lint` and `build` before opening a pull request.

HMR is sufficient for host and palette work. Changes to inner-loop math are verified by eye against the live stage; there is no screenshot fixture suite yet.

---

## Quality bar

Enforced today:

- TypeScript `strict` on `src/`
- `tsc -b` as part of `npm run build`
- ESLint recommended + `typescript-eslint` + React Hooks + React Refresh
- Engine isolation via the public contract
- Parameter values confined to declared lattices

Not present, and not implied by the badges:

- Unit or visual regression tests
- CI workflow
- Preview deployments from this repository
- Package `engines` field / Volta pin (Node 20.19+ is a Vite 7 requirement, not a repo pin)
- SPDX license

A change that weakens the contract — engines reading the DOM, host code indexing engine buffers, unseeded genesis — should be rejected even if it types-check.

---

## Security

The synthesizer is a static front-end.

- `src/` performs no `fetch`, WebSocket, or storage I/O. There is no auth surface and no user data model.
- PNG export is a local `toDataURL` download. Canvas contents are not uploaded.
- Typography is loaded from Google Fonts via `src/index.css`. That is the application’s only intended third-party request at runtime.
- `index.html` in this tree may contain preview-host instrumentation. A production deployment should ship the Vite `dist/` output and should not copy unrelated third-party scripts into the document.
- Dependency updates should be reviewed as for any browser app that executes third-party JS (React, Vite, Tailwind). There is no server attack surface in this repository.

This section is a description of the current shape, not a security audit.

---

## Roadmap

Ordered by how much they reinforce the existing design, not by marketing priority.

| Item | Why |
| --- | --- |
| Unit tests for Mulberry32, `makeColorAt`, `randomParams`, and Perlin range | The reproducibility claim is currently unenforced |
| CI: `lint` + `build` on pull request | Matches the local gate |
| SPDX license | The tree is visible, not granted |
| Serializable patch (`engine`, params, palette, seed) | The state tuple already exists; URL or JSON would make it shareable |
| Seeded wrap-around in the flow field | Closes the documented `Math.random` leak |
| Optional worker for Julia / Gray–Scott | Main-thread cost is concentrated there |
| Dependency hygiene | Lockfile includes modules the host does not import |

No dates. Items land when they can be done without widening the contract.

---

## Contributing

Issues and pull requests are welcome for bug fixes, engine implementations that honour the contract, and documentation that stays within what the code does.

1. Open an issue before a new engine or a host-level feature, so the parameter lattice and cost centre can be agreed.
2. Keep `EngineDef` stable. Add fields only if every existing engine has a coherent value.
3. Do not allocate in an inner loop. Do not introduce a rendering dependency for a single engine.
4. `npm run lint` and `npm run build` must pass.
5. Do not add a license file, analytics, or a network call in a drive-by PR.

There is no published code of conduct file. Ordinary professional conduct applies.

---

## References

The engines implement known methods. The work is the shared runtime, not a new equation.

| Engine | Source |
| --- | --- |
| Flow field | Ken Perlin, *An Image Synthesizer* (SIGGRAPH 1985); improved fade (2002) |
| Attractor | Peter de Jong map |
| Reaction–diffusion | Turing (1952); Gray–Scott / Pearson parameterisation |
| Julia | Escape-time iteration; smooth \(\nu\) colouring |
| Cyclic | Greenberg & Hastings (1978) and cyclic CA variants |
| Growth | Recursive branching in the spirit of L-systems, not an L-system interpreter |

Noise is an in-repo Perlin implementation (~80 lines). There is no third-party noise package.

---

## License

This repository does not include an SPDX license. Default copyright applies. The source is public for inspection; it is not a grant to copy, modify, or redistribute. Ask the copyright holder before reuse.

If you are reading a fork, check that tree for a license of its own.

---

CHIMERA V1 — [zazieproductions/CHIMERA-V1-Generative-Synth](https://github.com/zazieproductions/CHIMERA-V1-Generative-Synth)
