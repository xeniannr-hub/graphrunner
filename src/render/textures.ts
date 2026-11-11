// Pixelgrafik im Klötzchenstil (eigene Entwürfe, nichts aus anderen Spielen): 16 × 16-Texturen je Gelände
// mit eigener Farbe und eigenem Muster, grobe 2 × 2-Pixel und Blockkanten; dazu Spielfigur, Truhe, Fahne und Logo.
import type { TerrainKey } from "../types";

const KACHEL = 16;

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

/** Rauschen aus groben 2 × 2-Pixeln: Das gibt den kantigen Blocklook. */
function rauschen(g: CanvasRenderingContext2D, r: () => number, farben: readonly string[]): void {
  for (let y = 0; y < KACHEL; y += 2) for (let x = 0; x < KACHEL; x += 2) px(g, x, y, farben[Math.floor(r() * farben.length)], 2, 2);
}

/** Blockkante: heller Rand oben und links, dunkler Rand unten und rechts. */
function kante(g: CanvasRenderingContext2D, hell: number, dunkel: number): void {
  px(g, 0, 0, `rgba(255, 255, 255, ${hell})`, KACHEL, 1);
  px(g, 0, 1, `rgba(255, 255, 255, ${hell})`, 1, KACHEL - 1);
  px(g, 0, KACHEL - 1, `rgba(0, 0, 0, ${dunkel})`, KACHEL, 1);
  px(g, KACHEL - 1, 0, `rgba(0, 0, 0, ${dunkel})`, 1, KACHEL - 1);
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
    rauschen(g, r, ["#5c9a3c", "#66a644", "#559137", "#6fae4a", "#5c9a3c"]);
    for (let k = 0; k < 4; k++) px(g, 2 * Math.floor(r() * 8), 2 * Math.floor(r() * 8), "#86c35a", 2, 2);
    if (v === 3) {
      const x = 4 + 2 * Math.floor(r() * 4);
      const y = 4 + 2 * Math.floor(r() * 4);
      px(g, x, y, "#f2e46b", 2, 2);
    }
    kante(g, 0.12, 0.22);
  },
  // Wald: Laubblock von oben, dunkelgrün mit Lücken und hellen Blättern, in der Mitte ein Stück Stamm.
  wald: (g, r) => {
    rauschen(g, r, ["#1f6b2a", "#257a31", "#1b5f25", "#2c8236"]);
    for (let k = 0; k < 6; k++) px(g, 2 * Math.floor(r() * 8), 2 * Math.floor(r() * 8), "#123d17", 2, 2);
    for (let k = 0; k < 5; k++) px(g, 2 * Math.floor(r() * 8), 2 * Math.floor(r() * 8), "#4f9c45", 2, 2);
    px(g, 6, 6, "#5b3a1f", 4, 4);
    px(g, 7, 7, "#7a5130", 2, 2);
    kante(g, 0.14, 0.4);
  },
  // Sumpf: olivbraun mit dunklen Wasserlachen und Schilf.
  sumpf: (g, r) => {
    rauschen(g, r, ["#5a5a34", "#62623a", "#53532f", "#6a6840"]);
    for (let k = 0; k < 3; k++) {
      const x = 2 * Math.floor(r() * 5);
      const y = 2 * Math.floor(r() * 6);
      px(g, x, y, "#2c3f3a", 6, 4);
      px(g, x + 2, y + 2, "#3b5650", 2, 2);
    }
    for (let k = 0; k < 3; k++) {
      const x = 2 + 2 * Math.floor(r() * 6);
      const y = 6 + 2 * Math.floor(r() * 4);
      px(g, x, y - 4, "#9aa04a", 1, 4);
      px(g, x, y - 5, "#6b4a25", 1, 1);
    }
    kante(g, 0.08, 0.22);
  },
  // Wasser: Blau mit hellen Wellenlinien.
  wasser: (g, r, v) => {
    rauschen(g, r, ["#2d64c4", "#3170d2", "#2a5cb6"]);
    for (let y = 2; y < KACHEL; y += 6) {
      for (let x = 0; x < KACHEL; x += 2) if ((x + v * 4 + y) % 8 < 4) px(g, x, y, "#6aa2ee", 2, 1);
    }
  },
  // Fels: grauer Stein mit heller Oberkante und Schatten an der Unterkante.
  fels: (g, r) => {
    rauschen(g, r, ["#7f7d79", "#8a8884", "#75736f", "#918f8a"]);
    for (let k = 0; k < 4; k++) {
      const x = 2 * Math.floor(r() * 6);
      const y = 2 + 2 * Math.floor(r() * 5);
      px(g, x, y, "#5e5c58", 4, 1);
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

/** Logo: vier Geländeblöcke, darüber ein Weg durch drei Knoten, also eine Karte als Graph. */
function logo(): HTMLCanvasElement {
  const [c, g] = leinwand(16, 16);
  const block = (x: number, y: number, hell: string, mitte: string, dunkel: string) => {
    px(g, x, y, mitte, 8, 8);
    px(g, x, y, hell, 8, 1);
    px(g, x, y, hell, 1, 8);
    px(g, x, y + 7, dunkel, 8, 1);
    px(g, x + 7, y, dunkel, 1, 8);
  };
  block(0, 0, "#8fd16a", "#5c9a3c", "#2f5a1f");
  block(8, 0, "#c9c6c0", "#8a8884", "#4a4845");
  block(0, 8, "#7fb4ff", "#3170d2", "#1d3f80");
  block(8, 8, "#e0d4bb", "#b3a690", "#6e665a");
  // Kanten erst schwarz umrandet, dann weiß; Knoten als Quadrate darüber.
  px(g, 3, 2, "#000", 10, 4);
  px(g, 10, 2, "#000", 4, 12);
  px(g, 4, 3, "#fff", 8, 2);
  px(g, 11, 3, "#fff", 2, 10);
  for (const [x, y, f] of [
    [2, 2, "#ff4d73"],
    [10, 2, "#ffd400"],
    [10, 10, "#ff8a2b"],
  ] as const) {
    px(g, x - 1, y - 1, "#000", 6, 6);
    px(g, x, y, f, 4, 4);
    px(g, x, y, "#fff", 2, 1);
  }
  return c;
}

/** Blockige Spielfigur (eigener Entwurf), Schatztruhe, Startfahne und Logo. */
export function sprites() {
  if (spriteCache) return spriteCache;
  spriteCache = {
    // Läuferin im Klötzchenstil: Helm mit Lampe, eckiger Kopf, grünes Hemd, braune Hose.
    figur: sprite(
      [
        "....HHHHHHHH....",
        "....HHHLLHHH....",
        "....hhhhhhhh....",
        "....kkkkkkkk....",
        "....kAkkkkAk....",
        "....kkkkkkkk....",
        "....kkkmmkkk....",
        "..ssSSSSSSSSss..",
        "..ssSSSSSSSSss..",
        "..ssSSSggSSSss..",
        "..kkSSSSSSSSkk..",
        "....bbbbbbbb....",
        "....ppp..ppp....",
        "....ppp..ppp....",
        "....BBB..BBB....",
        "....BBB..BBB....",
      ],
      { H: "#e8892b", L: "#fff0a0", h: "#a85d18", k: "#e0a878", A: "#1d1611", m: "#9c5a3c", S: "#3f8f5a", s: "#2f6e44", g: "#ffd75e", b: "#2a1d14", p: "#5a4330", B: "#2a2420" },
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
    logo: logo(),
  };
  return spriteCache;
}
