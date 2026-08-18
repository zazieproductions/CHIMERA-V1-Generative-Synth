# CHIMERA V1

**A generative art synthesizer for the browser.**

Six deterministic engines. One live parameter surface. A seedable PRNG. Eight hand-tuned palettes. Nothing leaves the canvas until you export it.

CHIMERA is not a gallery and it is not a toy. It is an instrument: a tightly specified runtime in which flow fields, chaotic maps, reaction–diffusion, Julia sets, cyclic automata, and recursive growth all speak the same contract, share the same colour lookup, and respond to the same transport.

```
  ≿  Flow Field            Perlin-driven particle currents
  ∞  Strange Attractor     Peter de Jong orbit density
  ◉  Reaction–Diffusion    Gray–Scott morphogenesis
  ✻  Julia Dreams          Animated complex-plane boundary
  ◴  Cyclic Automaton      Greenberg–Hastings spiral waves
  ☲  Fractal Growth        Recursive branching organism
```

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=000" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Canvas 2D" src="https://img.shields.io/badge/Renderer-Canvas%202D-d9f24e?style=flat-square" />
  <img alt="Deterministic" src="https://img.shields.io/badge/PRNG-Mulberry32-111111?style=flat-square" />
</p>

---

## Why it exists

Most “generative” pages are a single sketch with three sliders glued on. CHIMERA is the opposite: a **shared synthesis architecture** into which algorithms are mounted as engines.

Every engine is a closed system with a typed parameter schema, a `reset` that reconstructs internal state from a seed, and a `frame` that advances one tick. The UI never reaches into an engine’s buffers. The engines never reach into the DOM. Colour is never hardcoded. Randomness is never `Math.random` at the point of genesis — it is a **Mulberry32** stream derived from an explicit integer seed.

The result is a machine you can play. Change the feed rate of a Gray–Scott field and watch spots collapse into labyrinths. Walk the four coefficients of a de Jong map and the attractor unfolds a different skeleton. Orbit the complex parameter of a Julia set and the boundary breathes.

Same seed. Same palette. Same parameters. Same picture. That is not a slogan. It is a constraint the entire stack is built around.

---

## The engines

Each engine is a self-contained instrument. Parameters are declared, not improvised: every control has a key, a human label, a closed interval, a step, and a documented default. Randomisation walks that lattice — it never emits values the slider cannot represent.

### ≿ Flow Field

Thousands of particles advect through a **3-dimensional Perlin field**. Spatial frequency is set by *Field Scale*; the third axis is time, advanced by *Field Drift*. Each particle paints a short segment coloured by the sine of its heading, then wraps by reseeding when it leaves the frame.

| Parameter     | Range        | Role                                              |
| ------------- | ------------ | ------------------------------------------------- |
| Particles     | 200 – 6 000  | Simultaneous tracers                              |
| Field Scale   | 0.5 – 6.0    | Spatial frequency of the noise lattice            |
| Velocity      | 0.2 – 5.0    | Integration step along the sampled heading        |
| Field Drift   | 0.0 – 4.0    | Temporal walk of the z-slice                      |
| Trail Length  | 0.5 – 20     | Inverse fade; longer values accumulate history    |
| Line Weight   | 0.4 – 3.0    | Stroke width in device pixels                     |

Positions live in `Float32Array` pairs. The field is sampled with a compact, seedable Perlin implementation — Ken Perlin’s improved quintic fade \(6t^5 - 15t^4 + 10t^3\), hashed gradients, no external noise library.

### ∞ Strange Attractor

A single point is iterated through the **Peter de Jong map**

\[
\begin{aligned}
x_{n+1} &= \sin(\alpha\, y_n) - \cos(\beta\, x_n) \\
y_{n+1} &= \sin(\gamma\, x_n) - \cos(\delta\, y_n)
\end{aligned}
\]

tens of thousands of times per frame. Each hit is a 1×1 additive splat. Over seconds the density image of a chaotic attractor condenses out of nothing — the hidden architecture of a deterministic orbit.

