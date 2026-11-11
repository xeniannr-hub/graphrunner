// Tiefensuche, iterativ mit Stapel: oben ansehen → nächster Nachbar → vorstoßen oder zurückspringen.
// Ein Besuch zählt beim Auflegen.
import type { Grid, Pos } from "../types";
import type { SuchLauf } from "./ergebnis";
import { breiteVon, nachbarn, pruefeEingabe, zuId } from "./raster";

export function* dfs(grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  pruefeEingabe(grid, start, ziel);
  const n = breiteVon(grid) * grid.length;
  const s = zuId(grid, start);
  const z = zuId(grid, ziel);
  const d = new Array<number>(n).fill(Infinity);
  const vorg = new Array<number>(n).fill(-1);
  // Wie viele Nachbarn eines Feldes schon geprüft sind; so macht DFS dort weiter, wo es war.
  const geprueft = new Array<number>(n).fill(0);
  const ende = (gefunden: boolean) => ({ gefunden, vorg, grid, start, ziel });

  yield { zeile: 2, art: "init" };
  d[s] = 0;
  yield { zeile: 3, art: "setze", v: s, d: 0, vorg: -1, altD: Infinity, altVorg: -1 };
  const stapel: number[] = [s];
  let besuch = 0;
  yield { zeile: 4, art: "einfuegen", v: s, besuch: ++besuch };

  for (;;) {
    const nichtLeer = stapel.length > 0;
    yield { zeile: 5, art: "schleife", ok: nichtLeer };
    if (!nichtLeer) break;
    const u = stapel[stapel.length - 1];
    yield { zeile: 6, art: "oben", u };
    const istZiel = u === z;
    yield { zeile: 7, art: "zielpruefung", u, ok: istZiel };
    if (istZiel) return ende(true);
    const nb = nachbarn(grid, u);
    if (geprueft[u] < nb.length) {
      const v = nb[geprueft[u]++];
      yield { zeile: 8, art: "nachbar", u, v };
      const neu = d[v] === Infinity;
      yield { zeile: 9, art: "markiertPruefung", u, v, ok: neu };
      if (!neu) continue;
      yield { zeile: 10, art: "setze", u, v, d: d[u] + 1, vorg: u, altD: d[v], altVorg: vorg[v] };
      d[v] = d[u] + 1;
      vorg[v] = u;
      stapel.push(v);
      yield { zeile: 11, art: "einfuegen", u, v, besuch: ++besuch };
    } else {
      yield { zeile: 8, art: "keinNachbar", u };
      stapel.pop();
      yield { zeile: 12, art: "entnehmen", u };
    }
  }
  yield { zeile: 13, art: "keinWeg" };
  return ende(false);
}
