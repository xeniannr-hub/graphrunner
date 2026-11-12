// Öffentliche Schnittstelle der Algorithmen.
import type { Algo, Grid, Pos, SearchResult } from "../types";
import { astar } from "./astar";
import { bfs } from "./bfs";
import { dfs } from "./dfs";
import { dijkstra } from "./dijkstra";
import { aufzeichnen, type SuchLauf } from "./ergebnis";

export const ALGOS: readonly Algo[] = ["bfs", "dfs", "dijkstra", "astar"];

/** Generatoren: liefern Step für Step. */
export const SCHRITTE: Readonly<Record<Algo, (grid: Grid, start: Pos, ziel: Pos) => SuchLauf>> = {
  bfs,
  dfs,
  dijkstra,
  astar,
};

/** Vollständige Aufzeichnung eines Laufs. */
export const SUCHE: Readonly<Record<Algo, (grid: Grid, start: Pos, ziel: Pos) => SearchResult>> = {
  bfs: (g, s, z) => aufzeichnen("bfs", bfs(g, s, z)),
  dfs: (g, s, z) => aufzeichnen("dfs", dfs(g, s, z)),
  dijkstra: (g, s, z) => aufzeichnen("dijkstra", dijkstra(g, s, z)),
  astar: (g, s, z) => aufzeichnen("astar", astar(g, s, z)),
};

export { PSEUDOCODE } from "./pseudocode";
export { billigstesFeld, nachbarn, schaetzung } from "./raster";
