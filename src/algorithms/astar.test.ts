import { describe, expect, it } from "vitest";
import { SUCHE, nachbarn, schaetzung } from "./index";

const I = Infinity;

describe("A*", () => {
  it("einfacher Fall: gerade Reihe", () => {
    const r = SUCHE.astar([[1, 1, 1, 1]], { x: 0, y: 0 }, { x: 3, y: 0 });
    // 1 + 1 + 1 = 3.
    expect(r.kosten).toBe(3); // TODO: von Hand nachrechnen
  });

  it("Fall mit Hindernis", () => {
    const grid = [
      [1, I, 1],
      [1, I, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.astar(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Nur unten herum: 6 Felder zu je 1 → 6.
    expect(r.kosten).toBe(6); // TODO: von Hand nachrechnen
  });

  it("Fall ohne Weg", () => {
    const r = SUCHE.astar([[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(r.gefunden).toBe(false);
    expect(r.weg).toEqual([]);
    expect(r.kosten).toBe(Infinity);
  });

  it("bleibt genau, wenn das billigste Feld 2 kostet", () => {
    const grid = [
      [2, 4, 2],
      [2, 2, 2],
    ];
    const r = SUCHE.astar(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Quer: 4 + 2 = 6. Unten herum: 2 + 2 + 2 + 2 = 8. Günstigster Weg: 6.
    expect(r.kosten).toBe(6); // TODO: von Hand nachrechnen
  });

  it("besucht auf freier Wiese weniger Felder als Dijkstra", () => {
    const grid = Array.from({ length: 9 }, () => new Array<number>(9).fill(2));
    const a = SUCHE.astar(grid, { x: 0, y: 4 }, { x: 8, y: 4 });
    const d = SUCHE.dijkstra(grid, { x: 0, y: 4 }, { x: 8, y: 4 });
    expect(a.kosten).toBe(d.kosten);
    expect(a.besucht).toBeLessThan(d.besucht);
  });
});

describe("A*-Heuristik: Manhattan-Abstand × billigstes Feld", () => {
  // Tatsächliche Restkosten h*(v) = günstigster Weg von v zum Ziel (rückwärts über alle Felder mit Dijkstra).
  const restkosten = (grid: number[][], v: { x: number; y: number }, ziel: { x: number; y: number }) =>
    SUCHE.dijkstra(grid, v, ziel).kosten;

  /** Reproduzierbare Zufallskarten mit Kosten 0 bis 7 und Hindernissen. */
  function* karten(): Generator<number[][]> {
    let s = 7;
    const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const K = [0, 1, 2, 2, 4, 7, Infinity];
    for (let i = 0; i < 40; i++) {
      const b = 2 + Math.floor(r() * 7);
      const h = 2 + Math.floor(r() * 6);
      yield Array.from({ length: h }, () => Array.from({ length: b }, () => K[Math.floor(r() * K.length)]));
    }
  }

  it("ist zulässig: überschätzt die tatsächlichen Restkosten nie (auch bei variablen Kosten)", () => {
    let geprueft = 0;
    for (const grid of karten()) {
      const ziel = { x: 0, y: 0 };
      grid[0][0] = 1;
      const h = schaetzung(grid, ziel);
      const b = grid[0].length;
      grid.forEach((zeile, y) =>
        zeile.forEach((k, x) => {
          if (k === Infinity) return;
          const echt = restkosten(grid, { x, y }, ziel);
          if (echt === Infinity) return;
          expect(h(y * b + x)).toBeLessThanOrEqual(echt);
          geprueft++;
        }),
      );
    }
    expect(geprueft).toBeGreaterThan(100);
  });

  it("ist konsistent: h(u) ≤ kosten(u → v) + h(v) für jede Kante", () => {
    for (const grid of karten()) {
      const ziel = { x: grid[0].length - 1, y: grid.length - 1 };
      grid[ziel.y][ziel.x] = 1;
      const h = schaetzung(grid, ziel);
      const b = grid[0].length;
      for (let u = 0; u < b * grid.length; u++) {
        if (grid[Math.floor(u / b)][u % b] === Infinity) continue;
        for (const v of nachbarn(grid, u)) expect(h(u)).toBeLessThanOrEqual(grid[Math.floor(v / b)][v % b] + h(v));
      }
    }
  });

  it("ist am Ziel 0", () => {
    const grid = [[2, 2, 2]];
    expect(schaetzung(grid, { x: 2, y: 0 })(2)).toBe(0);
  });
});
