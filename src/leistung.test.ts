// QA-03: Neuberechnung aller vier Verfahren ohne spürbare Wartezeit, < 100 ms je Welt.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "./algorithms";
import { Replay } from "./replay/replay";
import { leseKarte, zuGrid } from "./world/terrain";
import { WELTEN } from "./world/worlds";

describe("QA-03: Leistung", () => {
  for (const w of WELTEN) {
    it(`${w.titel}: alle vier Verfahren samt Replay in < 100 ms`, () => {
      const grid = zuGrid(leseKarte(w.karte));
      // Einmal aufwärmen, damit der JIT-Compiler die Messung nicht verfälscht.
      for (const a of ALGOS) SUCHE[a](grid, w.start, w.ziel);
      const t0 = performance.now();
      for (const a of ALGOS) {
        const r = new Replay(SUCHE[a](grid, w.start, w.ziel));
        r.gehe(r.laenge);
      }
      expect(performance.now() - t0).toBeLessThan(100);
    });
  }
});
