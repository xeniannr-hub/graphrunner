import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "./index";
import { nachbarn, schaetzung } from "./raster";

const I = Infinity;

describe("Raster", () => {
  it("liefert Nachbarn in der Reihenfolge oben, rechts, unten, links", () => {
    const grid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    // Mitte (1|1) = id 4: oben id 1, rechts id 5, unten id 7, links id 3.
    expect(nachbarn(grid, 4)).toEqual([1, 5, 7, 3]); // TODO: von Hand nachrechnen
  });

  it("lässt unpassierbare Nachbarn weg", () => {
    const grid = [
      [1, I, 1],
      [1, 1, 1],
    ];
    // (0|0) = id 0: oben gibt es nicht, rechts (1|0) ist Fels, unten (0|1) = id 3, links gibt es nicht.
    expect(nachbarn(grid, 0)).toEqual([3]); // TODO: von Hand nachrechnen
  });

  it("Schätzung: Manhattan-Abstand mal billigstes Feld", () => {
    const grid = [
      [2, 4, 7],
      [2, 2, I],
    ];
    const h = schaetzung(grid, { x: 2, y: 0 });
    // (0|1) = id 3: Abstand |0 − 2| + |1 − 0| = 3, billigstes Feld 2 → 6.
    expect(h(3)).toBe(6); // TODO: von Hand nachrechnen
  });
});

describe("Ungültige Eingaben werfen RangeError", () => {
  const fall: [string, number[][], { x: number; y: number }, { x: number; y: number }][] = [
    ["leere Karte", [], { x: 0, y: 0 }, { x: 0, y: 0 }],
    ["Kosten 0", [[1, 0]], { x: 0, y: 0 }, { x: 1, y: 0 }],
    ["negative Kosten", [[1, -2]], { x: 0, y: 0 }, { x: 1, y: 0 }],
    ["Start außerhalb", [[1, 1]], { x: 5, y: 0 }, { x: 1, y: 0 }],
    ["Start auf Hindernis", [[I, 1]], { x: 0, y: 0 }, { x: 1, y: 0 }],
    ["Ziel außerhalb", [[1, 1]], { x: 0, y: 0 }, { x: 0, y: 3 }],
  ];
  for (const algo of ALGOS) {
    for (const [name, grid, s, z] of fall) {
      it(`${algo}: ${name}`, () => {
        expect(() => SUCHE[algo](grid, s, z)).toThrow(RangeError);
      });
    }
  }
  it("Meldung ist deutsch", () => {
    expect(() => SUCHE.bfs([[I, 1]], { x: 0, y: 0 }, { x: 1, y: 0 })).toThrow("Der Start liegt auf einem Hindernis.");
  });
});