Coefficients are watched. Change \(\alpha, \beta, \gamma, \delta\) and the buffer is cleared; the new map is allowed to accumulate from a clean slate. Composite mode is `lighter` for the plot, restored to `source-over` afterwards so the rest of the pipeline stays honest.

| Parameter      | Range           | Role                                         |
| -------------- | --------------- | -------------------------------------------- |
| Coeff α–δ      | −3.00 – 3.00    | The four de Jong coefficients                |
| Points / frame | 5 000 – 90 000  | Orbit samples committed each tick            |
| Glow           | 1.0 – 12.0      | Per-splat alpha; the density gain            |

### ◉ Reaction–Diffusion

Two virtual chemicals \(A\) and \(B\) evolve on a grid under the **Gray–Scott** system

\[
\begin{aligned}
\partial_t A &= D_A \nabla^2 A - AB^2 + f\,(1 - A) \\
\partial_t B &= D_B \nabla^2 B + AB^2 - (k + f)\, B
\end{aligned}
\]

with \(D_A = 1\), \(D_B = 0.5\). The Laplacian is the classic 9-point stencil (cardinals \(0.2\), diagonals \(0.05\), centre \(-1\)). Fourteen seed-derived blobs of \(B\) are stamped into a field of \(A = 1\) at reset. The visible image is \(A - B\), remapped through the active palette.

This is Turing’s morphogenesis, running live: spots, stripes, coral, and labyrinths are not textures. They are the attractors of a chemical system you are modulating.

| Parameter | Range          | Role                                      |
| --------- | -------------- | ----------------------------------------- |
| Feed \(f\)| 0.010 – 0.090  | Replenishment of \(A\)                    |
| Kill \(k\)| 0.045 – 0.070  | Removal of \(B\)                          |
| Sim Speed | 1 – 20         | Gray–Scott iterations committed per frame |
| Grid Res  | 80 – 260       | Horizontal cells; vertical follows aspect |

### ✻ Julia Dreams

The Julia set for \(z \mapsto z^2 + c\) is rendered with **smooth iteration counting** (the renormalised \(\nu\) correction) so banding never appears. The complex parameter \(c\) is not fixed: it walks a slow, slightly eccentric orbit

\[
c(t) = r\cos(0.9\,t) - 0.2 \;+\; i\, r\sin(1.3\,t)
\]

so the fractal is a living family, not a still. Interior points take the palette floor; escaped points take a gamma-shaped lookup of the smooth dwell.

| Parameter    | Range        | Role                                         |
| ------------ | ------------ | -------------------------------------------- |
| Iterations   | 40 – 400     | Escape-time ceiling                          |
| \(c\) Radius | 0.10 – 0.90  | Orbit radius in the complex plane            |
| Morph Speed  | 0.00 – 4.00  | Angular rate of \(c(t)\)                     |
| Zoom         | 0.40 – 3.00  | Reciprocal scale of the window               |
| Detail       | 120 – 520    | Offscreen buffer width; height follows aspect|

### ◴ Cyclic Automaton

A **Greenberg–Hastings / cyclic cellular automaton** on a toroidal grid. Each cell holds one of \(N\) states. It advances to \((s+1) \bmod N\) only when at least \(T\) of its eight neighbours already hold that successor. From a seed-shuffled field, spiral wavefronts self-organise — the same geometry that appears in the Belousov–Zhabotinsky reaction and in cortical spreading depression.

Pixelation is deliberate: image smoothing is forced **off** so the lattice remains a lattice.

| Parameter     | Range       | Role                                    |
| ------------- | ----------- | --------------------------------------- |
| States        | 6 – 24      | Length of the colour cycle              |
| Threshold     | 1 – 4       | Neighbour votes required to advance     |
| Cell Grid     | 120 – 340   | Horizontal cells                        |
| Steps / frame | 1 – 4       | Generations committed per tick          |

