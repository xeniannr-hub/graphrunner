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
  info: ["info", "types"],
  render: ["render", "algorithms", "replay", "world", "types", "info"],
};

/**
 * Alle relativen Importpfade eines Quelltextes: `import … from "…"`, `export … from "…"`,
 * Side-Effect-Imports `import "…"` und dynamische Imports `import("…")`, mit ' oder ".
 */
function importPfade(text: string): string[] {
  const muster = [
    /\b(?:import|export)\b[^;'"]*?\bfrom\s*["'](\.[^"']+)["']/g,
    /\bimport\s*["'](\.[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  ];
  return muster.flatMap((m) => [...text.matchAll(m)].map((x) => x[1]));
}

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
        for (const pfad of importPfade(QUELLEN[datei])) {
          const ziel = aufloesen(datei, pfad);
          expect(
            erlaubt.some((e) => ziel === e || ziel.startsWith(`${e}/`)),
            `${datei} importiert ${ziel}`,
          ).toBe(true);
        }
      }
    });
  }

  it("erkennt alle Importformen, auch Side-Effect- und dynamische Imports", () => {
    const text = [
      'import { a } from "../x";',
      "import type { B } from '../y';",
      'export { c } from "./z";',
      'import "../stil.css";',
      'const m = await import("../dyn");',
      'import {\n  d,\n  e,\n} from "../mehrzeilig";',
      'import { f } from "vitest";',
    ].join("\n");
    expect(importPfade(text).sort()).toEqual(["../dyn", "../mehrzeilig", "../stil.css", "../x", "../y", "./z"]);
  });

  it("types.ts importiert nichts", () => {
    expect(QUELLEN["./types.ts"]).not.toMatch(/^\s*import\b|\bimport\s*\(/m);
  });

  it("algorithms/ benutzt weder document noch window", () => {
    for (const [datei, text] of Object.entries(QUELLEN)) {
      if (datei.startsWith("./algorithms/")) expect(text, datei).not.toMatch(/\b(document|window)\./);
    }
  });
});
