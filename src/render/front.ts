// Suchfront (FA-31): Die wartenden Felder (Warteschlange, Stapel oder Heap) als zusammenhängende Umrisslinie.
// Ohne DOM, damit ein Test prüfen kann, dass die Linie genau die wartenden Felder umschließt.
import type { Replay } from "../replay/replay";
import type { FeldId } from "../types";

/** Ein Stück der Umrisslinie: eine Feldkante von (x1|y1) nach (x2|y2) in Feldkoordinaten (Ecken der Felder). */
export interface FrontKante {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** Das wartende Feld, zu dem diese Kante gehört. */
  readonly feld: FeldId;
}

/** Wartet das Feld in der Datenstruktur? Das ist die Suchfront. */
export function inFront(replay: Replay, v: FeldId): boolean {
  return replay.zustand(v) === "wartet";
}

/**
 * Umriss der Suchfront: Für jedes wartende Feld jede Seite, hinter der kein wartendes Feld liegt (oder der Kartenrand).
 * Innere Seiten zwischen zwei wartenden Feldern fallen weg; so entsteht eine zusammenhängende Linie um jede Gruppe.
 */
export function frontUmriss(replay: Replay): FrontKante[] {
  const e = replay.ergebnis;
  const b = e.breite;
  const h = e.hoehe;
  const wartet = (x: number, y: number) => x >= 0 && y >= 0 && x < b && y < h && inFront(replay, y * b + x);
  const kanten: FrontKante[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      if (!wartet(x, y)) continue;
      const feld = y * b + x;
      if (!wartet(x, y - 1)) kanten.push({ x1: x, y1: y, x2: x + 1, y2: y, feld });
      if (!wartet(x + 1, y)) kanten.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1, feld });
      if (!wartet(x, y + 1)) kanten.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1, feld });
      if (!wartet(x - 1, y)) kanten.push({ x1: x, y1: y, x2: x, y2: y + 1, feld });
    }
  }
  return kanten;
}
