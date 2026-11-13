// Entscheidungsbaum „Welches Verfahren?“ (FA-32): Fragen nach Voraussetzungen und Garantien, keine Zählunterschiede.
// Reine Daten, damit Seitenleiste und Test denselben Baum lesen.
import type { Algo } from "../types";

export type Antwort = "ja" | "nein";

export interface Blatt {
  readonly algo: Algo;
  /** Kurze Begründung am Blatt, z. B. „irgendein Weg, ohne Garantie“; leer, wenn die Frage schon alles sagt. */
  readonly text: string;
}

export interface Frage {
  readonly frage: string;
  /** Zweige in der Reihenfolge, in der sie gezeigt werden. */
  readonly zweige: readonly { readonly antwort: Antwort; readonly ziel: Knoten }[];
}

export type Knoten = Frage | Blatt;

export const istBlatt = (k: Knoten): k is Blatt => "algo" in k;

export const BAUM: Frage = {
  frage: "Brauchst du den günstigsten Weg?",
  zweige: [
    { antwort: "nein", ziel: { algo: "dfs", text: "irgendein Weg, ohne Garantie" } },
    {
      antwort: "ja",
      ziel: {
        frage: "Kosten alle Schritte gleich viel?",
        zweige: [
          { antwort: "ja", ziel: { algo: "bfs", text: "" } },
          {
            antwort: "nein",
            ziel: {
              frage: "Gibt es eine gute Schätzung zum Ziel?",
              zweige: [
                { antwort: "ja", ziel: { algo: "astar", text: "" } },
                { antwort: "nein", ziel: { algo: "dijkstra", text: "" } },
              ],
            },
          },
        ],
      },
    },
  ],
};

/** Antworten vom Anfang des Baums bis zum Blatt des Verfahrens, z. B. A*: ja, nein, ja. */
export function entscheidungsPfad(algo: Algo, k: Knoten = BAUM): Antwort[] | null {
  if (istBlatt(k)) return k.algo === algo ? [] : null;
  for (const z of k.zweige) {
    const rest = entscheidungsPfad(algo, z.ziel);
    if (rest) return [z.antwort, ...rest];
  }
  return null;
}
