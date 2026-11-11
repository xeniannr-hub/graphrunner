// QA-02: Gleiche Eingabe ergibt stets denselben Ablauf; hin und zurück ergibt identischen Zustand.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { Replay } from "./replay";

const I = Infinity;
const GRID = [
  [1, 2, 4, 1, 1],
  [7, I, 2, I, 1],
  [1, 1, 2, 7, 2],
  [2, I, 1, 1, 1],
];
const START = { x: 0, y: 3 };
const ZIEL = { x: 4, y: 0 };

function zustand(r: Replay) {
  return {
    d: Array.from(r.d),
    vorg: Array.from(r.vorg),
    besuchNr: Array.from(r.besuchNr),
    inListe: Array.from(r.inListe),
    reihenfolge: [...r.reihenfolge],
    gefunden: r.gefunden,
    position: r.position,
  };
}

describe("Replay", () => {
  for (const algo of ALGOS) {
    it(`${algo}: gleiche Eingabe ergibt dieselbe Aufzeichnung`, () => {
      expect(SUCHE[algo](GRID, START, ZIEL)).toEqual(SUCHE[algo](GRID, START, ZIEL));
    });

    it(`${algo}: hin und zurück ergibt identischen Zustand`, () => {
      const r = new Replay(SUCHE[algo](GRID, START, ZIEL));
      const vorher: ReturnType<typeof zustand>[] = [zustand(r)];
      while (r.vor()) vorher.push(zustand(r));
      expect(r.fertig).toBe(true);
      expect(r.gefunden).toBe(true);
      for (let k = r.laenge; k > 0; k--) {
        expect(zustand(r)).toEqual(vorher[k]);
        r.zurueck();
      }
      expect(zustand(r)).toEqual(vorher[0]);
    });

    it(`${algo}: Springen ergibt denselben Zustand wie Schritt für Schritt`, () => {
      const a = new Replay(SUCHE[algo](GRID, START, ZIEL));
      const b = new Replay(SUCHE[algo](GRID, START, ZIEL));
      const mitte = Math.floor(a.laenge / 2);
      a.gehe(a.laenge);
      a.gehe(mitte);
      for (let k = 0; k < mitte; k++) b.vor();
      expect(zustand(a)).toEqual(zustand(b));
    });

    it(`${algo}: am Ende stimmen Besuchsreihenfolge und Vorgänger mit dem Ergebnis überein`, () => {
      const e = SUCHE[algo](GRID, START, ZIEL);
      const r = new Replay(e);
      r.gehe(r.laenge);
      expect(r.reihenfolge.length).toBe(e.besucht);
      const weg: number[] = [];
      for (let v = e.wegIds[e.wegIds.length - 1]; v !== -1; v = r.vorg[v]) weg.push(v);
      expect(weg.reverse()).toEqual(e.wegIds);
    });

    it(`${algo}: Position nach dem n-ten Besuch`, () => {
      const r = new Replay(SUCHE[algo](GRID, START, ZIEL));
      r.gehe(r.positionNachBesuch(3));
      expect(r.reihenfolge.length).toBe(3);
      r.gehe(r.positionNachBesuch(10_000));
      expect(r.fertig).toBe(true);
    });
  }
});