### ☲ Fractal Growth

A recursive branching system — algorithmic botany. Depth, bifurcation count, length ratio, and opening angle are live. An invisible breeze modulates heading as a function of depth and time, so the organism sways rather than ticks. Terminal nodes receive a tip flare from the high end of the palette; stroke weight tapers with remaining depth.

This engine is redrawn each frame (it has no accumulating buffer). Wind is a closed-form sinusoid, not noise, so the motion is periodic and inspectable.

| Parameter        | Range       | Role                                 |
| ---------------- | ----------- | ------------------------------------ |
| Recursion Depth  | 6 – 13      | Maximum branch generation            |
| Branch Angle     | 10° – 55°   | Opening of each split                |
| Length Ratio     | 0.60 – 0.82 | Child length as a fraction of parent |
| Wind Sway        | 0 – 12      | Amplitude of the depth-weighted breeze |
| Branches         | 2 – 4       | Split arity                          |

---

## Architecture

CHIMERA is a small number of ruthless interfaces and a render loop that refuses to be clever.

```
┌──────────────────────────────────────────────────────────────────┐
│  App.tsx                                                         │
│  engine · params · palette · seed · transport · ResizeObserver   │
│                              │                                   │
│                     EngineState (ref)                            │
│            params · palette · colorAt(t) · seed                  │
│                              │                                   │
│                     requestAnimationFrame                        │
│                              ▼                                   │
│                   EngineInstance.frame(state)                    │
│                   CanvasRenderingContext2D                       │
└──────────────────────────────────────────────────────────────────┘
         │                │                 │
         ▼                ▼                 ▼
   src/lib/engines.ts  src/lib/noise.ts  src/lib/palettes.ts
   six EngineDef         Perlin 2D/3D      8 ramps + lerp
```

### The engine contract

```ts
interface EngineDef {
  id: string;
  name: string;
  glyph: string;
  tagline: string;
  description: string;
  params: ParamDef[];
  create(ctx: CanvasRenderingContext2D, w: number, h: number): EngineInstance;
}

interface EngineInstance {
  frame(state: EngineState): void;
  reset(state: EngineState): void;
}

interface EngineState {
  params: Record<string, number>;
  palette: string[];
  colorAt: (t: number) => [number, number, number];
  seed: number;
}
```

An engine is constructed once per `(engineId, width, height)` triple. Parameter changes do **not** tear down the instance. They arrive on the next `frame` through a ref, so a slider is a live modulation, not a remount. Structural changes that invalidate buffers — particle count, grid resolution, state cardinality, de Jong coefficients — are detected by a signature string inside the engine and trigger a local `init`. The UI does not need to know.

### Determinism

- **Mulberry32** is the only genesis PRNG. Same seed, same permutation table, same particle scatter, same chemical inoculum, same automaton field.
- Perlin permutations are Fisher–Yates shuffled from that stream and stored in a 512-entry table for wrap-free indexing.
- `randomParams` walks each parameter’s own step lattice. A randomised patch is always a legal patch.
- `Math.random` appears only as a wrap-around reseeder for flow-field particles that have left the frame — a local, visual concern that must not pollute the seed.

### Colour

Palettes are ordered ramps of five hex stops. `makeColorAt` builds a closure that piecewise-linearly interpolates in sRGB and returns a rounded `[r, g, b]` triple. Engines never parse hex. They ask `colorAt(t)` for \(t \in [0, 1]\) and decide what \(t\) *means* — heading, density, chemical residual, dwell fraction, discrete state, branch depth.

Eight ramps ship: **Aurora**, **Ember**, **Ultraviolet**, **Bone**, **Coral Reef**, **Acid**, **Sakura**, **Glacier**. Each was tuned so the floor reads as a near-black stage and the ceiling reads as a highlight, never as a second background.

### The render loop

