// Pixelgrafik im Klötzchenstil (eigene Entwürfe, nichts aus anderen Spielen): 16 × 16-Texturen je Gelände
// mit eigener Farbe und eigenem Muster; dazu Spielfigur, Schatztruhe und Startfahne.
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

const wahl = <T>(r: () => number, liste: readonly T[]): T => liste[Math.floor(r() * liste.length)];

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
    px(g, 0, 0, "#3f9e2f", KACHEL, KACHEL);
    for (let k = 0; k < 18; k++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), wahl(r, ["#48ab36", "#379127", "#4fb33c"]));
    for (let k = 0; k < 3; k++) {
      const x = 1 + Math.floor(r() * 14);
      const y = 2 + Math.floor(r() * 13);
      px(g, x, y, "#62c64c");
      px(g, x, y - 1, "#62c64c");
    }
    if (v === 3) px(g, 5 + Math.floor(r() * 6), 5 + Math.floor(r() * 6), "#f2e46b", 2, 2);
  },
  // Wald: dichte Baumkronen von oben, dunkelgrün mit runden, hellen Kuppen.
  wald: (g, r) => {
    px(g, 0, 0, "#14501f", KACHEL, KACHEL);
    for (const [mx, my] of [
      [4, 4],
      [12, 5],
      [7, 11],
      [14, 13],
      [0, 12],
    ]) {
      for (let y = -4; y <= 4; y++) {
        for (let x = -4; x <= 4; x++) {
          if (x * x + y * y > 17) continue;
          const f = y < -1 && x < 1 ? "#3a9a3c" : y > 1 || x > 2 ? "#1d6a28" : "#2a8232";
          const qx = mx + x;
          const qy = my + y;
          if (qx >= 0 && qx < KACHEL && qy >= 0 && qy < KACHEL) px(g, qx, qy, r() < 0.12 ? "#4fb04a" : f);
        }
      }
    }
  },
  // Sumpf:  // Sumpf: olivbraun mit dunklen Wasserlachen und Schilf.
  sumpf: (g, r) => {
    px(g, 0, 0, "#4a4a2a", KACHEL, KACHEL);
    for (let k = 0; k < 30; k++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), wahl(r, ["#56562f", "#3f4024", "#5e5d35"]));
    for (let k = 0; k < 3; k++) {
      const x = Math.floor(r() * 11);
      const y = Math.floor(r() * 12);
      px(g, x, y, "#22302e", 5, 3);
      px(g, x + 1, y + 1, "#34504a", 2, 1);
    }
    for (let k = 0; k < 4; k++) {
      const x = 1 + Math.floor(r() * 14);
      const y = 4 + Math.floor(r() * 10);
      px(g, x, y - 3, "#9aa04a", 1, 3);
      px(g, x, y - 4, "#6b4a25");
    }
  },
  // Wasser:  // Wasser: Blau mit hellen Wellenlinien.
  wasser: (g, r, v) => {
    px(g, 0, 0, "#1f6fe0", KACHEL, KACHEL);
    for (let k = 0; k < 14; k++) px(g, Math.floor(r() * 16), Math.floor(r() * 16), wahl(r, ["#2a7cec", "#1a63cf"]));
    for (let y = 3; y < KACHEL; y += 6) {
      for (let x = 0; x < KACHEL; x++) if ((x + v * 3 + y) % 9 < 3) px(g, x, y, "#5da0f5");
    }
  },
  // Fels: grauer Stein mit heller Oberkante und Schatten an der Unterkante.
  fels: (g, r) => {
    // Graue Steinquader in versetzten Reihen.
    px(g, 0, 0, "#555b63", KACHEL, KACHEL);
    for (let reihe = 0; reihe < 3; reihe++) {
      const y = reihe * 5;
      for (let x = reihe % 2 === 0 ? 0 : -4; x < KACHEL; x += 8) {
        px(g, x, y, wahl(r, ["#8d939b", "#848a92", "#979ca3"]), 7, 4);
        px(g, x, y, "#b2b7bd", 7, 1);
      }
    }
    // Schatten an der Unterkante.
    px(g, 0, 14, "#33373d", KACHEL, 2);
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

let spriteCache: { figur: HTMLCanvasElement; truhe: HTMLCanvasElement; fahne: HTMLCanvasElement } | null = null;

/** Blockige Spielfigur (eigener Entwurf), Schatztruhe und Startfahne. */
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
      {
        H: "#e8892b",
        L: "#fff0a0",
        h: "#a85d18",
        k: "#e0a878",
        A: "#1d1611",
        m: "#9c5a3c",
        S: "#3f8f5a",
        s: "#2f6e44",
        g: "#ffd75e",
        b: "#2a1d14",
        p: "#5a4330",
        B: "#2a2420",
      },
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
    fahne: sprite([".prrrrrr", ".prrrrrr", ".prrrr..", ".prr....", ".p......", ".p......", ".p......", "ppp....."], {
      p: "#4a2f17",
      r: "#ff5c5c",
    }),
  };
  return spriteCache;
}
