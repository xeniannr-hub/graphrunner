// QA-01: 0 Abweichungen von Bellman-Ford auf 300 Zufallskarten.
import { describe, expect, it } from "vitest";
import type { Grid, Pos } from "../types";
import { ALGOS, SUCHE } from "./index";
import { nachbarn, zuId } from "./raster";

/** Einfacher, reproduzierbarer Zufallsgenerator (LCG), damit die Karten bei jedem Lauf gleich sind. */
function zufall(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

// Mit Kosten 0: Nullgewichtige Kanten müssen Dijkstra und A* korrekt behandeln.
const KOSTEN = [0, 1, 1, 2, 2, 2, 4, 7, Infinity, Infinity];

function zufallsKarte(r: () => number): { grid: Grid; start: Pos; ziel: Pos } {
  const b = 2 + Math.floor(r() * 14);
  const h = 2 + Math.floor(r() * 10);
  const grid = Array.from({ length: h }, () => Array.from({ length: b }, () => KOSTEN[Math.floor(r() * KOSTEN.length)]));
  const feld = (): Pos => ({ x: Math.floor(r() * b), y: Math.floor(r() * h) });
  const start = feld();
  const ziel = feld();
  // Start und Ziel müssen begehbar sein; sonst wäre die Eingabe ungültig.
  grid[start.y][start.x] = 1;
  grid[ziel.y][ziel.x] = 2;
  return { grid, start, ziel };
}

/** Bellman-Ford: unabhängige Vergleichsrechnung über alle gerichteten Kanten. */
function bellmanFord(grid: Grid, start: Pos, gewicht: (v: number) => number): number[] {
  const b = grid[0].length;
  const n = b * grid.length;
  const d = new Array<number>(n).fill(Infinity);
  d[zuId(grid, start)] = 0;
  for (let runde = 0; runde < n - 1; runde++) {
    let geaendert = false;
    for (let u = 0; u < n; u++) {
      if (d[u] === Infinity) continue;
      for (const v of nachbarn(grid, u)) {
        const neu = d[u] + gewicht(v);
        if (neu < d[v]) {
          d[v] = neu;
          geaendert = true;
        }
      }
    }
    if (!geaendert) break;
  }
  return d;
}

describe("QA-01: Vergleich mit Bellman-Ford auf 300 Zufallskarten", () => {
  it("BFS minimale Feldzahl, Dijkstra und A* minimale Kosten, alle gültige Wege", () => {
    const r = zufall(20261111);
    let abweichungen = 0;
    for (let i = 0; i < 300; i++) {
      const { grid, start, ziel } = zufallsKarte(r);
      const b = grid[0].length;
      const z = zuId(grid, ziel);
      const kosten = bellmanFord(grid, start, (v) => grid[Math.floor(v / b)][v % b])[z];
      const felder = bellmanFord(grid, start, () => 1)[z];
      const erg = Object.fromEntries(ALGOS.map((a) => [a, SUCHE[a](grid, start, ziel)]));
      if (erg.bfs.felder !== felder) abweichungen++;
      if (erg.dijkstra.kosten !== kosten) abweichungen++;
      if (erg.astar.kosten !== kosten) abweichungen++;
      for (const a of ALGOS) {
        const e = erg[a];
        if (e.gefunden !== kosten < Infinity) abweichungen++;
        // Jeder gefundene Weg führt über Nachbarn, und seine Kosten stimmen.
        let summe = 0;
        for (let k = 1; k < e.wegIds.length; k++) {
          if (!nachbarn(grid, e.wegIds[k - 1]).includes(e.wegIds[k])) abweichungen++;
          summe += grid[e.weg[k].y][e.weg[k].x];
        }
        if (e.gefunden && summe !== e.kosten) abweichungen++;
      }
    }
    expect(abweichungen).toBe(0);
  });
});
