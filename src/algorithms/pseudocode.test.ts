import { describe, expect, it } from "vitest";
import type { Grid, Pos } from "../types";
import { ALGOS, PSEUDOCODE, SUCHE } from "./index";

const I = Infinity;

// Karten, auf denen jede Zeile mindestens einmal vorkommt: mit Weg, ohne Weg, mit veralteten Heap-Einträgen.
const FAELLE: [Grid, Pos, Pos][] = [
  [
    [
      [1, 7, 1, 1],
      [1, I, 1, 2],
      [2, 1, 1, 1],
    ],
    { x: 0, y: 0 },
    { x: 3, y: 0 },
  ],
  [[[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 }],
];

describe("Pseudocode", () => {
  for (const algo of ALGOS) {
    it(`${algo}: jeder Step zeigt auf eine passende Zeile, jede Zeile kommt vor`, () => {
      const code = PSEUDOCODE[algo];
      const benutzt = new Set<number>();
      for (const [grid, s, z] of FAELLE) {
        for (const step of SUCHE[algo](grid, s, z).schritte) {
          const zeile = code[step.zeile - 1];
          expect(zeile, `Zeile ${step.zeile} fehlt`).toBeDefined();
          expect(zeile.arten).toContain(step.art);
          benutzt.add(step.zeile);
        }
      }
      code.forEach((zeile, i) => {
        if (zeile.arten.length > 0) expect(benutzt.has(i + 1), `Zeile ${i + 1} kommt nie vor`).toBe(true);
      });
    });
  }
});
