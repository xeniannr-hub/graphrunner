import { describe, expect, it } from "vitest";
import { SUCHE } from "./index";

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
