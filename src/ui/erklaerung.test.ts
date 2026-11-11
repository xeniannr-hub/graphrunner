import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { Replay } from "../replay/replay";
import { leseKarte, zuGrid } from "../world/terrain";
import type { TerrainKey } from "../types";
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
    // Start (4|7) ist Weg. Nachbarn: oben (4|6) Weg → 1, rechts (5|7) Sumpf → 7, unten (4|8) Sumpf → 7, links (3|7) Sumpf → 7.
    expect(feldInfo(karte, w.start, w.start, w.ziel, r)).toEqual([
      `Feld (${w.start.x}|${w.start.y}) · Start`,
      "Weg",
      "Ausdauer 1",
      "Kanten: ↑ 1 · → 7 · ↓ 7 · ← 7", // TODO: von Hand nachrechnen
      "Besuch Nr. 1",
    ]);
    expect(feldInfo(karte, { x: 0, y: 9 }, w.start, w.ziel, r)).toEqual(["Feld (0|9)", "Wasser", "nicht begehbar"]);
  });

  it("Tooltip nennt die ausgehenden Kanten mit Gewicht (Karte als Graph)", () => {
    const k: TerrainKey[][] = [
      ["gras", "wald", "gras"],
      ["gras", "weg", "wasser"],
      ["fels", "sumpf", "gras"],
    ];
    const s = { x: 2, y: 2 };
    const z = { x: 0, y: 1 };
    // Mitte (1|1): oben (1|0) Wald → 4, rechts (2|1) Wasser → keine Kante, unten (1|2) Sumpf → 7, links (0|1) Wiese → 2.
    expect(feldInfo(k, { x: 1, y: 1 }, s, z)[3]).toBe("Kanten: ↑ 4 · → – · ↓ 7 · ← 2"); // TODO: von Hand nachrechnen
    // Ecke (0|0): oben außerhalb → keine Kante, rechts (1|0) Wald → 4, unten (0|1) Wiese → 2, links außerhalb → keine Kante.
    expect(feldInfo(k, { x: 0, y: 0 }, s, z)[3]).toBe("Kanten: ↑ – · → 4 · ↓ 2 · ← –"); // TODO: von Hand nachrechnen
    // Fels (0|2) ist kein Knoten: keine Kantenzeile.
    expect(feldInfo(k, { x: 0, y: 2 }, s, z)).toEqual(["Feld (0|2)", "Fels", "nicht begehbar"]); // TODO: von Hand nachrechnen
  });
});
