// Gemeinsamer Kern von Dijkstra und A*: Min-Heap mit lazy deletion, Priorität f = d + h.
// Dijkstra ist A* mit h = 0. Ein Besuch zählt beim Abschließen.
import type { FeldId, Grid, Pos } from "../types";
import type { SuchLauf } from "./ergebnis";
import { Heap } from "./heap";
import { breiteVon, kostenVon, nachbarn, pruefeEingabe, zuId } from "./raster";

export function* bestensuche(h: (id: FeldId) => number, grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  pruefeEingabe(grid, start, ziel);
  const n = breiteVon(grid) * grid.length;
  const s = zuId(grid, start);
  const z = zuId(grid, ziel);
  const d = new Array<number>(n).fill(Infinity);
  const vorg = new Array<number>(n).fill(-1);
  const abgeschlossen = new Array<boolean>(n).fill(false);
  const ende = (gefunden: boolean) => ({ gefunden, vorg, grid, start, ziel });

  yield { zeile: 2, art: "init" };
  d[s] = 0;
  yield { zeile: 3, art: "setze", v: s, d: 0, vorg: -1, altD: Infinity, altVorg: -1 };
  const heap = new Heap<FeldId>();
  heap.einfuegen(s, h(s));
  yield { zeile: 4, art: "einfuegen", v: s, prio: h(s) };
  let besuch = 0;

  for (;;) {
    const nichtLeer = heap.groesse > 0;
    yield { zeile: 5, art: "schleife", ok: nichtLeer };
    if (!nichtLeer) break;
    const { wert: u, prio } = heap.entnehmen() as { wert: FeldId; prio: number };
    yield { zeile: 6, art: "entnehmen", u, prio };
    // Lazy deletion: alte Einträge bleiben im Heap und werden hier übersprungen.
    const veraltet = abgeschlossen[u];
    yield { zeile: 7, art: "veraltetPruefung", u, ok: veraltet };
    if (veraltet) continue;
    abgeschlossen[u] = true;
    yield { zeile: 8, art: "abschliessen", u, besuch: ++besuch };
    const istZiel = u === z;
    yield { zeile: 9, art: "zielpruefung", u, ok: istZiel };
    if (istZiel) return ende(true);
    for (const v of nachbarn(grid, u)) {
      yield { zeile: 10, art: "nachbar", u, v };
      const neu = d[u] + kostenVon(grid, v);
      yield { zeile: 11, art: "rechne", u, v, wert: neu };
      const besser = neu < d[v];
      yield { zeile: 12, art: "vergleiche", u, v, wert: neu, ok: besser };
      if (!besser) continue;
      yield { zeile: 13, art: "setze", u, v, d: neu, vorg: u, altD: d[v], altVorg: vorg[v] };
      d[v] = neu;
      vorg[v] = u;
      heap.einfuegen(v, neu + h(v));
      yield { zeile: 14, art: "einfuegen", u, v, prio: neu + h(v) };
    }
    yield { zeile: 10, art: "keinNachbar", u };
  }
  yield { zeile: 15, art: "keinWeg" };
  return ende(false);
}
