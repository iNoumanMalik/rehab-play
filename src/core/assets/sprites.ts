// Parameterised SVG sprite factories. Each returns a self-contained SVG string
// (its own gradient ids) so it can be rasterised independently by AssetSystem.

function toRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map(c => clamp(c).toString(16).padStart(2, '0')).join('')}`;

export function darken(color: string, amt = 0.3): string {
  const [r, g, b] = toRgb(color);
  return hex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}
export function lighten(color: string, amt = 0.3): string {
  const [r, g, b] = toRgb(color);
  return hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

export function butterflySvg(color: string): string {
  const d = darken(color, 0.35);
  const l = lighten(color, 0.4);
  return svg(`
    <defs>
      <radialGradient id="w" cx="45%" cy="40%" r="70%">
        <stop offset="0%" stop-color="${l}"/>
        <stop offset="55%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${d}"/>
      </radialGradient>
    </defs>
    <g stroke="${d}" stroke-width="1.5">
      <path d="M50 50 C 20 20, 6 34, 14 46 C 4 52, 12 64, 30 60 C 44 58, 50 54, 50 50Z" fill="url(#w)"/>
      <path d="M50 50 C 80 20, 94 34, 86 46 C 96 52, 88 64, 70 60 C 56 58, 50 54, 50 50Z" fill="url(#w)"/>
      <path d="M50 50 C 34 62, 28 78, 38 84 C 46 88, 52 74, 50 50Z" fill="url(#w)"/>
      <path d="M50 50 C 66 62, 72 78, 62 84 C 54 88, 48 74, 50 50Z" fill="url(#w)"/>
    </g>
    <circle cx="24" cy="42" r="4" fill="${l}" opacity="0.85"/>
    <circle cx="76" cy="42" r="4" fill="${l}" opacity="0.85"/>
    <rect x="47.5" y="34" width="5" height="36" rx="2.5" fill="${darken(color, 0.6)}"/>
    <circle cx="50" cy="34" r="4.5" fill="${darken(color, 0.55)}"/>
    <path d="M50 32 C 46 22, 42 18, 40 16" stroke="${darken(color, 0.6)}" stroke-width="1.6" fill="none"/>
    <path d="M50 32 C 54 22, 58 18, 60 16" stroke="${darken(color, 0.6)}" stroke-width="1.6" fill="none"/>
    <circle cx="40" cy="15" r="2.2" fill="${darken(color, 0.6)}"/>
    <circle cx="60" cy="15" r="2.2" fill="${darken(color, 0.6)}"/>
  `);
}

export function mothSvg(): string {
  return svg(`
    <defs>
      <radialGradient id="m" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="#a1887f"/>
        <stop offset="100%" stop-color="#4e342e"/>
      </radialGradient>
    </defs>
    <g stroke="#3e2723" stroke-width="1.5">
      <path d="M50 50 C 22 26, 8 40, 18 52 C 8 60, 18 70, 34 62 C 46 58, 50 54, 50 50Z" fill="url(#m)"/>
      <path d="M50 50 C 78 26, 92 40, 82 52 C 92 60, 82 70, 66 62 C 54 58, 50 54, 50 50Z" fill="url(#m)"/>
    </g>
    <ellipse cx="50" cy="52" rx="5" ry="17" fill="#3e2723"/>
    <path d="M50 36 C 45 26, 40 24, 36 22" stroke="#3e2723" stroke-width="2" fill="none" stroke-dasharray="1.5 2"/>
    <path d="M50 36 C 55 26, 60 24, 64 22" stroke="#3e2723" stroke-width="2" fill="none" stroke-dasharray="1.5 2"/>
    <circle cx="45" cy="40" r="2.4" fill="#ffab91"/>
    <circle cx="55" cy="40" r="2.4" fill="#ffab91"/>
  `);
}

const FRUIT: Record<string, string> = {
  apple: svg(`
    <defs><radialGradient id="a" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#ff8a80"/><stop offset="55%" stop-color="#f4433a"/><stop offset="100%" stop-color="#b71c1c"/></radialGradient></defs>
    <path d="M50 30 C 40 24, 24 28, 24 48 C 24 70, 40 84, 50 84 C 60 84, 76 70, 76 48 C 76 28, 60 24, 50 30Z" fill="url(#a)"/>
    <rect x="48" y="18" width="4" height="14" rx="2" fill="#6d4c41"/>
    <path d="M52 24 C 62 18, 70 22, 70 30 C 60 32, 54 30, 52 24Z" fill="#66bb6a"/>
    <ellipse cx="40" cy="42" rx="7" ry="10" fill="#fff" opacity="0.35"/>`),
  orange: svg(`
    <defs><radialGradient id="o" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#ffd180"/><stop offset="55%" stop-color="#ff9800"/><stop offset="100%" stop-color="#e65100"/></radialGradient></defs>
    <circle cx="50" cy="54" r="30" fill="url(#o)"/>
    <g fill="#e65100" opacity="0.4"><circle cx="42" cy="48" r="1.6"/><circle cx="58" cy="46" r="1.6"/><circle cx="52" cy="62" r="1.6"/><circle cx="40" cy="60" r="1.6"/><circle cx="62" cy="58" r="1.6"/></g>
    <path d="M50 24 C 44 20, 40 22, 40 26 C 46 28, 50 26, 50 24Z" fill="#66bb6a"/>
    <ellipse cx="42" cy="46" rx="6" ry="8" fill="#fff" opacity="0.35"/>`),
  banana: svg(`
    <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff59d"/><stop offset="60%" stop-color="#ffd600"/><stop offset="100%" stop-color="#f9a825"/></linearGradient></defs>
    <path d="M28 24 C 24 52, 40 78, 74 74 C 80 73, 80 66, 74 67 C 46 70, 34 50, 38 26 C 39 20, 30 19, 28 24Z" fill="url(#b)" stroke="#f9a825" stroke-width="1.2"/>
    <path d="M72 74 l6 -2 -3 6Z" fill="#5d4037"/>
    <path d="M30 24 l-2 -5 5 2Z" fill="#5d4037"/>`),
  grape: svg(`
    <defs><radialGradient id="g" cx="40%" cy="35%" r="70%"><stop offset="0%" stop-color="#ce93d8"/><stop offset="100%" stop-color="#6a1b9a"/></radialGradient></defs>
    <path d="M50 22 C 46 18, 54 18, 52 24" stroke="#8d6e63" stroke-width="2.5" fill="none"/>
    <path d="M56 22 C 66 20, 72 26, 66 32 C 60 30, 56 26, 56 22Z" fill="#66bb6a"/>
    <g fill="url(#g)" stroke="#4a148c" stroke-width="0.8">
      <circle cx="42" cy="36" r="8"/><circle cx="58" cy="36" r="8"/>
      <circle cx="34" cy="50" r="8"/><circle cx="50" cy="50" r="8"/><circle cx="66" cy="50" r="8"/>
      <circle cx="42" cy="64" r="8"/><circle cx="58" cy="64" r="8"/>
      <circle cx="50" cy="76" r="8"/></g>`),
  strawberry: svg(`
    <defs><radialGradient id="s" cx="42%" cy="30%" r="75%"><stop offset="0%" stop-color="#ff8a95"/><stop offset="55%" stop-color="#e91e63"/><stop offset="100%" stop-color="#ad1457"/></radialGradient></defs>
    <path d="M28 38 C 34 32, 66 32, 72 38 C 72 60, 58 84, 50 84 C 42 84, 28 60, 28 38Z" fill="url(#s)"/>
    <g fill="#fff59d"><circle cx="40" cy="46" r="1.6"/><circle cx="52" cy="44" r="1.6"/><circle cx="62" cy="48" r="1.6"/><circle cx="46" cy="56" r="1.6"/><circle cx="58" cy="58" r="1.6"/><circle cx="50" cy="68" r="1.6"/></g>
    <path d="M34 36 C 40 28, 44 30, 50 34 C 56 30, 60 28, 66 36 C 58 40, 42 40, 34 36Z" fill="#4caf50"/>`),
};
export function fruitSvg(type: string): string {
  return FRUIT[type] ?? FRUIT.apple;
}

export function crystalSvg(color: string): string {
  const d = darken(color, 0.4);
  const l = lighten(color, 0.5);
  return svg(`
    <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${l}"/><stop offset="100%" stop-color="${d}"/></linearGradient></defs>
    <g stroke="${l}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M50 8 L74 40 L50 92 L26 40Z" fill="url(#c)"/>
      <path d="M50 8 L50 92 L26 40Z" fill="${color}" opacity="0.55"/>
      <path d="M50 8 L74 40 L50 52Z" fill="${l}" opacity="0.6"/>
    </g>
    <path d="M40 30 L46 20" stroke="#fff" stroke-width="2" opacity="0.7" stroke-linecap="round"/>`);
}

export function enemySvg(color: string): string {
  const d = darken(color, 0.5);
  return svg(`
    <defs><radialGradient id="e" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="${lighten(color, 0.2)}"/><stop offset="100%" stop-color="${d}"/></radialGradient></defs>
    <path d="M50 14 C 26 14, 18 38, 20 60 C 22 76, 30 84, 30 74 C 32 84, 40 84, 42 76 C 44 86, 56 86, 58 76 C 60 84, 68 84, 70 74 C 70 84, 78 76, 80 60 C 82 38, 74 14, 50 14Z" fill="url(#e)"/>
    <circle cx="40" cy="44" r="6" fill="#fff"/><circle cx="60" cy="44" r="6" fill="#fff"/>
    <circle cx="41" cy="45" r="2.6" fill="#111"/><circle cx="61" cy="45" r="2.6" fill="#111"/>`);
}

// Keep in sync with the palettes used by the scenes so preloaded keys match.
export const BUTTERFLY_PALETTE = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740', '#FF8A65'];
export const ENEMY_PALETTE = ['#EF5350', '#AB47BC', '#EC407A', '#FF7043'];

/** Static sprite set to preload at startup so there's no pop-in on first play. */
export function spriteManifest(): Array<[string, () => string]> {
  const m: Array<[string, () => string]> = [['moth', mothSvg]];
  BUTTERFLY_PALETTE.forEach(c => m.push([`butterfly:${c}`, () => butterflySvg(c)]));
  (['apple', 'orange', 'banana', 'grape', 'strawberry'] as const).forEach(t => m.push([`fruit:${t}`, () => fruitSvg(t)]));
  ENEMY_PALETTE.forEach(c => m.push([`enemy:${c}`, () => enemySvg(c)]));
  return m;
}

export function bossSvg(color: string): string {
  const d = darken(color, 0.55);
  return svg(`
    <defs><radialGradient id="B" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="${lighten(color, 0.25)}"/><stop offset="100%" stop-color="${d}"/></radialGradient></defs>
    <path d="M30 12 L22 2 L38 12 M70 12 L78 2 L62 12" stroke="${d}" stroke-width="4" fill="none"/>
    <path d="M50 10 C 22 10, 12 36, 16 62 C 18 80, 30 88, 30 76 C 33 88, 42 88, 44 78 C 46 90, 54 90, 56 78 C 58 88, 67 88, 70 76 C 70 88, 82 80, 84 62 C 88 36, 78 10, 50 10Z" fill="url(#B)"/>
    <circle cx="38" cy="46" r="7" fill="#ff5252"/><circle cx="62" cy="46" r="7" fill="#ff5252"/>
    <circle cx="38" cy="46" r="3" fill="#fff"/><circle cx="62" cy="46" r="3" fill="#fff"/>
    <path d="M40 64 Q50 72 60 64" stroke="#fff" stroke-width="2.5" fill="none"/>`);
}
