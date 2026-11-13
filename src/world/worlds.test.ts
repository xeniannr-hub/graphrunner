// Hält die messbaren Bedingungen der Welten fest (CLAUDE.md, Abschnitt 7) und damit die Aussagen
// in `wann` und `warum`. Die Grenzwerte stammen aus der Tabelle in Abschnitt 7.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE, nachbarn, schaetzung } from "../algorithms";
import type { Algo, SearchResult } from "../types";
import { BREITE, HOEHE, leseKarte, zuGrid } from "./terrain";
import { WELTEN, kurzfassung, type Welt } from "./worlds";

function welt(id: string): Welt {
  const w = WELTEN.find((x) => x.id === id);
  if (!w) throw new Error(`Welt ${id} fehlt`);
  return w;
}

/**
 * DFS mit frei wählbarer Nachbarreihenfolge, nur für die Tests der Modellannahme (die App nutzt fest
 * oben, rechts, unten, links; FA-19 ist Won't). Zählt Besuche wie dfs.ts beim Auflegen.
 */
function dfsBesuche(w: Welt, reihenfolge: readonly string[]): number {
  return dfsLauf(w, reihenfolge).besucht;
}

/** Wie dfsBesuche, zusätzlich mit der Länge des gefundenen Weges in Kanten (Stapelhöhe − 1 am Ziel). */
function dfsLauf(w: Welt, reihenfolge: readonly string[]): { besucht: number; weg: number } {
  const grid = zuGrid(leseKarte(w.karte));
  const schritt: Record<string, [number, number]> = { o: [0, -1], r: [1, 0], u: [0, 1], l: [-1, 0] };
  const nb = (id: number): number[] =>
    reihenfolge
      .map((k) => [(id % BREITE) + schritt[k][0], Math.floor(id / BREITE) + schritt[k][1]])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < BREITE && y < HOEHE && grid[y][x] !== Infinity)
      .map(([x, y]) => y * BREITE + x);
  const s = w.start.y * BREITE + w.start.x;
  const z = w.ziel.y * BREITE + w.ziel.x;
  const entdeckt = new Set([s]);
  const geprueft = new Map<number, number>();
  const stapel = [s];
  while (stapel.length > 0) {
    const u = stapel[stapel.length - 1];
    if (u === z) return { besucht: entdeckt.size, weg: stapel.length - 1 };
    const n = nb(u);
    const i = geprueft.get(u) ?? 0;
    if (i < n.length) {
      geprueft.set(u, i + 1);
      if (!entdeckt.has(n[i])) {
        entdeckt.add(n[i]);
        stapel.push(n[i]);
      }
    } else stapel.pop();
  }
  return { besucht: entdeckt.size, weg: Infinity };
}

