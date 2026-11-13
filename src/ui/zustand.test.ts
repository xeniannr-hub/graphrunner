import { describe, expect, it } from "vitest";
import { WELTEN } from "../world/worlds";
import { ALGOS } from "../algorithms";
import { Z, baue, geheVergleich, ladeWelt, leereKarte } from "./zustand";

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

describe("Regler beim Bauen in der Eigenen Welt", () => {
  const eigene = WELTEN.findIndex((w) => w.algo === null);

  it("starten bei 0 und bleiben bei 0, wenn man nur baut", () => {
    ladeWelt(eigene);
    expect(Z.k).toBe(0);
    expect(Z.einzel.bfs.position).toBe(0);
    Z.werkzeug = "wald";
    baue({ x: 10, y: 5 });
    baue({ x: 11, y: 5 });
    expect(Z.k).toBe(0);
    for (const a of ALGOS) expect(Z.einzel[a].position).toBe(0);
  });

  it("behalten die selbst gesetzte Position, wenn man ein weiteres Feld setzt", () => {
    ladeWelt(eigene);
    geheVergleich(20);
    Z.einzel.dijkstra.gehe(100);
    Z.werkzeug = "sumpf";
    baue({ x: 12, y: 12 });
    expect(Z.k).toBe(20);
    expect(Z.einzel.dijkstra.position).toBe(100);
    // Auch „Karte leeren“ setzt nichts zurück.
    leereKarte();
    expect(Z.k).toBe(20);
    expect(Z.einzel.dijkstra.position).toBe(100);
  });

  it("stehen am Ende, wenn der neue Lauf kürzer ist als die gesetzte Position", () => {
    ladeWelt(eigene);
    const bfs = () => Z.einzel.bfs;
    bfs().gehe(bfs().laenge);
    const lang = bfs().position;
    // Ziel direkt neben den Start: BFS findet es nach wenigen Zeilen, der neue Lauf ist viel kürzer.
    Z.werkzeug = "ziel";
    baue({ x: Z.start.x + 1, y: Z.start.y });
    expect(bfs().laenge).toBeLessThan(lang);
    expect(bfs().position).toBe(bfs().laenge);
  });

  it("eine neue Welt laden setzt beide Regler auf 0", () => {
    ladeWelt(eigene);
    geheVergleich(15);
    Z.einzel.bfs.gehe(50);
    ladeWelt(0);
    expect(Z.k).toBe(0);
    for (const a of ALGOS) expect(Z.einzel[a].position).toBe(0);
  });
});
