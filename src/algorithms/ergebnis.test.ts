import { describe, expect, it } from "vitest";
import type { Step } from "../types";
import { ALGOS, SCHRITTE, SUCHE } from "./index";

const I = Infinity;
const GRID = [
  [1, 2, 4, 1],
  [7, I, 2, 1],
  [1, 1, 2, I],
];

describe("Generator und Aufzeichnung", () => {
  for (const algo of ALGOS) {
    it(`${algo}: liefern dieselben Steps`, () => {
      const start = { x: 0, y: 2 };
      const ziel = { x: 3, y: 0 };
      const lauf = SCHRITTE[algo](GRID, start, ziel);
      const steps: Step[] = [];
      for (let r = lauf.next(); !r.done; r = lauf.next()) steps.push(r.value);
      const e = SUCHE[algo](GRID, start, ziel);
      expect(e.schritte).toEqual(steps);
      expect(e.besucht).toBe(e.besuchsIndizes.length);
      e.besuchsIndizes.forEach((idx, i) => expect(e.schritte[idx]).toHaveProperty("besuch", i + 1));
    });

    it(`${algo}: jeder next() führt genau eine Zeile aus`, () => {
      const lauf = SCHRITTE[algo](GRID, { x: 0, y: 0 }, { x: 3, y: 1 });
      const erster = lauf.next();
      expect(erster.done).toBe(false);
      expect(erster.value).toEqual({ zeile: 2, art: "init" });
    });
  }
});
