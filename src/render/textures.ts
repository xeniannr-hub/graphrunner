// Pixelgrafik (eigene Entwürfe): 16 × 16-Texturen je Gelände mit eigener Farbe und eigenem Muster,
// dazu Spielfigur, Schatztruhe, Startfahne und Logo.
import type { TerrainKey } from "../types";

export const KACHEL = 16;

/** Reproduzierbarer Zufall, damit jede Textur bei jedem Laden gleich aussieht. */
function zufall(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function leinwand(b: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

type Maler = (g: CanvasRenderingContext2D, r: () => number, variante: number) => void;

const px = (g: CanvasRenderingContext2D, x: number, y: number, farbe: string, b = 1, h = 1) => {
  g.fillStyle = farbe;
  g.fillRect(x, y, b, h);
};

function rauschen(g: CanvasRenderingContext2D, r: () => number, farben: readonly string[]): void {
  for (let y = 0; y < KACHEL; y++) for (let x = 0; x < KACHEL; x++) px(g, x, y, farben[Math.floor(r() * farben.length)]);
}

const MALER: Readonly<Record<TerrainKey, Maler>> = {
  // Weg: graubeige Pflastersteine in versetzten Reihen.
  weg: (g, r) => {
    px(g, 0, 0, "#6e665a", KACHEL, KACHEL);
    const steine = ["#b3a690", "#a89a83", "#bdb19c", "#9f927c"];
    for (let reihe = 0; reihe < 4; reihe++) {
      let x = reihe % 2 === 0 ? 0 : -2;
      while (x < KACHEL) {
        const b = 4 + Math.floor(r() * 2);
        px(g, x, reihe * 4, steine[Math.floor(r() * steine.length)], b - 1, 3);
        px(g, x, reihe * 4, "#cfc4ae", b - 1, 1);
        x += b;
      }
    }
  },
  // Brücke: waagrechte Holzbohlen mit Fugen, dunkle Geländer an den Seiten.
  bruecke: (g, _r, v) => {
    const holz = ["#a0703c", "#94673a", "#ab7a44"];
    for (let y = 0; y < KACHEL; y += 4) {
      px(g, 0, y, holz[(y / 4 + v) % 3], KACHEL, 3);
      px(g, 0, y + 3, "#4f3418", KACHEL, 1);
      px(g, 3 + ((y + v) % 7), y + 1, "#7d5429");
    }
    px(g, 0, 0, "#5a3a1c", 2, KACHEL);
    px(g, 14, 0, "#5a3a1c", 2, KACHEL);
  },
  // Wiese: hellgrünes Rauschen mit einzelnen Halmen, selten eine Blume.
  gras: (g, r, v) => {
    rauschen(g, r, ["#5c9a3c", "#66a644", "#559137", "#6fae4a"]);
    for (let k = 0; k < 6; k++) {
      const x = Math.floor(r() * 15);
      const y = 1 + Math.floor(r() * 14);
      px(g, x, y, "#86c35a");
      px(g, x, y - 1, "#86c35a");
    }
    if (v === 3) px(g, 5 + Math.floor(r() * 6), 5 + Math.floor(r() * 6), "#f2e46b");
  },
  // Wald: dunkle Baumkrone als runder Fleck mit Lichtpunkten und Stamm.
  wald: (g, r) => {
    rauschen(g, r, ["#2e5a28", "#2a5325", "#33622c"]);
    const krone = ["#1f6b2a", "#257a31", "#1b5f25"];
    for (let y = 1; y < 12; y++) {
      for (let x = 1; x < 15; x++) {
        if ((x - 7.5) ** 2 / 42 + (y - 6) ** 2 / 28 < 1) px(g, x, y, krone[Math.floor(r() * krone.length)]);
      }
    }
    for (let k = 0; k < 7; k++) px(g, 3 + Math.floor(r() * 10), 2 + Math.floor(r() * 6), "#4f9c45");
    px(g, 7, 11, "#5b3a1f", 2, 4);
    px(g, 3, 14, "#173d16", 10, 1);
  },
  // Sumpf: olivbraun mit dunklen Wasserlachen und Schilf.
  sumpf: (g, r) => {
    rauschen(g, r, ["#5a5a34", "#62623a", "#53532f", "#6a6840"]);
    for (let k = 0; k < 3; k++) {
      const x = Math.floor(r() * 11);
      const y = Math.floor(r() * 12);
      px(g, x, y, "#2c3f3a", 5, 3);
      px(g, x + 1, y + 1, "#3b5650", 2, 1);
    }
    for (let k = 0; k < 4; k++) {
      const x = 1 + Math.floor(r() * 14);
      const y = 4 + Math.floor(r() * 10);
      px(g, x, y - 3, "#9aa04a", 1, 3);
      px(g, x, y - 4, "#6b4a25");
    }
  },
  // Wasser: Blau mit hellen Wellenlinien.
  wasser: (g, r, v) => {
    rauschen(g, r, ["#2d64c4", "#3170d2", "#2a5cb6"]);
    for (let y = 2; y < KACHEL; y += 5) {
      for (let x = 0; x < KACHEL; x++) if ((x + v * 3 + y) % 8 < 3) px(g, x, y + ((x >> 1) % 2), "#6aa2ee");
    }
  },
  // Fels: grauer Stein mit heller Oberkante und Schatten an der Unterkante.
  fels: (g, r) => {
    rauschen(g, r, ["#7f7d79", "#8a8884", "#75736f", "#918f8a"]);
    for (let k = 0; k < 5; k++) {
      const x = Math.floor(r() * 13);
      const y = 2 + Math.floor(r() * 9);
      px(g, x, y, "#5e5c58", 3, 1);
    }
    px(g, 0, 0, "#b4b2ad", KACHEL, 1);
    px(g, 0, 0, "#a5a39e", 1, 13);
    px(g, 0, 13, "#4a4845", KACHEL, 1);
    px(g, 0, 14, "#36342f", KACHEL, 2);
  },
};

const cache = new Map<string, HTMLCanvasElement>();

/** Textur eines Geländes; variante 0 … 3 sorgt für Abwechslung zwischen Nachbarfeldern. */
export function textur(key: TerrainKey, variante: number): HTMLCanvasElement {
  const id = `${key}:${variante}`;
  const vorhanden = cache.get(id);
  if (vorhanden) return vorhanden;
  const [c, g] = leinwand(KACHEL, KACHEL);
  let seed = 7;
  for (const ch of id) seed = Math.imul(seed, 31) + ch.charCodeAt(0);
  MALER[key](g, zufall(seed), variante);
  cache.set(id, c);
  return c;
}

/** Zeichnet ein Sprite aus Textzeilen; jedes Zeichen ist ein Pixel, „.“ ist durchsichtig. */
function sprite(zeilen: readonly string[], farben: Readonly<Record<string, string>>): HTMLCanvasElement {
  const [c, g] = leinwand(zeilen[0].length, zeilen.length);
  zeilen.forEach((zeile, y) =>
    [...zeile].forEach((z, x) => {
      const f = farben[z];
      if (f) px(g, x, y, f);
    }),
  );
  return c;
}

let spriteCache: { figur: HTMLCanvasElement; truhe: HTMLCanvasElement; fahne: HTMLCanvasElement; logo: HTMLCanvasElement } | null = null;

/** Spielfigur (Wanderin mit Hut und Rucksack), Schatztruhe, Startfahne und Logo (Kieselstein). */
export function sprites() {
  if (spriteCache) return spriteCache;
  spriteCache = {
    figur: sprite(
      [
        "....hhhhhh....",
        "...hhhhhhhh...",
        ".HHHHHHHHHHHH.",
        "....kkkkkk....",
        "....kAkkAk....",
        "....kkkkkk....",
        "..rrbbbbbbrr..",
        "..rrbbbbbbrr..",
        "..rrbbggbbrr..",
        "...kbbbbbbk...",
        "....bbbbbb....",
        "....ss..ss....",
        "....ss..ss....",
        "...SSS..SSS...",
      ],
      { h: "#2f6f8f", H: "#1f4f66", k: "#f1c7a0", A: "#2a1d14", b: "#d24a3a", g: "#ffd75e", r: "#6b4a2a", s: "#3a3f5c", S: "#231d17" },
    ),
    truhe: sprite(
      [
        "..............",
        ".dddddddddddd.",
        "dwwwwwwwwwwwwd",
        "dwWwwwwwwwwWwd",
        "dwwwwwwwwwwwwd",
        "ddddddggdddddd",
        "dwwwwwgGgwwwwd",
        "dwWwwwwggwwWwd",
        "dwwwwwwwwwwwwd",
        "dwwwwwwwwwwwwd",
        "dddddddddddddd",
      ],
      { d: "#3b2512", w: "#a8692f", W: "#d9a441", g: "#f2c84b", G: "#fff4b8" },
    ),
    fahne: sprite(
      [".prrrrrr", ".prrrrrr", ".prrrr..", ".prr....", ".p......", ".p......", ".p......", "ppp....."],
      { p: "#4a2f17", r: "#ff5c5c" },
    ),
    logo: sprite(
      [
        "................",
        "......llll......",
        "....lLLLLLll....",
        "...lLLLggggll...",
        "..lLLgggggggdl..",
        "..lLgggggggggd..",
        ".lLggggggggggd..",
        ".lggggggggggggd.",
        ".lgggggggggggdd.",
        ".dggggggggggddd.",
        "..dggggggggddd..",
        "..ddggggggddd...",
        "...dddddddd.....",
        "................",
      ],
      { l: "#e7e2d6", L: "#ffffff", g: "#b9b2a3", d: "#7d776b" },
    ),
  };
  return spriteCache;
}
