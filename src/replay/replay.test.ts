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
    expandiert: Array.from(r.expandiert),
    inhalt: r.inhalt(),
    entnommenePrio: [...r.entnommenePrio],
    zaehler: [r.verbesserungen, r.ueberholt, r.ruecksprunge],
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

  for (const algo of ALGOS) {
    it(`${algo}: Datenstruktur enthält genau die Felder, die laut inListe warten, und entnimmt, was der Step sagt`, () => {
      const r = new Replay(SUCHE[algo](GRID, START, ZIEL));
      while (r.vor()) {
        const zaehlung = new Map<number, number>();
        for (const e of r.inhalt()) zaehlung.set(e.v, (zaehlung.get(e.v) ?? 0) + 1);
        r.inListe.forEach((n, v) => expect(zaehlung.get(v) ?? 0).toBe(n));
        const s = r.aktuell;
        if (s?.art === "entnehmen" && s.prio !== undefined) expect(r.entnommenePrio.at(-1)).toBe(s.prio);
      }
    });
  }

  it("BFS: Warteschlange ist FIFO, nichts wird überholt, d wird nie verbessert", () => {
    const r = new Replay(SUCHE.bfs(GRID, START, ZIEL));
    r.gehe(r.laenge);
    expect(r.ueberholt).toBe(0);
    expect(r.verbesserungen).toBe(0);
  });

  it("Dijkstra: entnommene Prioritäten steigen nie (Kosten ≥ 0)", () => {
    const r = new Replay(SUCHE.dijkstra(GRID, START, ZIEL));
    r.gehe(r.laenge);
    const p = r.entnommenePrio;
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]);
  });

  it("Dijkstra: auf gewichteter Karte wird ein jüngerer Eintrag vor einem älteren entnommen (also kein FIFO)", () => {
    const r = new Replay(SUCHE.dijkstra(GRID, START, ZIEL));
    r.gehe(r.laenge);
    expect(r.ueberholt).toBeGreaterThan(0);
  });

  it("Zustände: Start ist nach dem Einfügen „wartet“, am Ende liegt der Weg im Zustand „weg“", () => {
    const r = new Replay(SUCHE.bfs(GRID, START, ZIEL));
    const s = START.y * 5 + START.x;
    expect(r.zustand(s)).toBe("unbekannt");
    r.gehe(2); // init, d[s] ← 0
    expect(r.zustand(s)).toBe("entdeckt");
    r.gehe(3); // Q.hintenAnfügen(s)
    expect(r.zustand(s)).toBe("wartet");
    r.gehe(5); // schleife, entnehmen
    expect(r.zustand(s)).toBe("expandiert");
    r.gehe(r.laenge);
    for (const v of r.ergebnis.wegIds) expect(r.zustand(v)).toBe("weg");
  });

  it("Dijkstra verbessert ein gesetztes d nie: Jede Kante in ein Feld kostet gleich viel (Kosten des Feldes)", () => {
    // Begründung: Felder werden mit aufsteigendem d expandiert; der erste Fund von v kommt vom kleinsten d[u],
    // und d[u] + kosten(v) kann von keinem später expandierten u' unterboten werden.
    let s = 3;
    const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const K = [0, 1, 2, 4, 7, I];
    for (let i = 0; i < 100; i++) {
      const grid = Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => K[Math.floor(r() * K.length)]));
      grid[0][0] = 1;
      grid[5][7] = 1;
      const rp = new Replay(SUCHE.dijkstra(grid, { x: 0, y: 0 }, { x: 7, y: 5 }));
      rp.gehe(rp.laenge);
      expect(rp.verbesserungen).toBe(0);
    }
  });
});