function alleReihenfolgen(a: readonly string[]): string[][] {
  return a.length <= 1 ? [[...a]] : a.flatMap((x, i) => alleReihenfolgen([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
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
  const grid = zuGrid(leseKarte(w.karte));
  const begehbar = grid.flat().filter((k) => k !== Infinity).length;
  it("nur Wiese und Mauerreste (Fels)", () => {
    expect(new Set(w.karte.join(""))).toEqual(new Set([".", "^"]));
  });
  it("offener Hof: Start und Ziel in gegenüberliegenden Ecken, BFS sucht mehr als 60 % der begehbaren Felder ab", () => {
    expect([w.start, w.ziel]).toEqual([
      { x: BREITE - 1, y: 0 },
      { x: 0, y: HOEHE - 1 },
    ]);
    expect(r.bfs.besucht).toBeGreaterThan(0.6 * begehbar);
  });
  it("BFS-Kosten = Dijkstra-Kosten = A*-Kosten (kürzester Weg ist zugleich der günstigste)", () => {
    expect(r.bfs.kosten).toBe(r.dijkstra.kosten);
    expect(r.astar.kosten).toBe(r.dijkstra.kosten);
  });
  it("A* und Dijkstra besuchen > 85 % der Felder von BFS (die Schätzung schließt kaum etwas aus)", () => {
    expect(r.astar.besucht).toBeGreaterThan(0.85 * r.bfs.besucht);
    expect(r.dijkstra.besucht).toBeGreaterThan(0.85 * r.bfs.besucht);
  });
  it("BFS braucht von allen Verfahren mit optimalem Weg die wenigsten Rechenschritte", () => {
    expect(r.bfs.schritte.length).toBeLessThan(r.dijkstra.schritte.length);
    expect(r.bfs.schritte.length).toBeLessThan(r.astar.schritte.length);
  });
  it("DFS findet mit der festen Reihenfolge einen Weg von 456 statt 50 Kanten (> 3 × so lang)", () => {
    expect(r.dfs.felder).toBeGreaterThan(3 * r.bfs.felder);
    expect([r.dfs.felder, r.bfs.felder]).toEqual([456, 50]); // TODO: von Hand nachrechnen
  });
  it("Lernpunkt: Mit 8 der 24 Reihenfolgen liefe DFS direkt zum Ziel, z. B. unten, links, oben, rechts", () => {
    expect(dfsLauf(w, ["o", "r", "u", "l"])).toEqual({ besucht: r.dfs.besucht, weg: r.dfs.felder });
    const direkt = alleReihenfolgen(["o", "r", "u", "l"]).filter((o) => dfsLauf(w, o).weg === r.bfs.felder);
    expect(direkt.length).toBe(8); // TODO: von Hand nachrechnen
    expect(dfsLauf(w, ["u", "l", "o", "r"]).weg).toBe(r.bfs.felder);
  });
});

describe("Stollen: DFS ist am besten, wenn es nur einen Weg gibt und DFS mit seiner Nachbarreihenfolge Glück hat", () => {
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
  it("Modellannahme: Der Vorteil hängt an der Nachbarreihenfolge (DFS hat hier Glück)", () => {
    // Nachbau gleich der App bei oben, rechts, unten, links.
    expect(dfsBesuche(w, ["o", "r", "u", "l"])).toBe(r.dfs.besucht);
    const min = Math.min(r.bfs.besucht, r.dijkstra.besucht, r.astar.besucht);
    const alle = alleReihenfolgen(["o", "r", "u", "l"]);
    const erfuellt = alle.filter((o) => dfsBesuche(w, o) < 0.7 * min);
    // Nur die Hälfte der 24 Reihenfolgen erfüllt die Bedingung (Messung, im Bericht genannt).
    expect(erfuellt.length).toBe(12); // TODO: von Hand nachrechnen
    // „mit rechts vorne über 240 statt 61“, wie im Text der Welt.
    for (const o of alle.filter((x) => x[0] === "r")) expect(dfsBesuche(w, o)).toBeGreaterThan(240);
    expect(r.dfs.besucht).toBe(61); // TODO: von Hand nachrechnen
  });
});

describe("Flussmoor: Dijkstra ist am besten, wenn Felder verschieden viel kosten und keine Schätzung wirklich hilft", () => {
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
  it("Dijkstra braucht weniger Rechenschritte als A* (A* rechnet für jedes eingefügte Feld h aus)", () => {
    expect(r.dijkstra.schritte.length).toBeLessThan(r.astar.schritte.length);
  });
  it("Text: A* praktisch gleichauf (226 statt 230 besuchte Felder), BFS zahlt fast das Dreifache", () => {
    expect([r.astar.besucht, r.dijkstra.besucht]).toEqual([226, 230]); // TODO: von Hand nachrechnen
    // BFS 172 Ausdauer, Dijkstra 64: 172 / 64 ≈ 2,7, also „fast das Dreifache“ (zwischen 2,5- und 3-fach).
    expect(r.bfs.kosten / r.dijkstra.kosten).toBeGreaterThan(2.5);
    expect(r.bfs.kosten / r.dijkstra.kosten).toBeLessThan(3);
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
  it("A* braucht trotz Schätzung weniger als ein Viertel der Rechenschritte von Dijkstra", () => {
    expect(r.astar.schritte.length).toBeLessThan(0.25 * r.dijkstra.schritte.length);
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
  it("Lernpunkt: Ein einziges Weg-Feld fern vom Weg halbiert h überall, A* besucht dann mehr Felder", () => {
    const w = welt("eigene");
    const karte = leseKarte(w.karte);
    const vorher = SUCHE.astar(zuGrid(karte), w.start, w.ziel);
    karte[0][0] = "weg";
    const grid = zuGrid(karte);
    const nachher = SUCHE.astar(grid, w.start, w.ziel);
    // Reine Wiese: h = Manhattan × 2. Mit einem Weg-Feld: h = Manhattan × 1, also halb so groß.
    expect(schaetzung(grid, w.ziel)(w.start.y * BREITE + w.start.x)).toBe(
      schaetzung(zuGrid(leseKarte(w.karte)), w.ziel)(w.start.y * BREITE + w.start.x) / 2,
    );
    expect(nachher.kosten).toBe(vorher.kosten);
    expect(nachher.besucht).toBeGreaterThan(vorher.besucht);
  });
});

describe("Seitenleiste: Kurzfassung der Begründung", () => {
  for (const w of WELTEN) {
    it(`${w.titel}: höchstens 2 Sätze und 35 Wörter, Rest im Aufklapper, nichts geht verloren`, () => {
      const { kurz, rest } = kurzfassung(w.warum);
      expect(kurz.length).toBeGreaterThan(0);
      expect(kurz.split(/\s+/).length).toBeLessThanOrEqual(35);
      expect(kurz.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/).length).toBeLessThanOrEqual(2);
      expect([kurz, rest].filter(Boolean).join(" ")).toBe(w.warum);
    });
  }
});

describe("Beobachtungshinweis achteAuf", () => {
  for (const w of WELTEN) {
    it(`${w.titel}: genau ein Satz, beginnt mit „Achte darauf“`, () => {
      expect(w.achteAuf.startsWith("Achte darauf")).toBe(true);
      expect(w.achteAuf.split(/(?<=[.!?])\s+/).length).toBe(1);
      expect(w.achteAuf.endsWith(".")).toBe(true);
    });
  }
});

describe("Stollen: „DFS hat hier Glück mit der Reihenfolge“ steht im Haupttext", () => {
  it("wann und warum nennen das Glück, nicht nur der Lernpunkt", () => {
    const w = welt("stollen");
    expect(w.warum).toContain("DFS hat hier Glück mit der Reihenfolge");
    expect(w.wann).toContain("Glück");
  });
});
