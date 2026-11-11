// QA-08: Importregeln aus CLAUDE.md, Abschnitt 4. Algorithmen kennen weder DOM noch Oberfläche.
import { describe, expect, it } from "vitest";

// Quelltexte aller Module (ohne Tests), Schlüssel z. B. "./algorithms/bfs.ts".
const QUELLEN = Object.fromEntries(
  Object.entries(import.meta.glob<string>(["./**/*.ts", "!./**/*.test.ts"], { query: "?raw", import: "default", eager: true })),
);

const ERLAUBT: Record<string, readonly string[]> = {
  algorithms: ["algorithms", "types"],
  replay: ["replay", "algorithms", "types"],
  world: ["world", "types"],
  render: ["render", "algorithms", "replay", "world", "types", "ui/erklaerung"],
};

/** Löst einen relativen Import zu einem Modulnamen relativ zu src auf, z. B. "types" oder "ui/erklaerung". */
function aufloesen(datei: string, pfad: string): string {
  const teile = datei.replace(/^\.\//, "").split("/").slice(0, -1);
  for (const t of pfad.split("/")) {
    if (t === "..") teile.pop();
    else if (t !== ".") teile.push(t);
  }
  return teile.join("/");
}

describe("QA-08: Importregeln", () => {
  for (const [modul, erlaubt] of Object.entries(ERLAUBT)) {
    it(`${modul}/ importiert nur ${erlaubt.join(", ")}`, () => {
      const dateien = Object.keys(QUELLEN).filter((d) => d.startsWith(`./${modul}/`));
      expect(dateien.length).toBeGreaterThan(0);
      for (const datei of dateien) {
        for (const m of QUELLEN[datei].matchAll(/from\s+"(\.[^"]+)"/g)) {
          const ziel = aufloesen(datei, m[1]);
          expect(
            erlaubt.some((e) => ziel === e || ziel.startsWith(`${e}/`)),
            `${datei} importiert ${ziel}`,
          ).toBe(true);
        }
      }
    });
  }

  it("types.ts importiert nichts", () => {
    expect(QUELLEN["./types.ts"]).not.toMatch(/^import /m);
  });

  it("algorithms/ benutzt weder document noch window", () => {
    for (const [datei, text] of Object.entries(QUELLEN)) {
      if (datei.startsWith("./algorithms/")) expect(text, datei).not.toMatch(/\b(document|window)\./);
    }
  });
});
