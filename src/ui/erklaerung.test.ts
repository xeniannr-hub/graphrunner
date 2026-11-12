import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import { Replay } from "../replay/replay";
import { leseKarte, zuGrid } from "../world/terrain";
import type { TerrainKey } from "../types";
import { WELTEN } from "../world/worlds";
import { schaetzung } from "../algorithms";
import { fokus } from "../info/fokus";
import { erklaerSatz, feldInfo, kartenBeschreibung, merkmal, protokoll } from "./erklaerung";

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
          const erwartet = new Set(
            [f.bearbeitet, f.geprueft].filter((x) => x !== null).map((id) => `(${(id as number) % b}|${Math.floor((id as number) / b)})`),
          );
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
      // Der Start wird als Erstes entnommen und liegt am Ende auf dem gefundenen Weg.
      "Teil des gefundenen Weges · Besuch Nr. 1",
      // Start: 0 Kanten ab Start, kein Vorgänger.
      "d = 0 Kanten ab Start · Vorgänger –",
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

  it("A*: Tooltip zeigt g, h und f einzeln", () => {
    const k: TerrainKey[][] = [["weg", "gras", "gras"]];
    const g = zuGrid(k);
    const s = { x: 0, y: 0 };
    const z = { x: 2, y: 0 };
    const h = schaetzung(g, z);
    const r = new Replay(SUCHE.astar(g, s, z));
    r.gehe(r.laenge);
    // (1|0): g = 2 (Wiese betreten). Billigstes Feld der Karte: Weg = 1. h = |1 − 2| · 1 = 1. f = 2 + 1 = 3.
    expect(feldInfo(k, { x: 1, y: 0 }, s, z, r, h).at(-1)).toBe("g = 2 · h = 1 · f = 3 · Vorgänger (0|0)"); // TODO: von Hand nachrechnen
  });
});

describe("Ereignisprotokoll", () => {
  const I = Infinity;
  it("A*: nennt Verbesserungen mit altem und neuem g und Vorgänger (Flussmoor)", () => {
    const w = WELTEN.find((x) => x.id === "flussmoor");
    if (!w) throw new Error("Flussmoor fehlt");
    const grid = zuGrid(leseKarte(w.karte));
    const r = new Replay(SUCHE.astar(grid, w.start, w.ziel));
    const p = protokoll(r, schaetzung(grid, w.ziel));
    const besser = p.filter((e) => e.art === "besser");
    expect(besser.length).toBeGreaterThan(0);
    for (const e of besser) expect(e.text).toMatch(/^\(\d+\|\d+\): g \d+ → \d+, Vorgänger \(\d+\|\d+\) → \(\d+\|\d+\)$/);
    expect(p.at(-1)?.art).toBe("ziel");
  });
  it("lässt reine Kontrollzeilen weg und zeigt auf existierende Steps", () => {
    for (const algo of ALGOS) {
      const r = new Replay(SUCHE[algo]([[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 }));
      const p = protokoll(r, () => 0);
      for (const e of p) expect(["schleife", "nachbar", "keinNachbar", "init", "rechne"]).not.toContain(r.ergebnis.schritte[e.schritt].art);
      expect(p.at(-1)?.art).toBe("keinWeg");
    }
  });
  it("DFS: Rücksprung steht im Protokoll", () => {
    const r = new Replay(
      SUCHE.dfs(
        [
          [1, I, 1],
          [1, 1, 1],
        ],
        { x: 0, y: 1 },
        { x: 2, y: 1 },
      ),
    );
    expect(protokoll(r, () => 0).some((e) => e.art === "zurueck")).toBe(true);
  });
});

describe("Merkmal: Woran erkenne ich Dijkstra statt BFS?", () => {
  it("Flussmoor: Dijkstra überholt ältere Einträge und verbessert d, BFS nie", () => {
    const w = WELTEN.find((x) => x.id === "flussmoor");
    if (!w) throw new Error("Flussmoor fehlt");
    const grid = zuGrid(leseKarte(w.karte));
    const d = new Replay(SUCHE.dijkstra(grid, w.start, w.ziel));
    const b = new Replay(SUCHE.bfs(grid, w.start, w.ziel));
    d.gehe(d.laenge);
    b.gehe(b.laenge);
    expect(d.ueberholt).toBeGreaterThan(0);
    expect(b.ueberholt).toBe(0);
    expect(b.verbesserungen).toBe(0);
    expect(merkmal(d).frage).toMatch(/Dijkstra .* nicht eine Breitensuche/);
    expect(merkmal(d).belege[0]).toContain(`${d.ueberholt}-mal`);
  });
});

describe("Kartenbeschreibung für Screenreader", () => {
  it("nennt Verfahren, Start, Ziel, Stand und Ergebnis", () => {
    const grid = [[1, 1, 1]];
    const r = new Replay(SUCHE.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 }));
    expect(kartenBeschreibung(r)).toContain("Karte BFS: Start (0|0), Ziel (2|0).");
    expect(kartenBeschreibung(r)).toContain("Suche noch nicht gestartet.");
    r.gehe(r.laenge);
    // Weg (0|0) → (1|0) → (2|0): 2 Kanten, Kosten 1 + 1 = 2.
    expect(kartenBeschreibung(r)).toContain("Weg gefunden: 2 Kanten, 2 Ausdauer."); // TODO: von Hand nachrechnen
  });
});
