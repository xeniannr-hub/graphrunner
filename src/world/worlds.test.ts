// Hält die messbaren Bedingungen der Welten fest (CLAUDE.md, Abschnitt 7) und damit die Aussagen
// in `wann` und `warum`. Die Grenzwerte stammen aus der Tabelle in Abschnitt 7.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE, nachbarn } from "../algorithms";
import type { Algo, SearchResult } from "../types";
import { BREITE, HOEHE, leseKarte, zuGrid } from "./terrain";
import { WELTEN, type Welt } from "./worlds";

function welt(id: string): Welt {
  const w = WELTEN.find((x) => x.id === id);
  if (!w) throw new Error(`Welt ${id} fehlt`);
  return w;
}

function laeufe(w: Welt): Record<Algo, SearchResult> {
  const grid = zuGrid(leseKarte(w.karte));
  return Object.fromEntries(ALGOS.map((a) => [a, SUCHE[a](grid, w.start, w.ziel)])) as Record<Algo, SearchResult>;
}

describe("Welten allgemein", () => {
  it("genau fünf Welten, je eine pro Verfahren und die Eigene Welt", () => {
    expect(WELTEN.map((w) => w.algo)).toEqual(["bfs", "dfs", "dijkstra", "astar", null]);
  });

  for (const w of WELTEN) {
    it(`${w.titel}: gültige Textkarte, Start und Ziel begehbar und verschieden`, () => {
      const karte = leseKarte(w.karte);
      expect(karte.length).toBe(HOEHE);
      expect(karte[0].length).toBe(BREITE);
      const grid = zuGrid(karte);
      expect(grid[w.start.y][w.start.x]).toBeLessThan(Infinity);
      expect(grid[w.ziel.y][w.ziel.x]).toBeLessThan(Infinity);
      expect(w.start).not.toEqual(w.ziel);
      if (w.algo) {
        expect(w.wann.length).toBeGreaterThan(0);
        // Zwei bis drei Sätze.
        const saetze = w.warum.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 0).length;
        expect(saetze).toBeGreaterThanOrEqual(2);
        expect(saetze).toBeLessThanOrEqual(3);
        expect(laeufe(w)[w.algo].gefunden).toBe(true);
      }
    });
  }
});

describe("Ruinenhof: BFS ist am besten, wenn jeder Schritt gleich viel kostet", () => {
  const w = welt("ruinenhof");
  const r = laeufe(w);
  it("nur Wiese und Felsmauern", () => {
    expect(new Set(w.karte.join(""))).toEqual(new Set([".", "^"]));
  });
  it("BFS-Kosten = Dijkstra-Kosten", () => {
    expect(r.bfs.kosten).toBe(r.dijkstra.kosten);
  });
  it("A* und Dijkstra besuchen > 85 % der Felder von BFS (sparen kaum)", () => {
    expect(r.astar.besucht).toBeGreaterThan(0.85 * r.bfs.besucht);
    expect(r.dijkstra.besucht).toBeGreaterThan(0.85 * r.bfs.besucht);
  });
  it("DFS besucht > 2 × so viele Felder, Weg > 1,5 × so lang", () => {
    expect(r.dfs.besucht).toBeGreaterThan(2 * r.bfs.besucht);
    expect(r.dfs.felder).toBeGreaterThan(1.5 * r.bfs.felder);
  });
});

describe("Stollen: DFS ist am besten, wenn es nur einen Weg gibt und das Ziel tief liegt", () => {
  const w = welt("stollen");
  const r = laeufe(w);
  it("perfektes Labyrinth: zusammenhängend und ohne Kreis", () => {
    const grid = zuGrid(leseKarte(w.karte));
    let knoten = 0;
    let kanten = 0;
    grid.forEach((zeile, y) =>
      zeile.forEach((k, x) => {
        if (k === Infinity) return;
        knoten++;
        kanten += nachbarn(grid, y * BREITE + x).length;
      }),
    );
    // Ungerichtet gezählt hat ein Baum genau knoten − 1 Kanten.
    expect(kanten / 2).toBe(knoten - 1);
    // Zusammenhängend: Vom Start aus ist jedes begehbare Feld erreichbar.
    const erreicht = new Set([w.start.y * BREITE + w.start.x]);
    const offen = [...erreicht];
    while (offen.length > 0) {
      for (const v of nachbarn(grid, offen.pop() as number)) {
        if (!erreicht.has(v)) {
          erreicht.add(v);
          offen.push(v);
        }
      }
    }
    expect(erreicht.size).toBe(knoten);
  });
  it("alle finden denselben Weg", () => {
    for (const a of ALGOS) expect(r[a].wegIds).toEqual(r.dfs.wegIds);
  });
  it("DFS besucht < 70 % der Felder jedes anderen Verfahrens", () => {
    for (const a of ["bfs", "dijkstra", "astar"] as const) expect(r.dfs.besucht).toBeLessThan(0.7 * r[a].besucht);
  });
});

describe("Flussmoor: Dijkstra ist am besten, wenn Felder verschieden viel kosten und eine Schätzung kaum hilft", () => {
  const w = welt("flussmoor");
  const r = laeufe(w);
  it("A*-Kosten = Dijkstra-Kosten", () => {
    expect(r.astar.kosten).toBe(r.dijkstra.kosten);
  });
  it("A* besucht > 95 % der Felder von Dijkstra", () => {
    expect(r.astar.besucht).toBeGreaterThan(0.95 * r.dijkstra.besucht);
  });
  it("BFS zahlt > 1,5 ×, DFS > 2 ×", () => {
    expect(r.bfs.kosten).toBeGreaterThan(1.5 * r.dijkstra.kosten);
    expect(r.dfs.kosten).toBeGreaterThan(2 * r.dijkstra.kosten);
  });
  it("BFS nimmt die Furt, Dijkstra die Brücke", () => {
    const furt = 9 * BREITE + 16;
    const bruecke = 9 * BREITE + 28;
    expect(r.bfs.wegIds).toContain(furt);
    expect(r.dijkstra.wegIds).toContain(bruecke);
  });
});

describe("Handelsstraße: A* ist am besten, wenn das Ziel weit weg liegt und seine Richtung bekannt ist", () => {
  const w = welt("handelsstrasse");
  const r = laeufe(w);
  it("A*-Kosten = Dijkstra-Kosten", () => {
    expect(r.astar.kosten).toBe(r.dijkstra.kosten);
  });
  it("A* besucht < 25 % der Felder von Dijkstra und am wenigsten von allen", () => {
    expect(r.astar.besucht).toBeLessThan(0.25 * r.dijkstra.besucht);
    for (const a of ["bfs", "dfs", "dijkstra"] as const) expect(r.astar.besucht).toBeLessThan(r[a].besucht);
  });
  it("BFS zahlt > 1,2 × und geht über Wiese und Wald", () => {
    expect(r.bfs.kosten).toBeGreaterThan(1.2 * r.astar.kosten);
    const zeichen = new Set(r.bfs.weg.map((p) => w.karte[p.y][p.x]));
    expect(zeichen.has(".")).toBe(true);
    expect(zeichen.has("T")).toBe(true);
  });
});

describe("Eigene Welt", () => {
  it("startet als leere Wiese", () => {
    expect(new Set(welt("eigene").karte.join(""))).toEqual(new Set(["."]));
  });
});
