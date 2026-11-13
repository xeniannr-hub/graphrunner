// FA-32: Der Entscheidungsbaum führt zu jedem Verfahren genau einmal, auf dem verlangten Pfad.
import { describe, expect, it } from "vitest";
import { ALGOS } from "../algorithms";
import { BAUM, entscheidungsPfad, istBlatt, type Knoten } from "./entscheidung";

function blaetter(k: Knoten): string[] {
  return istBlatt(k) ? [k.algo] : k.zweige.flatMap((z) => blaetter(z.ziel));
}

describe("Entscheidungsbaum", () => {
  it("jedes Verfahren ist genau ein Blatt", () => {
    expect(blaetter(BAUM).sort()).toEqual([...ALGOS].sort());
  });

  it("Pfade wie vorgegeben", () => {
    expect(entscheidungsPfad("dfs")).toEqual(["nein"]);
    expect(entscheidungsPfad("bfs")).toEqual(["ja", "ja"]);
    expect(entscheidungsPfad("astar")).toEqual(["ja", "nein", "ja"]);
    expect(entscheidungsPfad("dijkstra")).toEqual(["ja", "nein", "nein"]);
  });

  it("jede Frage hat genau einen Ja- und einen Nein-Zweig", () => {
    const pruefe = (k: Knoten): void => {
      if (istBlatt(k)) return;
      expect(k.zweige.map((z) => z.antwort).sort()).toEqual(["ja", "nein"]);
      k.zweige.forEach((z) => pruefe(z.ziel));
    };
    pruefe(BAUM);
  });
});
