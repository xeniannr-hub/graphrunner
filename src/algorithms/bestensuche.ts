// Gemeinsamer Kern von Dijkstra und A*: Min-Heap mit lazy deletion, Priorität f = d + h.
// Dijkstra ist A* mit h = 0. Ein Besuch zählt beim Abschließen.
// Bei A* ist das Berechnen von h(v) ein eigener Rechenschritt (Step „schaetze“, eigene Pseudocode-Zeile):
// Die Schätzung kostet Arbeit, und nur so misst „Rechenschritte“ den Preis, den A* für weniger besuchte Felder zahlt.
import type { FeldId, Grid, Pos } from "../types";
import type { SuchLauf } from "./ergebnis";
import { Heap } from "./heap";
import { breiteVon, kostenVon, nachbarn, pruefeEingabe, zuId } from "./raster";

/** h = null: Dijkstra (keine Schätzung, also auch kein Rechenschritt dafür). */
export function* bestensuche(h: ((id: FeldId) => number) | null, grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  pruefeEingabe(grid, start, ziel);
  const n = breiteVon(grid) * grid.length;
  const s = zuId(grid, start);
  const z = zuId(grid, ziel);
  const d = new Array<number>(n).fill(Infinity);
  const vorg = new Array<number>(n).fill(-1);
  const abgeschlossen = new Array<boolean>(n).fill(false);
  // Zeilennummern: A* hat zwei Zeilen mehr (hs ← h(s) nach Zeile 3, hv ← h(v) vor dem Einfügen).
  const Z = (n: number): number => (h === null || n <= 3 ? n : n <= 13 ? n + 1 : n + 2);
  const ende = (gefunden: boolean) => ({ gefunden, vorg, grid, start, ziel });

  yield { zeile: 2, art: "init" };
  d[s] = 0;
  yield { zeile: 3, art: "setze", v: s, d: 0, vorg: -1, altD: Infinity, altVorg: -1 };
  const heap = new Heap<FeldId>();
  let hs = 0;
  if (h !== null) {
    hs = h(s);
    yield { zeile: 4, art: "schaetze", v: s, wert: hs };
  }
  heap.einfuegen(s, hs);
  yield { zeile: Z(4), art: "einfuegen", v: s, prio: hs };
  let besuch = 0;

  for (;;) {
    const nichtLeer = heap.groesse > 0;
    yield { zeile: Z(5), art: "schleife", ok: nichtLeer };
    if (!nichtLeer) break;
    const { wert: u, prio } = heap.entnehmen() as { wert: FeldId; prio: number };
    yield { zeile: Z(6), art: "entnehmen", u, prio };
    // Lazy deletion: alte Einträge bleiben im Heap und werden hier übersprungen.
    const veraltet = abgeschlossen[u];
    yield { zeile: Z(7), art: "veraltetPruefung", u, ok: veraltet };
    if (veraltet) continue;
    abgeschlossen[u] = true;
    yield { zeile: Z(8), art: "abschliessen", u, besuch: ++besuch };
    const istZiel = u === z;
    yield { zeile: Z(9), art: "zielpruefung", u, ok: istZiel };
    if (istZiel) return ende(true);
    for (const v of nachbarn(grid, u)) {
      yield { zeile: Z(10), art: "nachbar", u, v };
      const neu = d[u] + kostenVon(grid, v);
      yield { zeile: Z(11), art: "rechne", u, v, wert: neu };
      const besser = neu < d[v];
      yield { zeile: Z(12), art: "vergleiche", u, v, wert: neu, ok: besser };
      if (!besser) continue;
      yield { zeile: Z(13), art: "setze", u, v, d: neu, vorg: u, altD: d[v], altVorg: vorg[v] };
      d[v] = neu;
      vorg[v] = u;
      let hv = 0;
      if (h !== null) {
        hv = h(v);
        yield { zeile: 15, art: "schaetze", u, v, wert: hv };
      }
      heap.einfuegen(v, neu + hv);
      yield { zeile: Z(14), art: "einfuegen", u, v, prio: neu + hv };
    }
    yield { zeile: Z(10), art: "keinNachbar", u };
  }
  yield { zeile: Z(15), art: "keinWeg" };
  return ende(false);
}
