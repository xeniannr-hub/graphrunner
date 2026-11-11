import { describe, expect, it } from "vitest";
import { SUCHE } from "./index";

const I = Infinity;

describe("BFS", () => {
  it("einfacher Fall: gerade Reihe", () => {
    const r = SUCHE.bfs([[1, 1, 1, 1]], { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(r.gefunden).toBe(true);
    // Drei Schritte nach rechts: (1|0), (2|0), (3|0) → 3 Felder, Kosten 1 + 1 + 1 = 3.
    expect(r.felder).toBe(3); // TODO: von Hand nachrechnen
    expect(r.kosten).toBe(3); // TODO: von Hand nachrechnen
    // Entnommen werden nacheinander (0|0), (1|0), (2|0), (3|0) → 4 Besuche.
    expect(r.besucht).toBe(4); // TODO: von Hand nachrechnen
  });

  it("Fall mit Hindernis: Mauer in der Mitte", () => {
    const grid = [
      [1, I, 1],
      [1, I, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Nur unten herum: 2 runter, 2 rechts, 2 hoch → 6 Felder, Kosten 6 · 1 = 6.
    expect(r.felder).toBe(6); // TODO: von Hand nachrechnen
    expect(r.kosten).toBe(6); // TODO: von Hand nachrechnen
  });

  it("zählt Felder, nicht Kosten", () => {
    const grid = [
      [1, 5, 1],
      [1, 1, 1],
    ];
    const r = SUCHE.bfs(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
    // Kürzester Weg in Feldern: quer durch die Mitte, 2 Felder, Kosten 5 + 1 = 6.
    // Unten herum wären es 4 Felder für Kosten 4; BFS sieht die Kosten nicht.
    expect(r.felder).toBe(2); // TODO: von Hand nachrechnen
    expect(r.kosten).toBe(6); // TODO: von Hand nachrechnen
  });

  it("Fall ohne Weg", () => {
    const r = SUCHE.bfs([[1, I, 1]], { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(r.gefunden).toBe(false);
    expect(r.weg).toEqual([]);
    expect(r.kosten).toBe(Infinity);
    expect(r.felder).toBe(Infinity);
    // Nur der Start ist erreichbar und wird entnommen → 1 Besuch.
    expect(r.besucht).toBe(1); // TODO: von Hand nachrechnen
    expect(r.schritte.at(-1)?.art).toBe("keinWeg");
  });

  it("Start gleich Ziel", () => {
    const r = SUCHE.bfs([[1, 1]], { x: 0, y: 0 }, { x: 0, y: 0 });
    // Kein Schritt nötig: Weg besteht nur aus dem Start, 0 Felder, Kosten 0.
    expect(r.felder).toBe(0); // TODO: von Hand nachrechnen
    expect(r.kosten).toBe(0); // TODO: von Hand nachrechnen
  });
});
