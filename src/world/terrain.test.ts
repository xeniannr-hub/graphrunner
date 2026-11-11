import { describe, expect, it } from "vitest";
import { BREITE, HOEHE, TERRAIN, leseKarte, zuGrid } from "./terrain";

describe("Gelände", () => {
  it("genau die sieben Geländearten mit den Kosten aus Abschnitt 5", () => {
    expect(TERRAIN.map((t) => [t.key, t.kosten])).toEqual([
      ["weg", 1],
      ["bruecke", 1],
      ["gras", 2],
      ["wald", 4],
      ["sumpf", 7],
      ["wasser", Infinity],
      ["fels", Infinity],
    ]);
  });

  it("liest alle Kartenzeichen", () => {
    const zeilen = Array.from({ length: HOEHE }, () => ".".repeat(BREITE));
    zeilen[0] = "=#.T%~^" + ".".repeat(BREITE - 7);
    const grid = zuGrid(leseKarte(zeilen));
    expect(grid[0].slice(0, 7)).toEqual([1, 1, 2, 4, 7, Infinity, Infinity]);
  });

  it("wirft RangeError bei falscher Größe oder unbekanntem Zeichen", () => {
    expect(() => leseKarte(["...."])).toThrow(RangeError);
    const zeilen = Array.from({ length: HOEHE }, () => ".".repeat(BREITE));
    zeilen[3] = "L" + ".".repeat(BREITE - 1);
    expect(() => leseKarte(zeilen)).toThrow("Unbekanntes Zeichen");
  });
});
