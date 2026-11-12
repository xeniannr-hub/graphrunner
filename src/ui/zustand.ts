// Zustand der Oberfläche: gewählte Welt, bearbeitbare Karte, Aufzeichnungen und Positionen beider Ansichten.
// Nichts davon wird gespeichert (RB-03).
import { ALGOS, SUCHE, billigstesFeld, schaetzung } from "../algorithms";
import type { Zahlen } from "../render/karte";
import { Replay } from "../replay/replay";
import type { Algo, FeldId, Pos, SearchResult, TerrainKey } from "../types";
import { begehbar, leseKarte, zuGrid, type Karte } from "../world/terrain";
import { WELTEN } from "../world/worlds";

export type Ansicht = "vergleich" | "einzel";
export type Werkzeug = TerrainKey | "start" | "ziel";

export interface Zustand {
  weltIndex: number;
  karte: Karte;
  /** Zählt Änderungen an der Karte (für den Zwischenspeicher der Geländegrafik). */
  version: number;
  start: Pos;
  ziel: Pos;
  ansicht: Ansicht;
  einzelAlgo: Algo;
  zahlen: Zahlen;
  ergebnisse: Record<Algo, SearchResult>;
  /** Replays der Vergleichsansicht; Position = k-ter Besuch. */
  vergleich: Record<Algo, Replay>;
  /** Replays der Einzelansicht; Position = Codezeile. */
  einzel: Record<Algo, Replay>;
  /** Vergleich: Anzahl Schritte, also besuchte Felder je Verfahren. */
  k: number;
  spielt: boolean;
  /** Tempo 1 … 10. */
  tempo: number;
  /** Ausdauer seit „Loslaufen“, null = Rennen nicht gestartet. */
  laufzeit: number | null;
  werkzeug: Werkzeug;
  /** A*-Schätzung der aktuellen Karte: h(v) = Manhattan(v, Ziel) × billigstes Feld. */
  h: (id: FeldId) => number;
  /** Kosten des billigsten begehbaren Feldes (Faktor der Schätzung). */
  billigstes: number;
  /** Kosten der Felder verschieden? Dann ignorieren BFS und DFS etwas Wesentliches. */
  gewichtet: boolean;
  /** Wie viele Felder das billigste Feld stellen; wenige heißt: Sie bestimmen h trotzdem auf der ganzen Karte. */
  billigsteAnzahl: number;
  /** Faktor, den die Schätzung ohne diese billigsten Felder hätte (Infinity, wenn es keine anderen gibt). */
  naechstBilligstes: number;
}

const beobachter: (() => void)[] = [];

/** Wird nach jeder Änderung aufgerufen, damit Ansichten sich neu zeichnen. */
export function beiAenderung(f: () => void): void {
  beobachter.push(f);
}

function melde(): void {
  for (const f of beobachter) f();
}

function rechne(karte: Karte, start: Pos, ziel: Pos): Record<Algo, SearchResult> {
  const grid = zuGrid(karte);
  return Object.fromEntries(ALGOS.map((a) => [a, SUCHE[a](grid, start, ziel)])) as Record<Algo, SearchResult>;
}

function replays(e: Record<Algo, SearchResult>): Record<Algo, Replay> {
  return Object.fromEntries(ALGOS.map((a) => [a, new Replay(e[a])])) as Record<Algo, Replay>;
}

/** Schätzung, billigstes Feld und ob die Karte verschiedene Kosten hat. */
function kennzahlen(karte: Karte, ziel: Pos): Pick<Zustand, "h" | "billigstes" | "gewichtet" | "billigsteAnzahl" | "naechstBilligstes"> {
  const grid = zuGrid(karte);
  const begehbar = grid.flat().filter((k) => k !== Infinity);
  const billigstes = billigstesFeld(grid);
  const teurere = begehbar.filter((k) => k > billigstes);
  return {
    h: schaetzung(grid, ziel),
    billigstes,
    gewichtet: new Set(begehbar).size > 1,
    billigsteAnzahl: begehbar.length - teurere.length,
    naechstBilligstes: teurere.length > 0 ? Math.min(...teurere) : Infinity,
  };
}

