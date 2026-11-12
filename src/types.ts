// Gemeinsame Typen aller Module (CLAUDE.md, Abschnitt 5). Änderungen nur gemeinsam.

export interface Pos {
  readonly x: number;
  readonly y: number;
}

/** Feldnummer: id = y * breite + x. */
export type FeldId = number;

/** grid[y][x] = Kosten fürs Betreten des Feldes, Infinity = unpassierbar. */
export type Grid = readonly (readonly number[])[];

export type TerrainKey = "weg" | "bruecke" | "gras" | "wald" | "sumpf" | "wasser" | "fels";

export interface Terrain {
  readonly key: TerrainKey;
  readonly name: string;
  readonly kosten: number;
}

export type Algo = "bfs" | "dfs" | "dijkstra" | "astar";

interface StepBasis {
  /** Zeilennummer im Pseudocode, ab 1. */
  readonly zeile: number;
}

/** Zählt einen Besuch (Besuchsnummer ab 1). */
interface MitBesuch {
  readonly besuch?: number;
}

/**
 * Genau eine ausgeführte Pseudocode-Zeile, als Variante je Art (discriminated union):
 * Jede Art hat genau die Felder, die sie braucht. u = Feld, das gerade bearbeitet wird;
 * v = Feld, das gerade geprüft, gesetzt oder eingefügt wird; ok = Ergebnis einer Prüfung.
 */
export type Step =
  | (StepBasis & { readonly art: "init" })
  /** d[v] ← d, vorg[v] ← vorg; die alten Werte machen das Zurückspulen exakt. Ohne u: der Start. */
  | (StepBasis & {
      readonly art: "setze";
      readonly u?: FeldId;
      readonly v: FeldId;
      readonly d: number;
      readonly vorg: FeldId;
      readonly altD: number;
      readonly altVorg: FeldId;
    })
  /** Einfügen in Warteschlange, Stapel oder Heap; prio nur beim Heap. Ohne u: der Start. */
  | (StepBasis & MitBesuch & { readonly art: "einfuegen"; readonly u?: FeldId; readonly v: FeldId; readonly prio?: number })
  /** A*: Schätzung h(v) berechnen. Ohne u: der Start. */
  | (StepBasis & { readonly art: "schaetze"; readonly u?: FeldId; readonly v: FeldId; readonly wert: number })
  | (StepBasis & { readonly art: "schleife"; readonly ok: boolean })
  | (StepBasis & MitBesuch & { readonly art: "entnehmen"; readonly u: FeldId; readonly prio?: number })
  | (StepBasis & { readonly art: "oben"; readonly u: FeldId })
  | (StepBasis & { readonly art: "zielpruefung"; readonly u: FeldId; readonly ok: boolean })
  | (StepBasis & { readonly art: "nachbar"; readonly u: FeldId; readonly v: FeldId })
  | (StepBasis & { readonly art: "keinNachbar"; readonly u: FeldId })
  | (StepBasis & { readonly art: "markiertPruefung"; readonly u: FeldId; readonly v: FeldId; readonly ok: boolean })
  | (StepBasis & { readonly art: "veraltetPruefung"; readonly u: FeldId; readonly ok: boolean })
  | (StepBasis & { readonly art: "abschliessen"; readonly u: FeldId; readonly besuch: number })
  /** neu ← d[u] + kosten(v). */
  | (StepBasis & { readonly art: "rechne"; readonly u: FeldId; readonly v: FeldId; readonly wert: number })
  /** neu < d[v]? */
  | (StepBasis & { readonly art: "vergleiche"; readonly u: FeldId; readonly v: FeldId; readonly wert: number; readonly ok: boolean })
  | (StepBasis & { readonly art: "keinWeg" });

export type StepArt = Step["art"];

export interface SearchResult {
  readonly algo: Algo;
  readonly breite: number;
  readonly hoehe: number;
  readonly start: Pos;
  readonly ziel: Pos;
  readonly gefunden: boolean;
  /** Weg vom Start zum Ziel, beide eingeschlossen; [] ohne Weg. */
  readonly weg: readonly Pos[];
  readonly wegIds: readonly FeldId[];
  /** Summe der Kosten aller betretenen Felder (Start zählt nicht); Infinity ohne Weg. */
  readonly kosten: number;
  /** Anzahl der betretenen Felder (Start zählt nicht); Infinity ohne Weg. */
  readonly felder: number;
  /** Anzahl besuchter Felder (Suchaufwand). */
  readonly besucht: number;
  /** Index in `schritte` für jeden Besuch, in Besuchsreihenfolge. */
  readonly besuchsIndizes: readonly number[];
  readonly schritte: readonly Step[];
}
