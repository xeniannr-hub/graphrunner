// Die sieben Geländearten, ihre Kosten und Kartenzeichen (CLAUDE.md, Abschnitt 5).
import type { Grid, Terrain, TerrainKey } from "../types";

export const TERRAIN: readonly Terrain[] = [
  { key: "weg", name: "Weg", kosten: 1 },
  { key: "bruecke", name: "Brücke", kosten: 1 },
  { key: "gras", name: "Wiese", kosten: 2 },
  { key: "wald", name: "Wald", kosten: 4 },
  { key: "sumpf", name: "Sumpf", kosten: 7 },
  { key: "wasser", name: "Wasser", kosten: Infinity },
  { key: "fels", name: "Fels", kosten: Infinity },
];

export const TERRAIN_NACH_KEY: Readonly<Record<TerrainKey, Terrain>> = Object.fromEntries(
  TERRAIN.map((t) => [t.key, t]),
) as Record<TerrainKey, Terrain>;

const ZEICHEN: Readonly<Record<TerrainKey, string>> = {
  weg: "=",
  bruecke: "#",
  gras: ".",
  wald: "T",
  sumpf: "%",
  wasser: "~",
  fels: "^",
};

const KEY_NACH_ZEICHEN: ReadonlyMap<string, TerrainKey> = new Map(
  (Object.entries(ZEICHEN) as [TerrainKey, string][]).map(([k, z]) => [z, k]),
);

export const BREITE = 32;
export const HOEHE = 20;

/** Karte als Gelände je Feld: karte[y][x]. */
export type Karte = TerrainKey[][];

export function begehbar(key: TerrainKey): boolean {
  return TERRAIN_NACH_KEY[key].kosten !== Infinity;
}

/** Liest eine Textkarte (20 Zeilen × 32 Zeichen). Unbekannte Zeichen oder falsche Größe werfen RangeError. */
export function leseKarte(zeilen: readonly string[]): Karte {
  if (zeilen.length !== HOEHE) throw new RangeError(`Eine Karte hat ${HOEHE} Zeilen, nicht ${zeilen.length}.`);
  return zeilen.map((zeile, y) => {
    if (zeile.length !== BREITE) throw new RangeError(`Zeile ${y} hat ${zeile.length} statt ${BREITE} Zeichen.`);
    return [...zeile].map((z, x) => {
      const key = KEY_NACH_ZEICHEN.get(z);
      if (!key) throw new RangeError(`Unbekanntes Zeichen „${z}“ bei (${x}|${y}).`);
      return key;
    });
  });
}

/** Wandelt eine Karte in das Kostenraster für die Algorithmen. */
export function zuGrid(karte: readonly (readonly TerrainKey[])[]): Grid {
  return karte.map((zeile) => zeile.map((k) => TERRAIN_NACH_KEY[k].kosten));
}
