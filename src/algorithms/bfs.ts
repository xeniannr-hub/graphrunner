// Breitensuche mit Warteschlange (FIFO). Ein Besuch zählt beim Entnehmen.
import type { Grid, Pos } from "../types";
import type { SuchLauf } from "./ergebnis";
import { breiteVon, nachbarn, pruefeEingabe, zuId } from "./raster";

export function* bfs(grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  pruefeEingabe(grid, start, ziel);
  const n = breiteVon(grid) * grid.length;
  const s = zuId(grid, start);
  const z = zuId(grid, ziel);
  const d = new Array<number>(n).fill(Infinity);
  const vorg = new Array<number>(n).fill(-1);
  const ende = (gefunden: boolean) => ({ gefunden, vorg, grid, start, ziel });

  yield { zeile: 2, art: "init" };
  d[s] = 0;
  yield { zeile: 3, art: "setze", v: s, d: 0, vorg: -1, altD: Infinity, altVorg: -1 };
  // Warteschlange als Feld mit Lesezeiger: Entnehmen vorne in O(1).
  const q: number[] = [s];
  let kopf = 0;
  yield { zeile: 4, art: "einfuegen", v: s };
  let besuch = 0;

  for (;;) {
    const nichtLeer = kopf < q.length;
    yield { zeile: 5, art: "schleife", ok: nichtLeer };
    if (!nichtLeer) break;
    const u = q[kopf++];
    yield { zeile: 6, art: "entnehmen", u, besuch: ++besuch };
    const istZiel = u === z;
    yield { zeile: 7, art: "zielpruefung", u, ok: istZiel };
    if (istZiel) return ende(true);
    for (const v of nachbarn(grid, u)) {
      yield { zeile: 8, art: "nachbar", u, v };
      const neu = d[v] === Infinity;
      yield { zeile: 9, art: "markiertPruefung", u, v, ok: neu };
      if (!neu) continue;
      yield { zeile: 10, art: "setze", u, v, d: d[u] + 1, vorg: u, altD: d[v], altVorg: vorg[v] };
      d[v] = d[u] + 1;
      vorg[v] = u;
      q.push(v);
      yield { zeile: 11, art: "einfuegen", u, v };
    }
    yield { zeile: 8, art: "keinNachbar", u };
  }
  yield { zeile: 12, art: "keinWeg" };
  return ende(false);
}