- `ResizeObserver` on the stage; canvas backing store is `css × devicePixelRatio`, **capped at 1.75** so a 3× laptop does not silently triple the fragment cost.
- The RAF handle is created with the engine instance and destroyed with it. Play/pause is a ref flip — the loop never stops, it simply declines to call `frame`.
- FPS is a 500 ms sliding window, not a per-frame reciprocal, so the readout is readable.
- Accumulative engines (flow, attractor) fade or add into an uncleared buffer. Stateless engines (Julia, tree) redraw. Grid engines (Gray–Scott, cyclic) step an offscreen `ImageData` and blit.

### What is deliberately absent

No WebGL. No WASM. No worker pool. No framework state machine for the frame. The hot path is typed arrays, integer grid walks, and the 2D context. If a machine cannot hold 90 000 de Jong iterations or a 260-wide Gray–Scott field at interactive rates, the sliders exist so the operator can decide.

---

## Interface

The chassis is a three-pane instrument, not a landing page.

| Region        | Function                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Left rail     | Engine selector. Glyph, name, tagline. Active state is a single accent.  |
| Centre stage  | The canvas. Vignette. Floating transport. Live title of the current engine. |
| Right panel   | Parameter sliders with lattice-accurate readouts. Palette grid. Generate. |
| Header        | Wordmark, FPS, compact seed (base-36).                                   |

**Transport**

| Control     | Behaviour                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| Play / Pause| Freezes integration. The loop keeps sampling FPS so a stall is visible.   |
| Reset       | Rebuilds internal buffers from the current seed and parameters.           |
| Shuffle     | New seed, lattice-walked parameters, 50 % chance of a new palette.        |
| Export PNG  | `chimera-{engineId}-{seed}.png` from the live backing store.              |
| Fullscreen  | Stage element only — the instrument remains, the chrome recedes.          |

Typography is **Fraunces** for names and **IBM Plex Mono** for the instrument face. The accent is `#d9f24e`. The stage is `#070709`. Film grain is a CSS turbulence overlay at 3.5 % opacity, mix-blend screen — atmosphere, not a post-process pass.

---

## Project layout

```
src/
  App.tsx              Transport, layout, RAF ownership, parameter bus
  main.tsx             React 19 mount
  index.css            Design tokens, range thumb, scrollbars
  lib/
    engines.ts         Six EngineDef implementations + param helpers
    noise.ts           Seedable classic Perlin (2D / 3D)
    palettes.ts        Ramps and the colorAt factory
```

`engines.ts` is the score. Read it top to bottom. Each engine is isolated by a section rule and is independently intelligible. Shared utilities are three functions and one PRNG. There is no hidden base class.

---

## Getting started

**Requirements:** Node 20+, a current Chromium, Firefox, or Safari. No backend. No accounts. No GPU requirement beyond what Canvas 2D already asks.

```bash
git clone https://github.com/zazieproductions/CHIMERA-V1-Generative-Synth.git
cd CHIMERA-V1-Generative-Synth
npm install
npm run dev
```

| Script          | Purpose                                      |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Vite dev server, HMR                         |
| `npm run build` | `tsc -b` then production bundle              |
| `npm run preview` | Serve the production build locally         |
| `npm run lint`  | ESLint flat config across the tree           |

Open the printed local URL. Pick an engine. Move a slider. Press **Generate New** when you want the machine to surprise you. Press **Export** when it does.

---

## Extending

A seventh engine is a single `EngineDef` pushed onto `ENGINES`. That is the entire integration surface.

1. Declare `id`, `name`, `glyph`, `tagline`, `description`.
2. Declare `params` with closed intervals and a default that is already beautiful.
3. Implement `create(ctx, w, h)` so that it returns `{ reset, frame }`.
4. Inside `reset`, rebuild every buffer from `state.seed` and `state.params`. Do not keep ghosts.
5. Inside `frame`, read `state.params` and `state.colorAt`. Detect structural invalidation yourself.
6. Use typed arrays. Do not allocate in the inner loop. Do not touch the DOM.

