import { describe, expect, it } from "vitest";
import { SUCHE } from "./index";

const I = Infinity;

describe("DFS", () => {
  it("einfacher Fall: folgt der Reihenfolge oben, rechts, unten, links", () => {
    const grid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.dfs(grid, { x: 0, y: 2 }, { x: 2, y: 0 });
    // (0|2) → oben (0|1) → oben (0|0) → oben gibt es nicht, rechts (1|0) → rechts (2|0) = Ziel.
    expect(r.weg).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]); // TODO: von Hand nachrechnen
    // Aufgelegt werden genau die 5 Felder des Weges → 5 Besuche.
    expect(r.besucht).toBe(5); // TODO: von Hand nachrechnen
  });

  it("Fall mit Hindernis: läuft oben herum", () => {
    const grid = [
      [1, 1, 1],
      [1, I, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.dfs(grid, { x: 0, y: 1 }, { x: 2, y: 1 });
    // (0|1) → oben (0|0) → rechts (1|0) → rechts (2|0) → unten (2|1) = Ziel: 4 Felder.
    expect(r.felder).toBe(4); // TODO: von Hand nachrechnen
    expect(r.kosten).toBe(4); // TODO: von Hand nachrechnen
  });

  it("springt aus einer Sackgasse zurück", () => {
    const grid = [
      [1, I, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.dfs(grid, { x: 0, y: 1 }, { x: 2, y: 1 });
    // (0|1) → oben (0|0): Sackgasse, wird wieder entnommen → zurück zu (0|1) → rechts (1|1) → rechts (2|1).
    // Weg: (0|1), (1|1), (2|1) → 2 Felder. Aufgelegt: (0|1), (0|0), (1|1), (2|1) → 4 Besuche.
    expect(r.felder).toBe(2); // TODO: von Hand nachrechnen
    expect(r.besucht).toBe(4); // TODO: von Hand nachrechnen
    expect(r.schritte.some((s) => s.art === "entnehmen" && s.u === 0)).toBe(true);
  });

  it("Fall ohne Weg", () => {
    const r = SUCHE.dfs([[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(r.gefunden).toBe(false);
    expect(r.weg).toEqual([]);
    expect(r.kosten).toBe(Infinity);
    expect(r.felder).toBe(Infinity);
  });
});
