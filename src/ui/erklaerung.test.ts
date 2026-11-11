import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { Replay } from "../replay/replay";
import { leseKarte, zuGrid } from "../world/terrain";
import { WELTEN } from "../world/worlds";
import { erklaerSatz, feldInfo, fokus } from "./erklaerung";

const KOORD = /\((\d+)\|(\d+)\)/g;

describe("Erklärsatz und fokus()", () => {
  const w = WELTEN.find((x) => x.id === "flussmoor");
  if (!w) throw new Error("Flussmoor fehlt");
  const karte = leseKarte(w.karte);
  const grid = zuGrid(karte);
  const I = Infinity;
  const ohneWeg = [[1, I, 1]];

  for (const algo of ALGOS) {
    it(`${algo}: Erklärsatz nennt genau die Felder, die fokus() markiert`, () => {
      for (const r of [new Replay(SUCHE[algo](grid, w.start, w.ziel)), new Replay(SUCHE[algo](ohneWeg, { x: 0, y: 0 }, { x: 2, y: 0 }))]) {
        const b = r.ergebnis.breite;
        while (r.vor()) {
          const f = fokus(r.aktuell);
          const erwartet = new Set([f.bearbeitet, f.geprueft].filter((x) => x !== null).map((id) => `(${(id as number) % b}|${Math.floor((id as number) / b)})`));
          const satz = erklaerSatz(r);
          const genannt = new Set([...satz.matchAll(KOORD)].map((m) => m[0]));
          expect(genannt, `${r.aktuell?.art}: ${satz}`).toEqual(erwartet);
        }
      }
    });
  }

  it("Tooltip nennt Koordinate, Kategorie, Gewichtung und Besuchsstatus", () => {
    const r = new Replay(SUCHE.bfs(grid, w.start, w.ziel));
    r.gehe(r.laenge);
    expect(feldInfo(karte, w.start, w.start, w.ziel, r)).toEqual([`Feld (${w.start.x}|${w.start.y}) · Start`, "Weg", "Ausdauer 1", "Besuch Nr. 1"]);
    expect(feldInfo(karte, { x: 0, y: 9 }, w.start, w.ziel, r)).toEqual(["Feld (0|9)", "Wasser", "nicht begehbar"]);
  });
});
