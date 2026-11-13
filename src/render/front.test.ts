// FA-31: Die Umrisslinie der Suchfront umschließt genau die wartenden Felder.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { Replay } from "../replay/replay";
import { leseKarte, zuGrid } from "../world/terrain";
import { WELTEN } from "../world/worlds";
import { frontUmriss, inFront } from "./front";

/** Seiten eines Feldes als Schlüssel, unabhängig von der Richtung der Kante. */
const seite = (x1: number, y1: number, x2: number, y2: number) =>
  `${Math.min(x1, x2)},${Math.min(y1, y2)},${Math.max(x1, x2)},${Math.max(y1, y2)}`;

describe("Suchfront: Umrisslinie", () => {
  for (const w of WELTEN.filter((x) => x.algo !== null)) {
    for (const algo of ALGOS) {
      it(`${w.titel}, ${algo}: Die Linie umschließt genau die wartenden Felder`, () => {
        const grid = zuGrid(leseKarte(w.karte));
        const r = new Replay(SUCHE[algo](grid, w.start, w.ziel));
        const b = r.ergebnis.breite;
        const h = r.ergebnis.hoehe;
        for (const anteil of [0.1, 0.4, 0.8]) {
          r.gehe(Math.floor(r.laenge * anteil));
          const wartet = (x: number, y: number) => x >= 0 && y >= 0 && x < b && y < h && inFront(r, y * b + x);
          // Soll: jede Seite zwischen einem wartenden und einem nicht wartenden Feld (oder dem Rand).
          const soll = new Set<string>();
          for (let y = 0; y < h; y++)
            for (let x = 0; x < b; x++) {
              if (!wartet(x, y)) continue;
              if (!wartet(x, y - 1)) soll.add(seite(x, y, x + 1, y));
              if (!wartet(x + 1, y)) soll.add(seite(x + 1, y, x + 1, y + 1));
              if (!wartet(x, y + 1)) soll.add(seite(x, y + 1, x + 1, y + 1));
              if (!wartet(x - 1, y)) soll.add(seite(x, y, x, y + 1));
            }
          const ist = frontUmriss(r);
          expect(new Set(ist.map((k) => seite(k.x1, k.y1, k.x2, k.y2)))).toEqual(soll);
          // Jede Kante gehört zu einem wartenden Feld; jedes wartende Feld mit einer Außenseite kommt vor.
          for (const k of ist) expect(inFront(r, k.feld)).toBe(true);
          // Jede Kante ist genau eine Feldseite lang.
          for (const k of ist) expect(Math.abs(k.x2 - k.x1) + Math.abs(k.y2 - k.y1)).toBe(1);
        }
      });
    }
  }

  it("kleines Beispiel: ein wartendes Feld hat einen Umriss aus 4 Seiten", () => {
    // Karte [[1, 1, 1, 1]], Start (0|0). Nach init, setze(s), einfügen(s) wartet nur der Start → 4 Seiten.
    const r = new Replay(SUCHE.bfs([[1, 1, 1, 1]], { x: 0, y: 0 }, { x: 3, y: 0 }));
    r.gehe(3);
    expect(frontUmriss(r).length).toBe(4); // TODO: von Hand nachrechnen
    expect(frontUmriss(r).every((k) => k.feld === 0)).toBe(true);
  });

  it("kleines Beispiel: zwei benachbarte wartende Felder haben einen gemeinsamen Umriss aus 6 Seiten", () => {
    // DFS auf [[1, 1, 1]], Start (0|0). Steps: init, setze(s), auflegen(s), schleife, oben, zielprüfung, nachbar (1|0),
    // markiertPrüfung, setze, auflegen((1|0)) → 10 Steps. Auf dem Stapel: (0|0) und (1|0) nebeneinander.
    // Je 4 Seiten = 8, minus die gemeinsame innere Seite, die bei beiden wegfällt (2) → 6.
    const r = new Replay(SUCHE.dfs([[1, 1, 1]], { x: 0, y: 0 }, { x: 2, y: 0 }));
    r.gehe(10);
    expect(r.inhalt().map((e) => e.v)).toEqual([1, 0]);
    expect(frontUmriss(r).length).toBe(6); // TODO: von Hand nachrechnen
    expect(frontUmriss(r).some((k) => k.x1 === 1 && k.x2 === 1)).toBe(false);
  });
});
