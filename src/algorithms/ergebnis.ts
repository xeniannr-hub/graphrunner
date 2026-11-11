// Generator-Typ der Verfahren und Aufzeichnung eines Laufs als SearchResult.
import type { Algo, FeldId, Grid, Pos, SearchResult, Step } from "../types";
import { breiteVon, kostenVon, zuId, zuPos } from "./raster";

export interface Abschluss {
  readonly gefunden: boolean;
  /** vorg[id] = Vorgänger auf dem Suchbaum, -1 = keiner. */
  readonly vorg: readonly FeldId[];
  readonly grid: Grid;
  readonly start: Pos;
  readonly ziel: Pos;
}

/** Jedes next() führt genau eine Pseudocode-Zeile aus. */
export type SuchLauf = Generator<Step, Abschluss>;

/** Lässt den Generator vollständig laufen und sammelt alle Steps (für Replay und Zurückspulen). */
export function aufzeichnen(algo: Algo, lauf: SuchLauf): SearchResult {
  const schritte: Step[] = [];
  const besuchsIndizes: number[] = [];
  let r = lauf.next();
  while (!r.done) {
    if (r.value.besuch !== undefined) besuchsIndizes.push(schritte.length);
    schritte.push(r.value);
    r = lauf.next();
  }
  const { gefunden, vorg, grid, start, ziel } = r.value;
  const breite = breiteVon(grid);
  const wegIds: FeldId[] = [];
  if (gefunden) {
    for (let id = zuId(grid, ziel); id !== -1; id = vorg[id]) wegIds.push(id);
    wegIds.reverse();
  }
  let kosten = gefunden ? 0 : Infinity;
  for (let i = 1; i < wegIds.length; i++) kosten += kostenVon(grid, wegIds[i]);
  return {
    algo,
    breite,
    hoehe: grid.length,
    start,
    ziel,
    gefunden,
    weg: wegIds.map((id) => zuPos(breite, id)),
    wegIds,
    kosten,
    felder: gefunden ? wegIds.length - 1 : Infinity,
    besucht: besuchsIndizes.length,
    besuchsIndizes,
    schritte,
  };
}
