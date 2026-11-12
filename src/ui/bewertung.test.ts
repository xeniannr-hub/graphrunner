import { describe, expect, it } from "vitest";
import { ALGOS, SUCHE } from "../algorithms";
import type { Algo, Grid, Pos } from "../types";
import { leseKarte, zuGrid } from "../world/terrain";
import { WELTEN, type Welt } from "../world/worlds";
import { besteWahl, fazitText, tabellenZeilen, type Ergebnisse } from "./bewertung";
import { ALGO_INFO } from "../info/algo-info";

const rechne = (grid: Grid, start: Pos, ziel: Pos): Ergebnisse =>
  Object.fromEntries(ALGOS.map((a) => [a, SUCHE[a](grid, start, ziel)])) as Record<Algo, Ergebnisse[Algo]>;
const ergebnisseVon = (w: Welt): Ergebnisse => rechne(zuGrid(leseKarte(w.karte)), w.start, w.ziel);
const amEnde = (E: Ergebnisse) => ({
  k: Math.max(...ALGOS.map((a) => E[a].besucht)),
  position: Object.fromEntries(ALGOS.map((a) => [a, E[a].schritte.length])) as Record<Algo, number>,
  laufzeit: null,
});
const welt = (id: string): Welt => {
  const w = WELTEN.find((x) => x.id === id);
  if (!w) throw new Error(`Welt ${id} fehlt`);
  return w;
};

describe("besteWahl()", () => {
  for (const w of WELTEN.filter((x) => x.algo !== null)) {
    it(`${w.titel}: liefert genau den Algorithmus der Welt (${w.algo})`, () => {
      expect(besteWahl(w, ergebnisseVon(w))?.algo).toBe(w.algo);
    });
  }

  it("Eigene Welt: keine beste Wahl", () => {
    const w = welt("eigene");
    expect(besteWahl(w, ergebnisseVon(w))).toBeNull();
  });

  it("Flussmoor: Dijkstra gewinnt nach Rechenschritten; der Satz nennt, dass A* weniger Felder besucht, aber h berechnet", () => {
    const w = welt("flussmoor");
    const E = ergebnisseVon(w);
    const wahl = besteWahl(w, E);
    expect(wahl?.kriterium).toMatch(/günstigster Weg .*, dann wenigste Rechenschritte/);
    expect(E.dijkstra.schritte.length).toBeLessThan(E.astar.schritte.length);
    expect(wahl?.satz).toMatch(
      /A\* besucht zwar nur \d+ statt \d+ Felder, braucht dafür aber [\d.]+ Rechenschritte, weil es für jedes eingefügte Feld die Schätzung h\(v\) berechnet/,
    );
  });

  for (const w of WELTEN.filter((x) => x.algo !== null)) {
    it(`${w.titel}: Beste Wahl, ★ und Fazit widersprechen sich nicht`, () => {
      const E = ergebnisseVon(w);
      const wahl = besteWahl(w, E);
      if (!wahl) throw new Error("keine beste Wahl");
      const zeilen = tabellenZeilen(w, E, amEnde(E)).split("<tr>");
      const zeile = zeilen.find((z) => z.includes(`</span>${ALGO_INFO[wahl.algo].name}</th>`)) ?? "";
      // Spalten: besucht, Rechenschritte, Weglänge, Ausdauer. Die beste Wahl hat ★ in der Spalte ihres Kriteriums.
      const zellen = zeile.split("<td>").slice(1);
      const spalte = wahl.kriterium.includes("Rechenschritte") ? 1 : 0;
      expect(zellen[spalte]).toContain("★");
      const fazit = fazitText(w, E);
      if (wahl.kriterium.includes("Rechenschritte") && !zellen[0].includes("★"))
        expect(fazit).toContain(`Gerechnet hat aber ${ALGO_INFO[wahl.algo].name} am wenigsten`);
    });
  }
});

describe("Ergebnistabelle", () => {
  it("ohne Weg enthält die Tabelle kein ★", () => {
    const E = rechne([[1, Infinity, 1]], { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(tabellenZeilen(welt("eigene"), E, amEnde(E))).not.toContain("★");
  });

  it("Flussmoor: DFS hat einen schlechteren Weg und bekommt keinen ★", () => {
    const w = welt("flussmoor");
    const E = ergebnisseVon(w);
    const zeilen = tabellenZeilen(w, E, amEnde(E)).split("<tr>");
    const dfs = zeilen.find((z) => z.includes("DFS"));
    expect(dfs).toBeDefined();
    expect(dfs).not.toContain("★");
  });

  it("vor dem Ende gibt es keinen ★", () => {
    const w = welt("handelsstrasse");
    const E = ergebnisseVon(w);
    const stand = { ...amEnde(E), k: 1 };
    expect(tabellenZeilen(w, E, stand)).not.toContain("★");
  });
});

describe("Fazit", () => {
  it("nennt ein Verfahren ohne optimalen Weg nie als das, das am wenigsten gesucht hat", () => {
    for (const w of WELTEN) {
      const E = ergebnisseVon(w);
      const text = fazitText(w, E);
      const m = /Am wenigsten gesucht (?:hat|haben) ([^.]+)\./.exec(text);
      if (!m) continue;
      // Optimal: Ruinenhof nach Feldzahl, sonst nach Ausdauer.
      const mass = w.id === "ruinenhof" ? "felder" : "kosten";
      const bester = Math.min(...ALGOS.map((a) => E[a][mass]));
      const genannt = m[1].split(" und ");
      for (const a of ALGOS) if (genannt.includes(ALGO_INFO[a].name)) expect(E[a][mass], `${w.id}: ${text}`).toBe(bester);
    }
  });

  it("Flussmoor: DFS sucht wenig, zahlt aber mehr, und das Fazit sagt das", () => {
    const w = welt("flussmoor");
    expect(fazitText(w, ergebnisseVon(w))).toMatch(/DFS hat zwar nur \d+ Felder angesehen, zahlt aber \d+ statt \d+ Ausdauer\./);
  });
});
