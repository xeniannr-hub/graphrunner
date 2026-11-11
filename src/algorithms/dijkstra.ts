// Dijkstra: Bestensuche ohne Schätzung (h = 0).
import type { Grid, Pos } from "../types";
import { bestensuche } from "./bestensuche";
import type { SuchLauf } from "./ergebnis";

export function dijkstra(grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  return bestensuche(() => 0, grid, start, ziel);
}