If your algorithm needs noise, `import { Noise } from './noise'` and `reseed` on reset. If it needs colour, ask `colorAt`. If it needs chance, construct Mulberry32 from `state.seed` plus a small odd salt so two streams in the same engine do not couple.

`defaultParams` and `randomParams` will pick up the new schema with no further registration.

---

## Performance notes

These are not afterthoughts. They are why the thing stays at 60.

- Particle and grid state is `Float32Array` / `Uint8Array`. No object-per-cell.
- Gray–Scott and the cyclic automaton render into an offscreen buffer at *simulation* resolution and blit; the display may be 2× larger than the field.
- Julia is the most expensive engine by design. *Detail* and *Iterations* are the two knobs that buy silence back.
- DPR is clamped. A 4K display does not get a 4K backing store unless you asked for it with the window.
- The attractor’s 90 000-point ceiling is a budget, not a dare. Additive 1×1 fills are cheap; raising glow is cheaper than raising density.
- Parameter identity is a string signature, not a deep compare, and is checked once per frame.

If you are studying the code for technique, start with the flow-field inner loop and the Gray–Scott Laplacian. Everything else is a variation on “advance state, look up colour, write pixels.”

---

## Stack

| Layer        | Choice                         | Reason                                              |
| ------------ | ------------------------------ | --------------------------------------------------- |
| Language     | TypeScript 5.9                 | The engine contract is the product                  |
| UI           | React 19                       | One-way parameter bus, refs for the hot path        |
| Bundler      | Vite 7                         | Instant HMR while you tune a coefficient            |
| Style        | Tailwind 4 + a 60-line CSS file| Tokens for the chassis; custom thumbs for the sliders |
| Motion icons | lucide-react                   | Transport glyphs, nothing decorative                |
| Renderer     | Canvas 2D                      | Portable, inspectable, honest about cost            |
| Noise        | In-house Perlin                | Seedable, dependency-free, 80 lines                 |
| PRNG         | Mulberry32                     | 32-bit, reproducible, well-studied                  |

There is no animation library on the canvas. Framer Motion is in the lockfile; the engines do not use it. The picture is the animation.

---

## Design doctrine

A short list of decisions that will not be walked back without a fight.

1. **Determinism is a feature.** If a frame cannot be regenerated from `(engine, params, palette, seed, elapsed)`, something leaked.
2. **Parameters are a lattice.** Sliders, randomisation, and persistence all walk the same step. There is no hidden continuous space.
3. **Colour is a service.** Engines do not own hex. Palettes do not own meaning.
4. **The instance outlives the gesture.** Dragging a slider must not reallocate 6 000 particles.
5. **Defaults must already be worth looking at.** A first-run screenshot is part of the interface.
6. **The chassis is an instrument.** Tracking, mono numerals, a single accent, no marketing chrome on the stage.

---

## Lineage

CHIMERA stands on work that predates the web.

- **Ken Perlin**, *An Image Synthesizer* (SIGGRAPH 1985) and the improved gradient noise of 2002 — the flow field’s spine.
- **Peter de Jong**, the symmetric map whose four coefficients produce the attractor engine.
- **Alan Turing**, *The Chemical Basis of Morphogenesis* (1952); **Pearson / Gray–Scott** for the two-species discretisation used here.
- **Gaston Julia** and the escape-time colouring refinements of the 1980s — including the smooth-iteration \(\nu\) correction.
- **Greenberg & Hastings** (1978) and the broader family of cyclic cellular automata.
- Aristid Lindenmayer’s rewriting systems, in spirit if not in syntax, for the branching engine.

The contribution is not a new equation. It is the decision to treat those equations as **voices on one synthesizer**, with a contract strict enough that they become interchangeable and a UI quiet enough that you can hear them.

---

## License

No license file is attached to this repository yet. Treat the source as visible, not as granted. If you fork it, keep the engine contract intact and credit the lineage above.

---

<sub>CHIMERA V1 — generative synthesizer. Six engines. One seed. The picture is the proof.</sub>
