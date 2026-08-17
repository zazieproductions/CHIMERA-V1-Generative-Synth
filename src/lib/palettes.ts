export interface Palette {
  id: string;
  name: string;
  colors: string[]; // hex stops, low -> high
}

export const PALETTES: Palette[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#05070f', '#0b3d5c', '#12b0a0', '#7ef2a6', '#f8ffd4'] },
  { id: 'ember', name: 'Ember', colors: ['#0a0400', '#4a1002', '#c2410c', '#f59e0b', '#fef3c7'] },
  { id: 'ultraviolet', name: 'Ultraviolet', colors: ['#05010f', '#2a0a5e', '#7c2ce0', '#e04bd9', '#ffd6f5'] },
  { id: 'monochrome', name: 'Bone', colors: ['#050505', '#2b2b2b', '#767676', '#c9c9c9', '#f6f6f6'] },
  { id: 'reef', name: 'Coral Reef', colors: ['#04121a', '#0e5c73', '#2bd4c4', '#ff6b6b', '#ffe66d'] },
  { id: 'acid', name: 'Acid', colors: ['#0b0f00', '#1f3d00', '#7bd400', '#d9f24e', '#ffffff'] },
  { id: 'sakura', name: 'Sakura', colors: ['#160812', '#5c1f4a', '#c74e91', '#ffa1cb', '#fff0f6'] },
  { id: 'ice', name: 'Glacier', colors: ['#02060d', '#0a2a4a', '#2a6fb0', '#8fd0ff', '#eaf8ff'] },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function makeColorAt(colors: string[]): (t: number) => [number, number, number] {
  const stops = colors.map(hexToRgb);
  const n = stops.length;
  return (t: number) => {
    if (t <= 0) return stops[0];
    if (t >= 1) return stops[n - 1];
    const scaled = t * (n - 1);
    const i = Math.floor(scaled);
    const f = scaled - i;
    const a = stops[i];
    const b = stops[Math.min(i + 1, n - 1)];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  };
}

export function rgbCss(c: [number, number, number], alpha = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
