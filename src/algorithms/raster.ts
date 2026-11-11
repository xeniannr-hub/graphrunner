// Graph aus der Karte: Feldnummern, Nachbarn in fester Reihenfolge, Eingabeprüfung, Schätzung.
import type { FeldId, Grid, Pos } from "../types";

/**
 * Feste Nachbarreihenfolge: oben, rechts, unten, links (nicht einstellbar, FA-19 ist Won't).
 * Sie bestimmt den Verlauf der DFS und entscheidet bei den anderen Verfahren über Gleichstände.
 */
export const RICHTUNGEN: readonly { readonly dx: number; readonly dy: number; readonly name: string }[] = [
  { dx: 0, dy: -1, name: "oben" },
  { dx: 1, dy: 0, name: "rechts" },
  { dx: 0, dy: 1, name: "unten" },
  { dx: -1, dy: 0, name: "links" },
];

export function breiteVon(grid: Grid): number {
  return grid.length > 0 ? grid[0].length : 0;
}

export function zuId(grid: Grid, p: Pos): FeldId {
  return p.y * breiteVon(grid) + p.x;
}

export function zuPos(breite: number, id: FeldId): Pos {
  return { x: id % breite, y: Math.floor(id / breite) };
}

/** Kosten fürs Betreten des Feldes id. */
export function kostenVon(grid: Grid, id: FeldId): number {
  const b = breiteVon(grid);
  return grid[Math.floor(id / b)][id % b];
}

function imRaster(grid: Grid, p: Pos): boolean {
  return Number.isInteger(p.x) && Number.isInteger(p.y) && p.y >= 0 && p.y < grid.length && p.x >= 0 && p.x < breiteVon(grid);
}

/** Begehbare Nachbarn von id in der Reihenfolge von RICHTUNGEN. */
export function nachbarn(grid: Grid, id: FeldId): FeldId[] {
  const b = breiteVon(grid);
  const x = id % b;
  const y = Math.floor(id / b);
  const liste: FeldId[] = [];
  for (const r of RICHTUNGEN) {
    const nx = x + r.dx;
    const ny = y + r.dy;
    if (nx < 0 || ny < 0 || nx >= b || ny >= grid.length) continue;
    if (grid[ny][nx] === Infinity) continue;
    liste.push(ny * b + nx);
  }
  return liste;
}

/** Wirft RangeError mit deutscher Meldung, wenn Karte, Start oder Ziel ungültig sind. */
export function pruefeEingabe(grid: Grid, start: Pos, ziel: Pos): void {
  if (grid.length === 0 || grid[0].length === 0) throw new RangeError("Die Karte ist leer.");
  const b = grid[0].length;
  for (const zeile of grid) {
    if (zeile.length !== b) throw new RangeError("Alle Zeilen der Karte müssen gleich lang sein.");
    for (const k of zeile) {
      if (Number.isNaN(k) || k <= 0) throw new RangeError("Jedes Feld muss positive Kosten haben.");
    }
  }
  if (!imRaster(grid, start)) throw new RangeError("Der Start liegt außerhalb der Karte.");
  if (grid[start.y][start.x] === Infinity) throw new RangeError("Der Start liegt auf einem Hindernis.");
  if (!imRaster(grid, ziel)) throw new RangeError("Das Ziel liegt außerhalb der Karte.");
  if (grid[ziel.y][ziel.x] === Infinity) throw new RangeError("Das Ziel liegt auf einem Hindernis.");
}

/** Kosten des billigsten begehbaren Feldes der Karte. */
function billigstesFeld(grid: Grid): number {
  let min = Infinity;
  for (const zeile of grid) for (const k of zeile) if (k < min) min = k;
  return min;
}

function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * A*-Schätzung: Manhattan-Abstand zum Ziel mal billigstes begehbares Feld.
 * Zulässig, weil jeder Weg mindestens so viele Schritte braucht und jeder Schritt mindestens
 * das Minimum kostet; konsistent, weil ein Schritt den Abstand um genau 1 ändert.
 */
export function schaetzung(grid: Grid, ziel: Pos): (id: FeldId) => number {
  const b = breiteVon(grid);
  const min = billigstesFeld(grid);
  return (id) => manhattan(zuPos(b, id), ziel) * min;
}
