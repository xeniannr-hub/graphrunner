// QA-03: Neuberechnung aller vier Verfahren ohne spürbare Wartezeit, < 100 ms je Welt.
// Zeitmessungen schwanken je nach Rechner. Deshalb: aufwärmen, fünfmal messen, Median nehmen.
// `npm test` lässt diesen Test aus, damit ein langsamer CI-Rechner keine Veröffentlichung verhindert;
// er läuft mit `npm run test:leistung` und in der CI in einem eigenen, nicht blockierenden Schritt.
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
      const zeiten: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        for (const a of ALGOS) {
          const r = new Replay(SUCHE[a](grid, w.start, w.ziel));
          r.gehe(r.laenge);
        }
        zeiten.push(performance.now() - t0);
      }
      zeiten.sort((a, b) => a - b);
      expect(zeiten[2]).toBeLessThan(100);
    });
  }
});
