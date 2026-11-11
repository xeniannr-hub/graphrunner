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

export type StepArt =
  | "init"
  | "setze"
  | "einfuegen"
  | "schleife"
  | "entnehmen"
  | "oben"
  | "zielpruefung"
  | "nachbar"
  | "keinNachbar"
  | "markiertPruefung"
  | "veraltetPruefung"
  | "abschliessen"
  | "rechne"
  | "vergleiche"
  | "keinWeg";

/**
 * Genau eine ausgeführte Pseudocode-Zeile.
 * Felder, die für eine Art keine Bedeutung haben, fehlen.
 */
export interface Step {
  /** Zeilennummer im Pseudocode, ab 1. */
  readonly zeile: number;
  readonly art: StepArt;
  /** Feld, das gerade bearbeitet wird. */
  readonly u?: FeldId;
  /** Feld, das gerade geprüft, gesetzt oder eingefügt wird. */
  readonly v?: FeldId;
  /** Ergebnis einer Prüfung: true = Bedingung erfüllt. */
  readonly ok?: boolean;
  /** setze: neuer Wert und neuer Vorgänger von v. */
  readonly d?: number;
  readonly vorg?: FeldId;
  /** setze: alte Werte, damit das Zurückspulen exakt ist. */
  readonly altD?: number;
  readonly altVorg?: FeldId;
  /** einfuegen/entnehmen im Heap: Priorität des Eintrags. */
  readonly prio?: number;
  /** rechne/vergleiche: neu berechneter Wert. */
  readonly wert?: number;
  /** Besuchsnummer, wenn dieser Step einen Besuch zählt (ab 1). */
  readonly besuch?: number;
}

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
