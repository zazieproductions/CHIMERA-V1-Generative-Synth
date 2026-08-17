import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Shuffle,
  Download,
  Sparkles,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import {
  ENGINES,
  defaultParams,
  randomParams,
  type EngineDef,
  type EngineInstance,
  type EngineState,
} from './lib/engines';
import { PALETTES, makeColorAt } from './lib/palettes';

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

export default function App() {
  const [engineId, setEngineId] = useState(ENGINES[0].id);
  const engine = useMemo(
    () => ENGINES.find((e) => e.id === engineId)!,
    [engineId]
  );

  const [allParams, setAllParams] = useState<Record<string, Record<string, number>>>(
    () => {
      const o: Record<string, Record<string, number>> = {};
      for (const e of ENGINES) o[e.id] = defaultParams(e);
      return o;
    }
  );
  const params = allParams[engineId];

  const [paletteId, setPaletteId] = useState(PALETTES[0].id);
  const palette = useMemo(
    () => PALETTES.find((p) => p.id === paletteId)!,
    [paletteId]
  );
  const [playing, setPlaying] = useState(true);
  const [seed, setSeed] = useState(42);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<EngineInstance | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // live state accessible to the RAF loop without re-creating it
  const stateRef = useRef<EngineState>({
    params,
    palette: palette.colors,
    colorAt: makeColorAt(palette.colors),
    seed,
  });
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    stateRef.current = {
      params: allParams[engineId],
      palette: palette.colors,
      colorAt: makeColorAt(palette.colors),
      seed,
    };
  }, [allParams, engineId, palette, seed]);

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    return () => ro.disconnect();
  }, []);

  // (Re)create engine instance & animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dims.w === 0 || dims.h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.floor(dims.w * dpr);
    canvas.height = Math.floor(dims.h * dpr);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const inst = engine.create(ctx, canvas.width, canvas.height);
    instRef.current = inst;
    inst.reset(stateRef.current);

    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = () => {
      if (playingRef.current) {
        inst.frame(stateRef.current);
        frames++;
      }
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineId, dims.w, dims.h]);

  const reset = useCallback(() => {
    instRef.current?.reset(stateRef.current);
  }, []);

  // Reset when palette/seed changes so accumulative engines refresh cleanly
  useEffect(() => {
    instRef.current?.reset(stateRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteId, seed]);

  const setParam = (key: string, value: number) => {
    setAllParams((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], [key]: value },
    }));
  };

  const randomize = () => {
    const newSeed = Math.floor(Math.random() * 1e9);
    const rand = mulberry32(newSeed);
    setAllParams((prev) => ({
      ...prev,
      [engineId]: randomParams(engine, rand),
    }));
    // pick a random palette occasionally too
    if (rand() > 0.5) {
      setPaletteId(PALETTES[Math.floor(rand() * PALETTES.length)].id);
    }
    setSeed(newSeed);
    requestAnimationFrame(() => instRef.current?.reset(stateRef.current));
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `chimera-${engineId}-${seed}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const fullscreen = () => {
    wrapRef.current?.requestFullscreen?.();
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] text-[#e9e9ee] font-mono flex flex-col overflow-hidden">
      <Grain />
      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-white/[0.07] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 grid place-items-center rounded-md bg-[#d9f24e] text-black shadow-[0_0_30px_rgba(217,242,78,0.35)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <h1
              className="text-[22px] tracking-[0.14em] font-semibold"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              CHIMERA
            </h1>
            <p className="text-[10px] tracking-[0.34em] text-[#7b7b85] mt-1 uppercase">
              Generative Synthesizer
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-[#6a6a74]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d9f24e] animate-pulse" />
          {fps} fps
          <span className="text-white/20 mx-1">/</span>
          seed {seed.toString(36).slice(0, 6)}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Left rail: engines */}
        <nav className="lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.07] overflow-x-auto lg:overflow-y-auto">
          <div className="p-3 flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            <p className="hidden lg:block px-2 pt-1 pb-2 text-[10px] tracking-[0.3em] uppercase text-[#5f5f69]">
              Engines
            </p>
            {ENGINES.map((e) => (
              <EngineButton
                key={e.id}
                def={e}
                active={e.id === engineId}
                onClick={() => setEngineId(e.id)}
              />
            ))}
          </div>
        </nav>

        {/* Canvas stage */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div
            ref={wrapRef}
            className="relative flex-1 min-h-[320px] bg-black overflow-hidden"
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            {/* subtle vignette */}
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.55)]" />

            {/* floating transport */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-white/10 bg-black/55 backdrop-blur-md px-1.5 py-1.5 shadow-2xl">
              <TransportBtn
                onClick={() => setPlaying((p) => !p)}
                title={playing ? 'Pause' : 'Play'}
                accent
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </TransportBtn>
              <TransportBtn onClick={reset} title="Reset">
                <RotateCcw className="h-4 w-4" />
              </TransportBtn>
              <TransportBtn onClick={randomize} title="Randomize">
                <Shuffle className="h-4 w-4" />
              </TransportBtn>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <TransportBtn onClick={exportPng} title="Export PNG">
                <Download className="h-4 w-4" />
              </TransportBtn>
              <TransportBtn onClick={fullscreen} title="Fullscreen">
                <Maximize2 className="h-4 w-4" />
              </TransportBtn>
            </div>

            <div className="absolute top-4 left-4 max-w-[62%] pointer-events-none">
              <h2
                className="text-lg sm:text-xl tracking-wide"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                {engine.name}
              </h2>
              <p className="text-[11px] text-[#9a9aa4] mt-0.5">{engine.tagline}</p>
            </div>
          </div>
        </main>

        {/* Right panel: parameters */}
        <aside className="lg:w-[320px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.07] overflow-y-auto">
          <div className="p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#5f5f69] mb-3">
              Parameters
            </p>
            <p className="text-[12px] leading-relaxed text-[#8a8a94] mb-5">
              {engine.description}
            </p>

            <div className="space-y-5">
              {engine.params.map((pr) => (
                <Slider
                  key={pr.key}
                  label={pr.label}
                  min={pr.min}
                  max={pr.max}
                  step={pr.step}
                  value={params[pr.key]}
                  onChange={(v) => setParam(pr.key, v)}
                />
              ))}
            </div>

            <div className="mt-8">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#5f5f69] mb-3">
                Palette
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={`group text-left rounded-lg border p-2 transition ${
                      p.id === paletteId
                        ? 'border-[#d9f24e]/70 bg-white/[0.04]'
                        : 'border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="flex h-5 w-full overflow-hidden rounded">
                      {p.colors.map((c, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span className="mt-1.5 block text-[10px] tracking-wide text-[#9a9aa4]">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={randomize}
              className="mt-8 w-full flex items-center justify-center gap-2 rounded-lg bg-[#d9f24e] text-black font-semibold text-[12px] tracking-[0.15em] uppercase py-3 transition hover:brightness-110 active:scale-[0.99]"
            >
              <Shuffle className="h-4 w-4" strokeWidth={2.4} />
              Generate New
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EngineButton({
  def,
  active,
  onClick,
}: {
  def: EngineDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition min-w-[150px] lg:min-w-0 ${
        active
          ? 'border-[#d9f24e]/60 bg-[#d9f24e]/[0.06]'
          : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-lg transition ${
          active ? 'bg-[#d9f24e] text-black' : 'bg-white/[0.05] text-[#cfcfd6]'
        }`}
      >
        {def.glyph}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-[13px] leading-tight ${active ? 'text-white' : 'text-[#c8c8d0]'}`}
          style={{ fontFamily: 'Fraunces, serif' }}
        >
          {def.name}
        </span>
        <span className="block text-[9px] tracking-wide text-[#6c6c76] truncate">
          {def.tagline}
        </span>
      </span>
      {active && (
        <ChevronRight className="hidden lg:block ml-auto h-4 w-4 text-[#d9f24e]" />
      )}
    </button>
  );
}

function TransportBtn({
  children,
  onClick,
  title,
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-9 w-9 place-items-center rounded-full transition active:scale-90 ${
        accent
          ? 'bg-[#d9f24e] text-black hover:brightness-110'
          : 'text-[#cfcfd6] hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display =
    step < 0.01 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : value.toString();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] tracking-[0.12em] uppercase text-[#8f8f99]">
          {label}
        </label>
        <span className="text-[11px] tabular-nums text-[#d9f24e]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="chimera-range w-full"
        style={{
          background: `linear-gradient(to right, #d9f24e ${pct}%, rgba(255,255,255,0.09) ${pct}%)`,
        }}
      />
    </div>
  );
}

function Grain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-screen"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
