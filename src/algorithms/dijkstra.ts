// Dijkstra: Bestensuche ohne Schätzung (h = 0, nichts zu berechnen).
import type { Grid, Pos } from "../types";
import { bestensuche } from "./bestensuche";
import type { SuchLauf } from "./ergebnis";

export function dijkstra(grid: Grid, start: Pos, ziel: Pos): SuchLauf {
  return bestensuche(null, grid, start, ziel);
}
