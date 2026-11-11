import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "./index";

const I = Infinity;

describe("Dijkstra", () => {
  it("einfacher Fall: gerade Reihe", () => {
    const r = SUCHE.dijkstra([[1, 1, 1, 1]], { x: 0, y: 0 }, { x: 3, y: 0 });
    // 1 + 1 + 1 = 3.
    expect(r.kosten).toBe(3); // TODO: von Hand nachrechnen
  });

  it("weicht dem Sumpf aus", () => {
    const grid = [
      [1, 7, 1],
      [2, 2, 2],
    ];
    const r = SUCHE.dijkstra(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Quer durch den Sumpf: 7 + 1 = 8. Unten herum: 2 + 2 + 2 + 1 = 7.
    expect(r.kosten).toBe(7); // TODO: von Hand nachrechnen
    expect(r.felder).toBe(4); // TODO: von Hand nachrechnen
  });

  it("Fall mit Hindernis", () => {
    const grid = [
      [1, I, 1],
      [1, I, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.dijkstra(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Nur unten herum: 6 Felder zu je 1 → 6.
    expect(r.kosten).toBe(6); // TODO: von Hand nachrechnen
  });

  it("Fall ohne Weg", () => {
    const r = SUCHE.dijkstra([[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(r.gefunden).toBe(false);
    expect(r.weg).toEqual([]);
    expect(r.kosten).toBe(Infinity);
    expect(r.felder).toBe(Infinity);
  });
});

describe("Kostenregel: Die Kante u → v kostet so viel wie das Feld v", () => {
  // Vorgabe aus CLAUDE.md, Abschnitt 10: Bei [[7, 1, 1]] kostet der Weg von links nach rechts 2,
  // von rechts nach links 8. Links → rechts: 1 + 1 = 2 (Startfeld 7 zählt nicht).
  // Rechts → links: 1 + 7 = 8 (Startfeld 1 zählt nicht, Zielfeld 7 schon).
  for (const algo of ALGOS) {
    it(`${algo}: Hin- und Rückweg kosten verschieden viel`, () => {
      expect(SUCHE[algo]([[7, 1, 1]], { x: 0, y: 0 }, { x: 2, y: 0 }).kosten).toBe(2);
      expect(SUCHE[algo]([[7, 1, 1]], { x: 2, y: 0 }, { x: 0, y: 0 }).kosten).toBe(8);
    });
  }
});