const erste = WELTEN[0];
const ersteKarte = leseKarte(erste.karte);
const ersteErgebnisse = rechne(ersteKarte, erste.start, erste.ziel);

export const Z: Zustand = {
  weltIndex: 0,
  karte: ersteKarte,
  version: 0,
  start: erste.start,
  ziel: erste.ziel,
  ansicht: "vergleich",
  einzelAlgo: "bfs",
  zahlen: "reihenfolge",
  ergebnisse: ersteErgebnisse,
  vergleich: replays(ersteErgebnisse),
  einzel: replays(ersteErgebnisse),
  k: 0,
  spielt: false,
  tempo: 5,
  laufzeit: null,
  werkzeug: "wald",
  ...kennzahlen(ersteKarte, erste.ziel),
};

/** Größte Zahl von Besuchen über alle Verfahren: so viele Schritte hat der Vergleich. */
export function vergleichMax(): number {
  return Math.max(...ALGOS.map((a) => Z.ergebnisse[a].besucht));
}

/** Setzt den Vergleich auf k besuchte Felder je Verfahren. */
export function geheVergleich(k: number): void {
  Z.k = Math.max(0, Math.min(vergleichMax(), Math.round(k)));
  for (const a of ALGOS) Z.vergleich[a].gehe(Z.vergleich[a].positionNachBesuch(Z.k));
  // Wer zurückspult, bricht das Rennen ab.
  if (Z.k < vergleichMax()) Z.laufzeit = null;
}

/** Rechnet alle vier Verfahren neu; ansEnde zeigt sofort die Ergebnisse (nach dem Bauen). */
function neuRechnen(ansEnde: boolean): void {
  Z.version++;
  Z.ergebnisse = rechne(Z.karte, Z.start, Z.ziel);
  Object.assign(Z, kennzahlen(Z.karte, Z.ziel));
  Z.vergleich = replays(Z.ergebnisse);
  Z.einzel = replays(Z.ergebnisse);
  Z.laufzeit = null;
  Z.spielt = false;
  geheVergleich(ansEnde ? vergleichMax() : 0);
  if (ansEnde) for (const a of ALGOS) Z.einzel[a].gehe(Z.einzel[a].laenge);
}

export function ladeWelt(i: number): void {
  const w = WELTEN[i];
  Z.weltIndex = i;
  Z.karte = leseKarte(w.karte);
  Z.start = w.start;
  Z.ziel = w.ziel;
  neuRechnen(false);
  melde();
}

export const istEigeneWelt = (): boolean => WELTEN[Z.weltIndex].algo === null;

const gleich = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;

/** Darf das aktuelle Werkzeug auf p angewendet werden? Start und Ziel nur auf begehbare Felder, nie aufeinander. */
export function darfBauen(p: Pos): boolean {
  const w = Z.werkzeug;
  if (w === "start") return begehbar(Z.karte[p.y][p.x]) && !gleich(p, Z.ziel);
  if (w === "ziel") return begehbar(Z.karte[p.y][p.x]) && !gleich(p, Z.start);
  if (!begehbar(w)) return !gleich(p, Z.start) && !gleich(p, Z.ziel);
  return true;
}

/** Eigene Welt: alle Felder werden Wiese, Start und Ziel bleiben, wo sie sind (FA-03). */
export function leereKarte(): void {
  if (!istEigeneWelt()) return;
  Z.karte = Z.karte.map((zeile) => zeile.map((): TerrainKey => "gras"));
  neuRechnen(true);
  melde();
}

/** Wendet das Werkzeug an; alle Verfahren rechnen sofort neu. */
export function baue(p: Pos): void {
  if (!istEigeneWelt() || !darfBauen(p)) return;
  const w = Z.werkzeug;
  if (w === "start") {
    if (gleich(p, Z.start)) return;
    Z.start = p;
  } else if (w === "ziel") {
    if (gleich(p, Z.ziel)) return;
    Z.ziel = p;
  } else {
    if (Z.karte[p.y][p.x] === w) return;
    Z.karte[p.y][p.x] = w;
  }
  neuRechnen(true);
  melde();
}
