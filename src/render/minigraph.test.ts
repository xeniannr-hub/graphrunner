// FA-29: Mini-Graph. Daten ohne Browser prüfen: Lücken für Hindernisse, nur 4er-Nachbarn, Markierung wie fokus(),
// Kantengewicht = Kosten des Zielfeldes.
import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { fokus } from "../info/fokus";
import { Replay } from "../replay/replay";
import { leseKarte, zuGrid } from "../world/terrain";
import { WELTEN } from "../world/worlds";
import { graphAusschnitt, zentrumVon } from "./minigraph";

const I = Infinity;

describe("Mini-Graph: graphAusschnitt()", () => {
  const w = WELTEN.find((x) => x.id === "flussmoor");
  if (!w) throw new Error("Flussmoor fehlt");
  const grid = zuGrid(leseKarte(w.karte));

  for (const algo of ALGOS) {
    it(`${algo}: keine unpassierbaren Felder, Kanten nur zu 4er-Nachbarn, Markierung wie fokus()`, () => {
      const r = new Replay(SUCHE[algo](grid, w.start, w.ziel));
      const b = r.ergebnis.breite;
      // Jeden 7. Schritt prüfen: deckt alle Step-Arten ab und bleibt schnell.
      for (let k = 0; k <= r.laenge; k += 7) {
        r.gehe(k);
        const a = graphAusschnitt(r, zentrumVon(r));
        const ids = new Set(a.knoten.map((n) => n.id));
        for (const n of a.knoten) expect(grid[Math.floor(n.id / b)][n.id % b]).toBeLessThan(Infinity);
        for (const kante of a.kanten) {
          expect(ids.has(kante.von) && ids.has(kante.nach)).toBe(true);
          const dx = Math.abs((kante.von % b) - (kante.nach % b));
          const dy = Math.abs(Math.floor(kante.von / b) - Math.floor(kante.nach / b));
          expect(dx + dy).toBe(1);
        }
        expect(a.fokus).toEqual(fokus(r.aktuell));
        // Das bearbeitete Feld liegt im Ausschnitt (es ist dessen Zentrum).
        if (a.fokus.bearbeitet !== null) expect(ids.has(a.fokus.bearbeitet)).toBe(true);
      }
    });
  }

  it("Ausschnitt ist 5 × 5 und bleibt am Kartenrand im Bild", () => {
    const r = new Replay(SUCHE.bfs(grid, w.start, w.ziel));
    const a = graphAusschnitt(r, { x: 0, y: 0 });
    expect([a.links, a.oben, a.spalten, a.zeilen]).toEqual([0, 0, 5, 5]);
  });
});

describe("Mini-Graph: kleines Beispiel mit Rechenweg", () => {
  // Karte 3 × 2:   [1, 7, I]
  //                [2, 1, 1]
  // Start (0|0), Ziel (2|1). Fels bei (2|0) ist kein Knoten.
  const grid = [
    [1, 7, I],
    [2, 1, 1],
  ];
  const r = new Replay(SUCHE.dijkstra(grid, { x: 0, y: 0 }, { x: 2, y: 1 }));
  r.gehe(r.laenge);
  const a = graphAusschnitt(r, { x: 1, y: 0 });

  it("Hindernis ist eine Lücke: 5 Knoten, keine Kante nach (2|0)", () => {
    // Begehbar: (0|0), (1|0), (0|1), (1|1), (2|1) → 5 Knoten.
    expect(a.knoten.length).toBe(5); // TODO: von Hand nachrechnen
    expect(a.knoten.some((n) => n.id === 2)).toBe(false);
    expect(a.kanten.some((k) => k.nach === 2 || k.von === 2)).toBe(false);
  });

  it("Kantengewicht = Kosten des Zielfeldes", () => {
    const b = 3;
    for (const k of a.kanten) expect(k.gewicht).toBe(grid[Math.floor(k.nach / b)][k.nach % b]);
    // Konkret: (0|0) → (1|0) betritt Sumpf-Feld mit Kosten 7; (1|0) → (0|0) betritt Feld mit Kosten 1.
    expect(a.kanten.find((k) => k.von === 0 && k.nach === 1)?.gewicht).toBe(7); // TODO: von Hand nachrechnen
    expect(a.kanten.find((k) => k.von === 1 && k.nach === 0)?.gewicht).toBe(1); // TODO: von Hand nachrechnen
  });

  it("Vorgängerkanten folgen vorg: günstigster Weg (0|0) → (0|1) → (1|1) → (2|1)", () => {
    // Unten herum: 2 + 1 + 1 = 4. Über (1|0): 7 + 1 + 1 = 9. Dijkstra nimmt unten herum.
    // ids bei Breite 3: (0|0) = 0, (0|1) = 3, (1|1) = 4, (2|1) = 5.
    const vorg = a.kanten.filter((k) => k.vorgaenger).map((k) => `${k.von}→${k.nach}`);
    expect(vorg).toEqual(expect.arrayContaining(["0→3", "3→4", "4→5"])); // TODO: von Hand nachrechnen
    expect(r.ergebnis.kosten).toBe(4); // TODO: von Hand nachrechnen
  });
});

describe("Mini-Graph: A* zeigt h erst nach dem Schritt „schaetze“", () => {
  it("h ist null, bis die Schätzung für das Feld berechnet wurde", () => {
    const grid = [[1, 1, 1]];
    const r = new Replay(SUCHE.astar(grid, { x: 0, y: 0 }, { x: 2, y: 0 }));
    // Steps: init, setze(s), schaetze(s), einfuegen(s), …
    r.gehe(2);
    expect(graphAusschnitt(r, { x: 0, y: 0 }).knoten.find((n) => n.id === 0)?.h).toBeNull();
    r.gehe(3);
    // h(s) = Manhattan((0|0), (2|0)) × billigstes Feld 1 = 2.
    expect(graphAusschnitt(r, { x: 0, y: 0 }).knoten.find((n) => n.id === 0)?.h).toBe(2); // TODO: von Hand nachrechnen
  });
});
