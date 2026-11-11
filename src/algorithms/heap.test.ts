import { describe, expect, it } from "vitest";
import { Heap } from "./heap";

describe("Heap", () => {
  it("entnimmt nach Priorität, bei Gleichstand den älteren Eintrag", () => {
    const h = new Heap<string>();
    h.einfuegen("a", 2);
    h.einfuegen("b", 1);
    h.einfuegen("c", 1);
    h.einfuegen("d", 2);
    h.einfuegen("e", 0);
    const reihenfolge: string[] = [];
    for (let x = h.entnehmen(); x; x = h.entnehmen()) reihenfolge.push(x.wert);
    // Priorität 0: e. Priorität 1: b vor c (b älter). Priorität 2: a vor d (a älter).
    expect(reihenfolge).toEqual(["e", "b", "c", "a", "d"]); // TODO: von Hand nachrechnen
  });

  it("ist leer nach dem letzten Entnehmen", () => {
    const h = new Heap<number>();
    h.einfuegen(1, 1);
    h.entnehmen();
    expect(h.groesse).toBe(0);
    expect(h.entnehmen()).toBeUndefined();
  });
});
