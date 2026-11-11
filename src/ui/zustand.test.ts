import { describe, expect, it } from "vitest";
import { WELTEN } from "../world/worlds";
import { Z, baue, ladeWelt, leereKarte } from "./zustand";

describe("Karte leeren", () => {
  it("macht in der Eigenen Welt alle Felder zu Wiese; Start und Ziel bleiben", () => {
    ladeWelt(WELTEN.findIndex((w) => w.algo === null));
    Z.werkzeug = "fels";
    baue({ x: 10, y: 10 });
    Z.werkzeug = "sumpf";
    baue({ x: 11, y: 10 });
    const start = Z.start;
    const ziel = Z.ziel;
    expect(Z.karte[10][10]).toBe("fels");

    leereKarte();
    expect(Z.karte.flat().every((k) => k === "gras")).toBe(true);
    expect(Z.start).toEqual(start);
    expect(Z.ziel).toEqual(ziel);
  });

  it("ändert eine vorgegebene Welt nicht", () => {
    ladeWelt(0);
    const vorher = Z.karte.map((zeile) => zeile.join(""));
    leereKarte();
    expect(Z.karte.map((zeile) => zeile.join(""))).toEqual(vorher);
  });
});
